import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contact_name: string;
  phone: string;
  address: string;
  is_active: boolean;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity: number;
  products?: { name: string, unit: string };
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  outlet_id: string;
  supplier_id: string;
  total_amount: number;
  status: 'Draft' | 'Pending' | 'Received' | 'Cancelled';
  expected_date: string | null;
  notes: string;
  created_at: string;
  suppliers?: { name: string };
  outlets?: { name: string };
  items?: PurchaseOrderItem[];
}

interface PurchaseState {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  isLoading: boolean;
  error: string | null;

  fetchSuppliers: () => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'is_active'>) => Promise<void>;
  
  fetchPurchaseOrders: () => Promise<void>;
  createPurchaseOrder: (po: Partial<PurchaseOrder>, items: Omit<PurchaseOrderItem, 'id'|'po_id'|'total_price'>[]) => Promise<void>;
  updatePOStatus: (id: string, status: PurchaseOrder['status']) => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  suppliers: [],
  purchaseOrders: [],
  isLoading: false,
  error: null,

  fetchSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      set({ suppliers: data as Supplier[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addSupplier: async (supplier) => {
    try {
      const { data, error } = await supabase.from('suppliers').insert([supplier]).select().single();
      if (error) throw error;
      set((state) => ({ suppliers: [...state.suppliers, data as Supplier] }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  fetchPurchaseOrders: async () => {
    const { user } = useAuthStore.getState();
    set({ isLoading: true, error: null });
    
    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(name),
          outlets(name),
          items:purchase_order_items(
            *,
            products(name, unit)
          )
        `)
        .order('created_at', { ascending: false });

      if (user?.outletId) {
        query = query.eq('outlet_id', user.outletId);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ purchaseOrders: data as unknown as PurchaseOrder[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createPurchaseOrder: async (po, items) => {
    const { user } = useAuthStore.getState();
    const outletId = user?.outletId || po.outlet_id;
    if (!outletId) throw new Error("Outlet ID is required to create a PO");

    try {
      // 1. Calculate total
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      // 2. Generate PO Number
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;

      // 3. Insert PO
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert([{
          po_number: poNumber,
          outlet_id: outletId,
          supplier_id: po.supplier_id,
          status: po.status || 'Draft',
          total_amount: totalAmount,
          notes: po.notes,
          created_by: user.id
        }])
        .select()
        .single();
      
      if (poError) throw poError;

      // 4. Insert Items
      const poItems = items.map(item => ({
        po_id: poData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(poItems);
        
      if (itemsError) throw itemsError;

      await get().fetchPurchaseOrders();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updatePOStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;

      // Optimistic update
      set((state) => ({
        purchaseOrders: state.purchaseOrders.map(po => 
          po.id === id ? { ...po, status } : po
        )
      }));

    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  }
}));
