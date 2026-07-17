import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Outlet {
  id: string;
  code: string;
  name: string;
  location: string;
  is_active: boolean;
  created_at: string;
}

interface FranchiseState {
  outlets: Outlet[];
  isLoading: boolean;
  error: string | null;

  fetchOutlets: () => Promise<void>;
  addOutlet: (outlet: { name: string; location: string }) => Promise<void>;
  toggleOutletStatus: (id: string, currentStatus: boolean) => Promise<void>;
}

export const useFranchiseStore = create<FranchiseState>((set, get) => ({
  outlets: [],
  isLoading: false,
  error: null,

  fetchOutlets: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .order('name');
      
      if (error) throw error;
      set({ outlets: data as Outlet[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addOutlet: async (outlet) => {
    try {
      // Generate a simple unique branch code (e.g., first 3 letters of name + random numbers)
      const prefix = outlet.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'BR');
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const code = `${prefix}${randomNum}`;

      const { data, error } = await supabase
        .from('outlets')
        .insert([{
          name: outlet.name,
          location: outlet.location,
          code: code,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({ outlets: [...state.outlets, data as Outlet] }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  toggleOutletStatus: async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('outlets')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      // Optimistic update
      set((state) => ({
        outlets: state.outlets.map(o => o.id === id ? { ...o, is_active: !currentStatus } : o)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  }
}));
