import { supabase } from '@/lib/supabase';
import type { GuestUser } from '../store/useGuestAuthStore';

export type GuestSessionRow = {
  id: string;
  outlet_id: string | null;
  table_id: string | null;
  table_number: string | null;
  guest_email: string;
  guest_name: string | null;
  guest_id: string | null;
  provider: string | null;
  company_id: string | null;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
};

export type GuestSessionContext = {
  outletId?: string | null;
  tableId?: string | null;
  tableNumber?: string | null;
  companyId?: string | null;
};

function isUuid(value?: string | null) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || ''
  );
}

/** Upsert CRM customer row so guest appears in Customer Directory */
export async function upsertCustomerFromGuest(
  guest: GuestUser,
  companyId?: string | null
): Promise<string | null> {
  try {
    const email = guest.email.trim().toLowerCase();
    let existingQ = supabase.from('customers').select('id, company_id').ilike('email', email);
    if (companyId) existingQ = existingQ.eq('company_id', companyId);
    const { data: existing } = await existingQ.maybeSingle();

    if (existing?.id) {
      await supabase
        .from('customers')
        .update({
          name: guest.name || email,
          is_active: true,
          updated_at: new Date().toISOString(),
          ...(companyId ? { company_id: companyId } : {}),
        })
        .eq('id', existing.id);
      return existing.id as string;
    }

    const { data: created, error } = await supabase
      .from('customers')
      .insert([
        {
          name: guest.name || email,
          email,
          phone: null,
          loyalty_points: 0,
          total_spend: 0,
          is_active: true,
          ...(companyId ? { company_id: companyId } : {}),
        },
      ])
      .select('id')
      .single();

    if (error) throw error;
    return (created?.id as string) || null;
  } catch (e) {
    console.warn('[guest] customer upsert failed', e);
    return null;
  }
}

/** Start or refresh a live dine-in guest session (visible in CRM) */
export async function startGuestSession(
  guest: GuestUser,
  ctx: GuestSessionContext
): Promise<string | null> {
  try {
    await upsertCustomerFromGuest(guest, ctx.companyId);

    const email = guest.email.trim().toLowerCase();
    const now = new Date().toISOString();

    // End other active sessions for this email (one device / table focus)
    await supabase
      .from('guest_sessions')
      .update({ ended_at: now })
      .eq('guest_email', email)
      .is('ended_at', null);

    const { data, error } = await supabase
      .from('guest_sessions')
      .insert([
        {
          outlet_id: ctx.outletId || null,
          table_id: ctx.tableId || null,
          table_number: ctx.tableNumber || null,
          guest_email: email,
          guest_name: guest.name,
          guest_id: guest.id,
          provider: guest.provider,
          company_id: ctx.companyId || null,
          auth_user_id: guest.provider === 'google' && isUuid(guest.id) ? guest.id : null,
          started_at: now,
          last_seen_at: now,
          ended_at: null,
        },
      ])
      .select('id')
      .single();

    if (error) throw error;
    return (data?.id as string) || null;
  } catch (e) {
    console.warn('[guest] session start failed — run scripts/guest_sessions_schema.sql?', e);
    return null;
  }
}

export async function touchGuestSession(sessionId: string): Promise<void> {
  try {
    await supabase
      .from('guest_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', sessionId)
      .is('ended_at', null);
  } catch {
    /* ignore */
  }
}

export async function endGuestSession(opts: {
  sessionId?: string | null;
  email?: string | null;
}): Promise<void> {
  try {
    const now = new Date().toISOString();
    if (opts.sessionId) {
      await supabase.from('guest_sessions').update({ ended_at: now }).eq('id', opts.sessionId);
      return;
    }
    if (opts.email) {
      await supabase
        .from('guest_sessions')
        .update({ ended_at: now })
        .eq('guest_email', opts.email.trim().toLowerCase())
        .is('ended_at', null);
    }
  } catch {
    /* ignore */
  }
}

export async function fetchLiveGuestSessions(outletId?: string | null): Promise<GuestSessionRow[]> {
  let query = supabase
    .from('guest_sessions')
    .select('*')
    .is('ended_at', null)
    .order('last_seen_at', { ascending: false })
    .limit(200);

  if (outletId && outletId !== 'current-outlet' && !outletId.startsWith('local')) {
    query = query.eq('outlet_id', outletId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as GuestSessionRow[];
}
