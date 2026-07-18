import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { getScopedCompanyId } from '@/lib/tenantScope';

export interface Voucher {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount_amount: number | null;
  start_date: string;
  end_date: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  company_id?: string | null;
  created_at?: string;
}

interface VoucherState {
  vouchers: Voucher[];
  isLoading: boolean;
  error: string | null;

  fetchVouchers: () => Promise<void>;
  createVoucher: (voucher: Omit<Voucher, 'id' | 'used_count' | 'created_at'>) => Promise<boolean>;
  updateVoucher: (id: string, updates: Partial<Voucher>) => Promise<boolean>;
  deleteVoucher: (id: string) => Promise<boolean>;
  validateVoucher: (
    code: string,
    orderTotal: number
  ) => Promise<{ valid: boolean; voucher?: Voucher; error?: string }>;
}

export const useVoucherStore = create<VoucherState>((set) => ({
  vouchers: [],
  isLoading: false,
  error: null,

  fetchVouchers: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);
      let query = supabase.from('vouchers').select('*').order('created_at', { ascending: false });
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;

      if (error) {
        if (String(error.message).includes('company_id')) {
          const { data: fallback, error: fe } = await supabase
            .from('vouchers')
            .select('*')
            .order('created_at', { ascending: false });
          if (fe) throw fe;
          set({
            vouchers: fallback || [],
            error: 'Run scripts/vouchers_company_scope.sql to isolate vouchers by company',
          });
          return;
        }
        throw error;
      }
      set({ vouchers: data || [] });
    } catch (error: any) {
      console.error('Error fetching vouchers:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  createVoucher: async (voucher) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);
      const { data, error } = await supabase
        .from('vouchers')
        .insert([{ ...voucher, code: voucher.code.toUpperCase(), company_id: companyId }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ vouchers: [data, ...state.vouchers] }));
      return true;
    } catch (error: any) {
      console.error('Error creating voucher:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateVoucher: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      if (updates.code) updates.code = updates.code.toUpperCase();
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);

      let q = supabase.from('vouchers').update(updates).eq('id', id);
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q.select().single();

      if (error) throw error;
      set((state) => ({
        vouchers: state.vouchers.map((v) => (v.id === id ? data : v)),
      }));
      return true;
    } catch (error: any) {
      console.error('Error updating voucher:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteVoucher: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);
      let q = supabase.from('vouchers').delete().eq('id', id);
      if (companyId) q = q.eq('company_id', companyId);
      const { error } = await q;
      if (error) throw error;
      set((state) => ({
        vouchers: state.vouchers.filter((v) => v.id !== id),
      }));
      return true;
    } catch (error: any) {
      console.error('Error deleting voucher:', error);
      set({ error: error.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  validateVoucher: async (code, orderTotal) => {
    try {
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);
      let q = supabase
        .from('vouchers')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .limit(1);
      if (companyId) q = q.eq('company_id', companyId);

      const { data: vouchers, error } = await q;

      if (error) throw error;
      if (!vouchers || vouchers.length === 0) {
        return { valid: false, error: 'Invalid or inactive promo code.' };
      }

      const voucher = vouchers[0];

      if (voucher.min_order_value && orderTotal < voucher.min_order_value) {
        return {
          valid: false,
          error: `Minimum order value of $${voucher.min_order_value} required.`,
        };
      }

      if (voucher.usage_limit != null && voucher.used_count >= voucher.usage_limit) {
        return { valid: false, error: 'This promo code has reached its usage limit.' };
      }

      const now = new Date();
      if (voucher.start_date && new Date(voucher.start_date) > now) {
        return { valid: false, error: 'This promo code is not yet active.' };
      }
      if (voucher.end_date && new Date(voucher.end_date) < now) {
        return { valid: false, error: 'This promo code has expired.' };
      }

      return { valid: true, voucher };
    } catch (error: any) {
      console.error('Error validating voucher:', error);
      return { valid: false, error: 'Failed to validate voucher.' };
    }
  },
}));
