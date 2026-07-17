import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyalty_points: number;
  total_spend: number;
  is_active: boolean;
  created_at: string;
}

interface CrmState {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;

  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: { name: string; phone: string; email: string }) => Promise<void>;
  toggleCustomerStatus: (id: string, currentStatus: boolean) => Promise<void>;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  customers: [],
  isLoading: false,
  error: null,

  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('total_spend', { ascending: false }); // Sort by best customers
      
      if (error) throw error;
      set({ customers: data as Customer[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addCustomer: async (customer) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          loyalty_points: 0,
          total_spend: 0,
          is_active: true
        }])
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
      const { error } = await supabase
        .from('customers')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        customers: state.customers.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  }
}));
