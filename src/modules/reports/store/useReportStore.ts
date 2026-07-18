import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import dayjs from 'dayjs';

export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface POSOrder {
  id: string;
  created_at: string;
  customer_name: string | null;
  table_number?: string | null;
  order_source?: string | null;
  total_amount: number;
  payment_method: string;
  kitchen_status: string;
  status?: string;
  outlet_id: string | null;
  outlets?: { name: string } | null;
  items: OrderItem[];
}

export interface Outlet {
  id: string;
  name: string;
}

interface ReportState {
  orders: POSOrder[];
  outlets: Outlet[];
  isLoading: boolean;
  error: string | null;
  
  // Filters
  selectedOutletId: string | 'ALL';
  dateRange: 'today' | '7days' | '30days' | 'all';
  
  // Actions
  setOutletFilter: (id: string | 'ALL') => void;
  setDateRange: (range: 'today' | '7days' | '30days' | 'all') => void;
  fetchData: () => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  orders: [],
  outlets: [],
  isLoading: false,
  error: null,
  
  selectedOutletId: 'ALL',
  dateRange: 'today',
  
  setOutletFilter: (id) => set({ selectedOutletId: id }),
  setDateRange: (range) => set({ dateRange: range }),
  
  fetchData: async () => {
    const { user } = useAuthStore.getState();
    const { selectedOutletId, dateRange } = get();
    
    set({ isLoading: true, error: null });
    try {
      // 1. Fetch Outlets for Super Admins
      if (user?.role === 'Super Admin' || user?.role === 'Admin') {
        const { data: outletsData } = await supabase.from('outlets').select('id, name').order('name');
        if (outletsData) {
          set({ outlets: outletsData });
        }
      }

      // 2. Build Orders Query
      let query = supabase
        .from('pos_orders')
        .select(`
          id,
          created_at,
          customer_name,
          table_number,
          order_source,
          status,
          total_amount,
          payment_method,
          kitchen_status,
          outlet_id,
          outlets (name),
          items:pos_order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      // Apply Outlet Filter
      if (user?.outletId) {
        // Enforce user's assigned outlet
        query = query.eq('outlet_id', user.outletId);
      } else if (selectedOutletId !== 'ALL') {
        // Super admin filter
        query = query.eq('outlet_id', selectedOutletId);
      }
      
      // Apply Date Filter
      const today = dayjs().startOf('day').toISOString();
      if (dateRange === 'today') {
        query = query.gte('created_at', today);
      } else if (dateRange === '7days') {
        query = query.gte('created_at', dayjs().subtract(7, 'day').startOf('day').toISOString());
      } else if (dateRange === '30days') {
        query = query.gte('created_at', dayjs().subtract(30, 'day').startOf('day').toISOString());
      }

      const { data, error } = await query;
      if (error) {
        // Fallback without new columns
        let fallback = supabase
          .from('pos_orders')
          .select(`
            id, created_at, customer_name, total_amount, payment_method, kitchen_status, outlet_id,
            outlets (name),
            items:pos_order_items ( id, product_name, quantity, unit_price, total_price )
          `)
          .order('created_at', { ascending: false });
        if (user?.outletId) fallback = fallback.eq('outlet_id', user.outletId);
        else if (selectedOutletId !== 'ALL') fallback = fallback.eq('outlet_id', selectedOutletId);
        if (dateRange === 'today') fallback = fallback.gte('created_at', today);
        else if (dateRange === '7days') fallback = fallback.gte('created_at', dayjs().subtract(7, 'day').startOf('day').toISOString());
        else if (dateRange === '30days') fallback = fallback.gte('created_at', dayjs().subtract(30, 'day').startOf('day').toISOString());
        const fb = await fallback;
        if (fb.error) throw fb.error;
        set({
          orders: (fb.data || []).filter((o: any) => o.status !== 'open' && o.status !== 'held' && o.status !== 'sent') as any,
          isLoading: false,
        });
        return;
      }
      
      set({ orders: data as unknown as POSOrder[], isLoading: false });
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      set({ error: err.message, isLoading: false });
    }
  }
}));
