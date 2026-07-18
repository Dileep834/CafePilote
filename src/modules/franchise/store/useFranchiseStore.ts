import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { checkOutletLimit } from '@/lib/planLimits';
import { useTenantStore } from '@/store/useTenantStore';

export interface OutletRow {
  id: string;
  code: string;
  name: string;
  location: string;
  is_active: boolean;
  created_at: string;
  company_id?: string | null;
}

interface FranchiseState {
  outlets: OutletRow[];
  isLoading: boolean;
  error: string | null;

  fetchOutlets: (companyId?: string | null) => Promise<void>;
  addOutlet: (outlet: {
    name: string;
    location: string;
    companyId?: string;
  }) => Promise<OutletRow | null>;
  toggleOutletStatus: (id: string, currentStatus: boolean) => Promise<void>;
}

export const useFranchiseStore = create<FranchiseState>((set, get) => ({
  outlets: [],
  isLoading: false,
  error: null,

  fetchOutlets: async (companyId) => {
    set({ isLoading: true, error: null });
    const cid = companyId || useTenantStore.getState().companyId;
    try {
      let query = supabase.from('outlets').select('*').order('name');
      const { data, error } = await query;
      if (error) throw error;
      let rows = (data || []) as OutletRow[];
      if (cid) {
        rows = rows.filter((r) => !r.company_id || r.company_id === cid);
      }
      set({ outlets: rows, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addOutlet: async (outlet) => {
    set({ error: null });
    const tenant = useTenantStore.getState();
    const companyId = outlet.companyId || tenant.companyId || undefined;
    const planId = tenant.planId;
    const current = get().outlets.filter((o) => o.is_active).length;
    const gate = checkOutletLimit(planId, current);
    if (!gate.ok) {
      set({ error: gate.message });
      return null;
    }

    try {
      const prefix = outlet.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'BR') || 'BR';
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const code = `${prefix}${randomNum}`;

      const payload: Record<string, unknown> = {
        name: outlet.name,
        location: outlet.location,
        code,
        is_active: true,
      };
      if (companyId) payload.company_id = companyId;

      const { data, error } = await supabase.from('outlets').insert([payload]).select().single();

      if (error) throw error;
      const created = data as OutletRow;
      set((state) => ({ outlets: [...state.outlets, created] }));
      // Refresh header branch list
      await tenant.hydrateFromUser(
        (await import('@/store/useAuthStore')).useAuthStore.getState().user
      );
      return created;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  toggleOutletStatus: async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('outlets')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        outlets: state.outlets.map((o) =>
          o.id === id ? { ...o, is_active: !currentStatus } : o
        ),
      }));
      await useTenantStore.getState().hydrateFromUser(
        (await import('@/store/useAuthStore')).useAuthStore.getState().user
      );
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },
}));
