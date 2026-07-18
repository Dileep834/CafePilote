import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId } from '@/store/useTenantStore';
import { isSuperAdmin } from '@/lib/access';

export type KitchenStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

export interface KitchenOrderItem {
  id: string;
  product_name: string;
  quantity: number;
}

export interface KitchenOrder {
  id: string;
  customer_name: string | null;
  table_number: string | null;
  order_source: string | null;
  status: string | null;
  kitchen_status: KitchenStatus;
  created_at: string;
  items: KitchenOrderItem[];
}

interface KitchenState {
  orders: KitchenOrder[];
  isLoading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: KitchenStatus) => Promise<void>;
  subscribeToOrders: () => void;
  unsubscribeFromOrders: () => void;
}

let realtimeSubscription: any = null;

function mapRows(data: any[]): KitchenOrder[] {
  return data.map((row) => ({
    id: row.id,
    customer_name: row.customer_name,
    table_number: row.table_number || null,
    order_source: row.order_source || null,
    status: row.status || null,
    kitchen_status: row.kitchen_status,
    created_at: row.created_at,
    items: row.items || [],
  }));
}

export const useKitchenStore = create<KitchenState>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    const { user } = useAuthStore.getState();

    set({ isLoading: true, error: null });
    try {
      // Prefer full select with table fields; fall back if columns missing
      const selectFull = `
          id,
          customer_name,
          table_number,
          order_source,
          status,
          kitchen_status,
          created_at,
          items:pos_order_items (
            id,
            product_name,
            quantity
          )
        `;
      const selectLegacy = `
          id,
          customer_name,
          status,
          kitchen_status,
          created_at,
          items:pos_order_items (
            id,
            product_name,
            quantity
          )
        `;

      let query = supabase
        .from('pos_orders')
        .select(selectFull)
        .neq('kitchen_status', 'delivered')
        .neq('status', 'open')
        .neq('status', 'held')
        .order('created_at', { ascending: true });

      // Scope to active branch — never pull other companies via null outlet_id
      const outletId = getTenantOutletId(user);
      if (outletId && outletId !== 'current-outlet' && !outletId.startsWith('local')) {
        query = query.eq('outlet_id', outletId);
      } else if (user?.outletId) {
        query = query.eq('outlet_id', user.outletId);
      } else if (!isSuperAdmin(user)) {
        // No outlet context → empty kitchen (avoid global leak)
        set({ orders: [], isLoading: false });
        return;
      }

      let { data, error } = await query;

      if (error) {
        let legacy = supabase
          .from('pos_orders')
          .select(selectLegacy)
          .neq('kitchen_status', 'delivered')
          .order('created_at', { ascending: true });
        if (outletId && outletId !== 'current-outlet' && !outletId.startsWith('local')) {
          legacy = legacy.eq('outlet_id', outletId);
        } else if (user?.outletId) {
          legacy = legacy.eq('outlet_id', user.outletId);
        }
        ({ data, error } = await legacy);
        if (error) throw error;
        // Filter open/held client-side
        data = (data || []).filter((r: any) => r.status !== 'open' && r.status !== 'held');
      }

      set({ orders: mapRows(data || []), isLoading: false });
    } catch (err: any) {
      console.error('Error fetching kitchen orders:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  updateOrderStatus: async (orderId: string, status: KitchenStatus) => {
    try {
      set((state) => ({
        orders: state.orders
          .map((order) => (order.id === orderId ? { ...order, kitchen_status: status } : order))
          .filter((order) => status !== 'delivered' || order.id !== orderId),
      }));

      const { error } = await supabase
        .from('pos_orders')
        .update({ kitchen_status: status })
        .eq('id', orderId);

      if (error) {
        get().fetchOrders();
        throw error;
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
    }
  },

  subscribeToOrders: () => {
    const { user } = useAuthStore.getState();
    get().unsubscribeFromOrders();

    const outletId = getTenantOutletId(user);
    const filterStr =
      outletId && outletId !== 'current-outlet' && !outletId.startsWith('local')
        ? `outlet_id=eq.${outletId}`
        : user?.outletId
          ? `outlet_id=eq.${user.outletId}`
          : undefined;

    realtimeSubscription = supabase
      .channel('kds_orders_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pos_orders',
          filter: filterStr,
        },
        () => {
          get().fetchOrders();
        }
      )
      .subscribe();
  },

  unsubscribeFromOrders: () => {
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
      realtimeSubscription = null;
    }
  },
}));
