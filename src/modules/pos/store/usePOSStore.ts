import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export type PaymentMethod = 'cash' | 'card' | 'upi';

export interface HeldOrder {
  id: string;
  created_at: string;
  notes: string;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  items: any[];
}

interface POSState {
  cart: CartItem[];
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  taxRate: number;
  
  // Held Orders State
  heldOrders: HeldOrder[];

  // Checkout State
  paymentMethod: PaymentMethod;
  tenderedAmount: string; // Kept as string for on-screen numpad input
  customerName: string;
  customerPhone: string;
  lastOrder: any | null; // For printing receipts after checkout
  
  // Search State
  searchQuery: string;

  // Actions
  setSearchQuery: (query: string) => void;
  addItem: (product: any) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setDiscount: (type: 'percentage' | 'fixed', value: number) => void;
  
  setPaymentMethod: (method: PaymentMethod) => void;
  setTenderedAmount: (amount: string) => void;
  setCustomerDetails: (name: string, phone: string) => void;
  processCheckout: () => Promise<void>;
  
  // Hold Actions
  holdCurrentOrder: (note: string) => Promise<void>;
  fetchHeldOrders: () => Promise<void>;
  resumeOrder: (orderId: string) => Promise<void>;
  discardHeldOrder: (orderId: string) => Promise<void>;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  heldOrders: [],
  discountType: 'fixed',
  discountValue: 0,
  taxRate: 0.18, // 18% default GST for example
  paymentMethod: 'cash',
  tenderedAmount: '',
  customerName: '',
  customerPhone: '',
  lastOrder: null,
  
  searchQuery: '',
  
  setSearchQuery: (query) => set({ searchQuery: query }),

  addItem: (product) => set((state) => {
    const existing = state.cart.find(item => item.productId === product.id);
    if (existing) {
      return {
        cart: state.cart.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      };
    }
    return {
      cart: [...state.cart, {
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        price: product.selling_price || product.sellingPrice || product.price || 0,
        quantity: 1
      }]
    };
  }),

  removeItem: (id) => set((state) => ({
    cart: state.cart.filter(item => item.id !== id)
  })),

  updateQuantity: (id, quantity) => set((state) => ({
    cart: state.cart.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
    )
  })),

  clearCart: () => set({ 
    cart: [], 
    discountValue: 0, 
    tenderedAmount: '',
    customerName: '',
    customerPhone: ''
  }),
  
  setDiscount: (type, value) => set({ discountType: type, discountValue: value }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),
  
  setTenderedAmount: (amount) => set({ tenderedAmount: amount }),
  
  setCustomerDetails: (name, phone) => set({ customerName: name, customerPhone: phone }),
  
  processCheckout: async () => {
    const state = get();
    const { user } = useAuthStore.getState();
    const outletId = user?.outletId;
    
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = subtotal * state.taxRate;
    const totalAmount = subtotal + taxAmount;
    
    const tenderedNumeric = parseFloat(state.tenderedAmount) || 0;
    const changeDue = Math.max(0, tenderedNumeric - totalAmount);

    let orderId = null;

    try {
      // 1. Insert into pos_orders
      const { data: orderData, error: orderError } = await supabase
        .from('pos_orders')
        .insert([{
          outlet_id: outletId,
          customer_name: state.customerName || null,
          customer_phone: state.customerPhone || null,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          payment_method: state.paymentMethod,
          tendered_amount: tenderedNumeric,
          change_due: changeDue,
          status: 'completed',
          kitchen_status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;
      orderId = orderData.id;

      // 2. Insert into pos_order_items
      const orderItems = state.cart.map(item => ({
        order_id: orderId,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('pos_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

    } catch (error) {
      console.error('Error processing checkout:', error);
      alert('Failed to save order to database. Please try again.');
      throw error;
    }
    
    // Save last order for receipt printing
    const orderToSave = {
      id: orderId,
      cart: state.cart,
      paymentMethod: state.paymentMethod,
      tenderedAmount: state.tenderedAmount,
      customer: {
        name: state.customerName,
        phone: state.customerPhone
      },
      timestamp: new Date().toISOString()
    };
    
    // Reset state after success but keep lastOrder
    set({ 
      cart: [], 
      tenderedAmount: '', 
      paymentMethod: 'cash',
      customerName: '',
      customerPhone: '',
      lastOrder: orderToSave
    });
  },

  holdCurrentOrder: async (note: string) => {
    const state = get();
    if (state.cart.length === 0) return;
    
    const { user } = useAuthStore.getState();
    const outletId = user?.outletId;
    
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = subtotal * state.taxRate;
    const totalAmount = subtotal + taxAmount;

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('pos_orders')
        .insert([{
          outlet_id: outletId,
          customer_name: state.customerName || null,
          customer_phone: state.customerPhone || null,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          status: 'held',
          notes: note || 'Held Order'
        }])
        .select('id')
        .single();

      if (orderError) throw orderError;

      const orderItems = state.cart.map(item => ({
        order_id: orderData.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase.from('pos_order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      state.clearCart();
      await state.fetchHeldOrders();

    } catch (error) {
      console.error('Failed to hold order:', error);
      throw error;
    }
  },

  fetchHeldOrders: async () => {
    const { user } = useAuthStore.getState();

    try {
      let query = supabase
        .from('pos_orders')
        .select(`
          id, created_at, notes, total_amount, customer_name, customer_phone,
          pos_order_items (
            product_id, product_name, quantity, unit_price, total_price
          )
        `)
        .eq('status', 'held')
        .order('created_at', { ascending: false });

      if (user?.outletId) {
        query = query.eq('outlet_id', user.outletId);
      } else {
        // If super admin, just fetch ones without outlet or all (for testing)
        query = query.is('outlet_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedOrders = data.map((order: any) => ({
        id: order.id,
        created_at: order.created_at,
        notes: order.notes,
        total_amount: order.total_amount,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        items: order.pos_order_items.map((item: any) => ({
          productId: item.product_id,
          name: item.product_name || 'Unknown',
          quantity: item.quantity,
          price: item.unit_price
        }))
      }));

      set({ heldOrders: mappedOrders });
    } catch (error) {
      console.error('Failed to fetch held orders:', error);
    }
  },

  resumeOrder: async (orderId: string) => {
    const state = get();
    if (state.cart.length > 0) {
      await state.holdCurrentOrder('Auto-held');
    }

    const orderToResume = state.heldOrders.find(o => o.id === orderId);
    if (!orderToResume) return;

    set({
      cart: orderToResume.items.map(i => ({
        id: crypto.randomUUID(),
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      customerName: orderToResume.customer_name || '',
      customerPhone: orderToResume.customer_phone || ''
    });

    try {
      await supabase.from('pos_orders').delete().eq('id', orderId);
      await state.fetchHeldOrders();
    } catch (error) {
      console.error('Failed to delete held order after resuming:', error);
    }
  },

  discardHeldOrder: async (orderId: string) => {
    const state = get();
    try {
      await supabase.from('pos_orders').delete().eq('id', orderId);
      await state.fetchHeldOrders();
    } catch (error) {
      console.error('Failed to discard held order:', error);
    }
  }

}));
