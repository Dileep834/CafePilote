import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { OUTLET_SCOPED_ROLES, Role, type RoleType } from '@/constants';
import type { Outlet } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { isSuperAdmin } from '@/lib/access';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  outlet_id?: string;
  password?: string;
  is_active: boolean;
  created_at?: string;

  // Joined relation
  outlet?: { name: string };
}

interface UserState {
  users: UserProfile[];
  outlets: Outlet[];
  isLoading: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  fetchOutlets: () => Promise<void>;
  addUser: (user: Partial<UserProfile>, password?: string) => Promise<void>;
  updateUser: (id: string, user: Partial<UserProfile>) => Promise<void>;
  toggleUserStatus: (id: string, currentStatus: boolean) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const USER_SELECT_WITH_OUTLET = `
  id, name, email, role, outlet_id, is_active, created_at,
  outlet:outlets(name)
`;

const USER_SELECT = 'id, name, email, role, outlet_id, is_active, created_at';

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || '';
}

function errorMessage(error: unknown) {
  return String((error as { message?: string })?.message || error || 'Something went wrong.');
}

function isRelationSelectError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes('relationship') ||
    message.includes('foreign key') ||
    message.includes('schema cache') ||
    message.includes('outlet')
  );
}

function isAuthUserIdError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  return (
    (message.includes('foreign key') && message.includes('auth')) ||
    message.includes('violates foreign key constraint') ||
    message.includes('not-null constraint')
  );
}

async function readUsers(companyId: string, superAdmin: boolean, includeOutlet: boolean) {
  let query = supabase
    .from('users')
    .select(includeOutlet ? USER_SELECT_WITH_OUTLET : USER_SELECT)
    .order('created_at', { ascending: false });

  if (companyId) {
    query = query.eq('company_id', companyId);
    if (!superAdmin) query = query.neq('role', Role.SUPER_ADMIN);
  }

  return query;
}

async function readCreatedUser(insertedId: string | null, email: string, companyId: string) {
  let query = supabase.from('users').select(USER_SELECT_WITH_OUTLET);
  if (insertedId) {
    query = query.eq('id', insertedId);
  } else {
    query = query.eq('email', email);
    if (companyId) query = query.eq('company_id', companyId);
  }

  let { data, error } = await query.single();
  if (error && isRelationSelectError(error)) {
    let fallback = supabase.from('users').select(USER_SELECT);
    if (insertedId) {
      fallback = fallback.eq('id', insertedId);
    } else {
      fallback = fallback.eq('email', email);
      if (companyId) fallback = fallback.eq('company_id', companyId);
    }
    ({ data, error } = await fallback.single());
  }

  if (error) throw error;
  return data as UserProfile;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  outlets: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);
      const superAdmin = isSuperAdmin(user);
      let { data, error } = await readUsers(companyId, superAdmin, true);
      if (error && isRelationSelectError(error)) {
        ({ data, error } = await readUsers(companyId, superAdmin, false));
      }

      if (error) throw error;
      set({ users: data as any[], isLoading: false });
    } catch (err: any) {
      set({ error: errorMessage(err), isLoading: false });
    }
  },

  fetchOutlets: async () => {
    try {
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);
      let query = supabase.from('outlets').select('*').eq('is_active', true).order('name');
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;

      if (error) throw error;
      set({ outlets: data as Outlet[] });
    } catch (err: any) {
      console.error('Failed to fetch outlets:', err.message);
    }
  },

  addUser: async (userData, password) => {
    try {
      const cleanedPassword = password?.trim();
      if (!cleanedPassword || cleanedPassword.length < 6) {
        throw new Error('Temporary password must be at least 6 characters.');
      }
      const email = normalizeEmail(userData.email);
      const name = userData.name?.trim() || '';
      if (!name || !email || !userData.role) {
        throw new Error('Name, email, and role are required.');
      }
      if (OUTLET_SCOPED_ROLES.includes(userData.role) && !userData.outlet_id) {
        throw new Error('Please assign this staff member to a branch.');
      }

      const authUser = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(authUser);
      const payload = {
        id: uuidv4(),
        name,
        email,
        role: userData.role,
        outlet_id: userData.outlet_id || null,
        password: cleanedPassword,
        is_active: true,
        company_id: companyId,
      };

      let insertedId: string | null = payload.id;
      let { error } = await supabase.from('users').insert([payload]);

      if (error && isAuthUserIdError(error)) {
        insertedId = null;
        const payloadWithoutId: Omit<typeof payload, 'id'> = {
          name: payload.name,
          email: payload.email,
          role: payload.role,
          outlet_id: payload.outlet_id,
          password: payload.password,
          is_active: payload.is_active,
          company_id: payload.company_id,
        };
        ({ error } = await supabase.from('users').insert([payloadWithoutId]));
      }

      if (error) {
        if (isAuthUserIdError(error)) {
          throw new Error(
            'Staff profile could not be created because the database still requires a matching Supabase Auth user. Run the staff-user schema migration or create the Auth user first.'
          );
        }
        throw error;
      }

      const data = await readCreatedUser(insertedId, email, companyId);
      set((state) => ({ users: [data as any, ...state.users] }));
    } catch (err: any) {
      set({ error: errorMessage(err) });
      throw err;
    }
  },

  updateUser: async (id, userData) => {
    try {
      const email = normalizeEmail(userData.email);
      const name = userData.name?.trim() || '';
      if (!name || !email || !userData.role) {
        throw new Error('Name, email, and role are required.');
      }
      if (OUTLET_SCOPED_ROLES.includes(userData.role) && !userData.outlet_id) {
        throw new Error('Please assign this staff member to a branch.');
      }

      const payload = {
        name,
        email,
        role: userData.role,
        outlet_id: OUTLET_SCOPED_ROLES.includes(userData.role) ? userData.outlet_id || null : null,
        is_active: userData.is_active ?? true,
      };

      const { error } = await supabase.from('users').update(payload).eq('id', id);
      if (error) throw error;

      const authUser = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(authUser);
      const data = await readCreatedUser(id, email, companyId);
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? (data as any) : u)),
      }));
    } catch (err: any) {
      set({ error: errorMessage(err) });
      throw err;
    }
  },

  toggleUserStatus: async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        users: state.users.map((u) =>
          u.id === id ? { ...u, is_active: !currentStatus } : u
        ),
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteUser: async (id) => {
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },
}));
