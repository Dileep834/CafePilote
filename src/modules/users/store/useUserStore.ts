import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RoleType } from '@/constants';
import type { Outlet } from '@/types';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  outlet_id?: string;
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
  toggleUserStatus: (id: string, currentStatus: boolean) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  outlets: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id, name, email, role, outlet_id, is_active, created_at,
          outlet:outlets(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      set({ users: data as any[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchOutlets: async () => {
    try {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      set({ outlets: data as Outlet[] });
    } catch (err: any) {
      console.error('Failed to fetch outlets:', err.message);
    }
  },

  addUser: async (userData, password) => {
    try {
      // In a real app, you would create the Auth user via Supabase Auth Admin API
      // Since this is a client-side demo, we just insert into the 'users' table.
      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: userData.name,
          email: userData.email,
          role: userData.role,
          outlet_id: userData.outlet_id || null,
          is_active: true
        }])
        .select(`
          id, name, email, role, outlet_id, is_active, created_at,
          outlet:outlets(name)
        `)
        .single();

      if (error) throw error;

      set((state) => ({ users: [data as any, ...state.users] }));
    } catch (err: any) {
      set({ error: err.message });
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
        users: state.users.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteUser: async (id) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        users: state.users.filter(u => u.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  }
}));
