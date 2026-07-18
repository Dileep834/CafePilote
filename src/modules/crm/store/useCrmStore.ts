import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  fetchLiveGuestSessions,
  type GuestSessionRow,
} from '@/modules/customer/lib/guestSessionService';
import { getTenantOutletId } from '@/store/useTenantStore';
import { useAuthStore } from '@/store/useAuthStore';
import { isSuperAdmin } from '@/lib/access';
import { getScopedCompanyId } from '@/lib/tenantScope';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyalty_points: number;
  total_spend: number;
  is_active: boolean;
  created_at: string;
  company_id?: string | null;
}

interface CrmState {
  customers: Customer[];
  liveGuests: GuestSessionRow[];
  isLoading: boolean;
  liveLoading: boolean;
  error: string | null;

  fetchCustomers: () => Promise<void>;
  fetchLiveGuests: () => Promise<void>;
  addCustomer: (customer: { name: string; phone: string; email: string }) => Promise<void>;
  toggleCustomerStatus: (id: string, currentStatus: boolean) => Promise<void>;
}

export const useCrmStore = create<CrmState>((set) => ({
  customers: [],
  liveGuests: [],
  isLoading: false,
  liveLoading: false,
  error: null,

  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      // Super Admin: scope to active branch company (not global CRM mix)
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) {
        if (String(error.message).includes('company_id')) {
          set({
            customers: [],
            isLoading: false,
            error: 'Run scripts/customers_company_scope.sql in Supabase to isolate CRM by company',
          });
          return;
        }
        throw error;
      }
      set({ customers: (data || []) as Customer[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchLiveGuests: async () => {
    set({ liveLoading: true });
    try {
      const user = useAuthStore.getState().user;
      // Always branch-scoped (even Super Admin) — use active outlet
      const outletId = getTenantOutletId(user);
      const rows = await fetchLiveGuestSessions(
        outletId && outletId !== 'current-outlet' ? outletId : null
      );
      const cutoff = Date.now() - 30 * 60 * 1000;
      const fresh = rows.filter((r) => new Date(r.last_seen_at).getTime() >= cutoff);
      set({ liveGuests: fresh, liveLoading: false, error: null });
    } catch (err: any) {
      const msg = String(err?.message || '');
      set({
        liveLoading: false,
        liveGuests: [],
        error: msg.includes('guest_sessions') || msg.includes('schema cache')
          ? 'Live guests need scripts/guest_sessions_schema.sql run in Supabase'
          : msg,
      });
    }
  },

  addCustomer: async (customer) => {
    try {
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);
      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            loyalty_points: 0,
            total_spend: 0,
            is_active: true,
            company_id: companyId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({ customers: [data as Customer, ...state.customers] }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  toggleCustomerStatus: async (id, currentStatus) => {
    try {
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);
      let q = supabase
        .from('customers')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (companyId) q = q.eq('company_id', companyId);
      const { error } = await q;

      if (error) throw error;

      set((state) => ({
        customers: state.customers.map((c) =>
          c.id === id ? { ...c, is_active: !currentStatus } : c
        ),
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },
}));
