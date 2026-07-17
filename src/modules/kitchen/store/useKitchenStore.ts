import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export type KitchenStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

export interface KitchenOrderItem {
  id: string;
  product_name: string;
  quantity: number;
}

export interface KitchenOrder {
  id: string;
  customer_name: string | null;
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

export const useKitchenStore = create<KitchenState>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    const { user } = useAuthStore.getState();

    set({ isLoading: true, error: null });
    try {
      // Fetch orders that are not delivered yet
      let query = supabase
        .from('pos_orders')
        .select(`
          id,
          customer_name,
          kitchen_status,
          created_at,
          items:pos_order_items (
            id,
            product_name,
            quantity
          )
        `)
        .neq('kitchen_status', 'delivered')
        .order('created_at', { ascending: true });

      // Only filter by outlet if the user is assigned to one
      if (user?.outletId) {
        query = query.eq('outlet_id', user.outletId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      set({ orders: data as unknown as KitchenOrder[], isLoading: false });
    } catch (err: any) {
      console.error('Error fetching kitchen orders:', err);
      set({ error: err.message, isLoading: false });
    }
  },

  updateOrderStatus: async (orderId: string, status: KitchenStatus) => {
    try {
      // Optimistic update
      set((state) => ({
        orders: state.orders.map(order => 
          order.id === orderId ? { ...order, kitchen_status: status } : order
        ).filter(order => status !== 'delivered' || order.id !== orderId) 
        // If it's delivered, optionally remove it from the KDS board
      }));

      const { error } = await supabase
        .from('pos_orders')
        .update({ kitchen_status: status })
        .eq('id', orderId);

      if (error) {
        // Revert on error
        get().fetchOrders();
        throw error;
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
    }
  },

  subscribeToOrders: () => {
    const { user } = useAuthStore.getState();

    // Unsubscribe if already subscribed
    get().unsubscribeFromOrders();

    const filterStr = user?.outletId ? `outlet_id=eq.${user.outletId}` : undefined;

    realtimeSubscription = supabase
      .channel('kds_orders_channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'pos_orders',
          filter: filterStr,
        },
        (_payload) => {
          // When an order changes, just refetch everything to get the joined items easily
          // For a massive app, we'd manually merge the payload, but refetching is safer and cleaner for MVP
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
  }
}));
