import { APP_ROLES, HQ_COMPANY_ID, Role, type RoleType } from '@/constants';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

export const STAFF_SESSION_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;
export const STAFF_ACTIVITY_TOUCH_MS = 60 * 1000;

export type StaffLogoutReason = 'manual' | 'expired' | 'replaced' | 'invalid';

type StaffUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  outlet_id?: string | null;
  company_id?: string | null;
  is_active: boolean;
  password?: string | null;
};

function normalizeRole(role: string | null | undefined): RoleType {
  if (role === 'Franchise Owner') return Role.OUTLET_OWNER;
  if (role === 'Franchise Manager') return Role.OUTLET_MANAGER;
  if (APP_ROLES.includes(role as RoleType)) return role as RoleType;
  return Role.STAFF;
}

function createLocalSessionToken(userId: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `staff-${userId}-${random}`;
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = String((error as { message?: string })?.message || error || '');
  return message.toLowerCase().includes(columnName.toLowerCase());
}

export function mapStaffUser(row: StaffUserRow): User {
  const role = normalizeRole(row.role);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role,
    outletId: row.outlet_id || undefined,
    companyId: role === Role.SUPER_ADMIN ? HQ_COMPANY_ID : row.company_id || HQ_COMPANY_ID,
    isActive: row.is_active,
  };
}

async function updateSessionLogout(
  match: { userId?: string; sessionId?: string },
  reason: StaffLogoutReason
): Promise<void> {
  const logoutAt = new Date().toISOString();
  const updateWithReason = async () => {
    let query = supabase
      .from('user_sessions')
      .update({ logout_time: logoutAt, logout_reason: reason });
    if (match.userId) query = query.eq('user_id', match.userId);
    if (match.sessionId) query = query.eq('id', match.sessionId);
    return query.is('logout_time', null);
  };
  const updateTimeOnly = async () => {
    let query = supabase.from('user_sessions').update({ logout_time: logoutAt });
    if (match.userId) query = query.eq('user_id', match.userId);
    if (match.sessionId) query = query.eq('id', match.sessionId);
    return query.is('logout_time', null);
  };

  const { error } = await updateWithReason();
  if (!error) return;
  if (isMissingColumnError(error, 'logout_reason')) {
    const { error: fallbackError } = await updateTimeOnly();
    if (!fallbackError) return;
  }
  throw error;
}

async function closeOpenStaffSessions(userId: string): Promise<void> {
  try {
    await updateSessionLogout({ userId }, 'replaced');
  } catch {
    /* session logs are best-effort */
  }
}

export async function startStaffSession(user: User): Promise<string | null> {
  await closeOpenStaffSessions(user.id);

  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .insert([{ user_id: user.id, company_id: user.companyId }])
      .select('id')
      .single();

    if (error) throw error;
    return (data?.id as string) || null;
  } catch (error) {
    console.warn('[staff] session start failed', error);
    return null;
  }
}

export async function endStaffSession(
  sessionId: string | null | undefined,
  reason: StaffLogoutReason = 'manual'
): Promise<void> {
  if (!sessionId) return;

  try {
    await updateSessionLogout({ sessionId }, reason);
  } catch (error) {
    console.warn('[staff] session end failed', error);
  }
}

export async function signOutStaffAuth(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    /* auth session may not exist for legacy staff login */
  }
}

async function getStaffByEmail(cleanedEmail: string): Promise<StaffUserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', cleanedEmail)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return (data as StaffUserRow | null) || null;
}

async function getStaffByAuthUser(authUserId: string, cleanedEmail: string): Promise<StaffUserRow | null> {
  const { data: byId, error: idError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUserId)
    .eq('is_active', true)
    .maybeSingle();

  if (idError) throw idError;
  if (byId) return byId as StaffUserRow;
  return getStaffByEmail(cleanedEmail);
}

export async function authenticateStaff(
  email: string,
  password: string
): Promise<{ user: User; token: string; sessionId: string | null }> {
  const cleanedEmail = email.trim().toLowerCase();

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanedEmail,
      password,
    });

    if (!authError && authData.user) {
      const staffRow = await getStaffByAuthUser(authData.user.id, cleanedEmail);
      if (!staffRow) {
        await signOutStaffAuth();
        throw new Error('No active staff profile is linked to this login.');
      }

      const user = mapStaffUser(staffRow);
      const sessionId = await startStaffSession(user);
      return {
        user,
        token: authData.session?.access_token || createLocalSessionToken(user.id),
        sessionId,
      };
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('No active staff profile')) {
      throw error;
    }
    /* Fall back to the legacy public.users password flow during migration. */
  }

  const staffRow = await getStaffByEmail(cleanedEmail);
  if (!staffRow) {
    throw new Error('Invalid login. User not found or inactive.');
  }

  const savedPassword = staffRow.password?.trim();
  if (!savedPassword) {
    throw new Error('This staff account does not have a password yet. Ask an admin to set one.');
  }

  if (savedPassword !== password) {
    throw new Error('Invalid email or password. Please try again.');
  }

  const user = mapStaffUser(staffRow);
  await signOutStaffAuth();
  const sessionId = await startStaffSession(user);
  return {
    user,
    token: createLocalSessionToken(user.id),
    sessionId,
  };
}
