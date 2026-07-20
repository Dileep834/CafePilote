import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { getScopedCompanyId, getOutletIdsForCompany } from '@/lib/tenantScope';
import { getTenantOutletId } from '@/store/useTenantStore';

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contact_name: string;
  phone: string;
  address: string;
  is_active: boolean;
  email?: string | null;
  website?: string | null;
  gst_number?: string | null;
  city?: string | null;
  state?: string | null;
  pin_code?: string | null;
  payment_terms?: string | null;
  preferred_delivery_time?: string | null;
  preferred_supplier?: boolean | null;
  notes?: string | null;
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
  addSupplier: (
    supplier: Omit<Supplier, 'id'> & Partial<Pick<Supplier, 'is_active'>>
  ) => Promise<Supplier>;
  
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
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);
      let query = supabase.from('suppliers').select('*').order('name');
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      set({ suppliers: data as Supplier[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addSupplier: async (supplier) => {
    try {
      const user = useAuthStore.getState().user;
      const companyId = getScopedCompanyId(user);

      const fullRow = {
        name: supplier.name,
        category: supplier.category || null,
        contact_name: supplier.contact_name || null,
        phone: supplier.phone || null,
        address: supplier.address || null,
        is_active: supplier.is_active ?? true,
        email: supplier.email ?? null,
        website: supplier.website ?? null,
        gst_number: supplier.gst_number ?? null,
        city: supplier.city ?? null,
        state: supplier.state ?? null,
        pin_code: supplier.pin_code ?? null,
        payment_terms: supplier.payment_terms ?? null,
        preferred_delivery_time: supplier.preferred_delivery_time ?? null,
        preferred_supplier: supplier.preferred_supplier ?? false,
        notes: supplier.notes ?? null,
        company_id: companyId,
      };

      let { data, error } = await supabase.from('suppliers').insert([fullRow]).select().single();

      // Fallback when optional columns are not migrated yet.
      if (error && /column|schema cache|does not exist/i.test(error.message || '')) {
        const coreRow = {
          name: fullRow.name,
          category: fullRow.category,
          contact_name: fullRow.contact_name,
          phone: fullRow.phone,
          address: [
            fullRow.address,
            fullRow.email ? `Email: ${fullRow.email}` : '',
            fullRow.gst_number ? `GST: ${fullRow.gst_number}` : '',
            fullRow.notes ? `Notes: ${fullRow.notes}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          is_active: fullRow.is_active,
          company_id: companyId,
        };
        const fallback = await supabase.from('suppliers').insert([coreRow]).select().single();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      const created = data as Supplier;
      set((state) => ({ suppliers: [...state.suppliers, created] }));
      return created;
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

      const companyId = getScopedCompanyId(user);
      const companyOutletIds = getOutletIdsForCompany(companyId);
      const activeOutlet = getTenantOutletId(user);

      if (user?.outletId) {
        query = query.eq('outlet_id', user.outletId);
      } else if (activeOutlet && activeOutlet !== 'current-outlet') {
        query = query.eq('outlet_id', activeOutlet);
      } else if (companyOutletIds.length > 0) {
        query = query.in('outlet_id', companyOutletIds);
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
    const outletId = user?.outletId || po.outlet_id || getTenantOutletId(user);
    if (!outletId || outletId === 'current-outlet') {
      throw new Error("Active outlet is required to create a PO");
    }

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
          expected_date: po.expected_date || null,
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
      const current = get().purchaseOrders.find((po) => po.id === id);
      const shouldReceiveStock = status === 'Received' && current?.status !== 'Received';

      const { error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;

      if (shouldReceiveStock) {
        const { data: poData, error: poFetchError } = await supabase
          .from('purchase_orders')
          .select(`
            outlet_id,
            supplier_id,
            items:purchase_order_items(
              id,
              product_id,
              quantity,
              received_quantity,
              unit_price
            )
          `)
          .eq('id', id)
          .single();

        if (poFetchError) throw poFetchError;
        const outletId = poData?.outlet_id;
        if (!outletId || outletId === 'current-outlet') {
          throw new Error('Cannot receive stock without an active outlet.');
        }

        const receiveLines = ((poData.items || []) as PurchaseOrderItem[])
          .map((item) => ({
            productId: item.product_id,
            quantity: Number(item.received_quantity || item.quantity || 0),
            unitCost: Number(item.unit_price || 0) || undefined,
          }))
          .filter((line) => line.productId && line.quantity > 0);

        // Prefer Phase 2 GRN path (ledger + notification); fall back to direct inventory upsert
        let usedGrn = false;
        try {
          const { createGrn } = await import('@/modules/ops/services/purchaseAdvancedService');
          const { user } = await import('@/store/useAuthStore').then((m) => m.useAuthStore.getState());
          await createGrn({
            outletId,
            poId: id,
            supplierId: poData.supplier_id || null,
            items: receiveLines,
            notes: `PO receive ${id}`,
            userId: user?.id || null,
          });
          usedGrn = true;
        } catch {
          usedGrn = false;
        }

        if (!usedGrn) {
          for (const item of (poData.items || []) as PurchaseOrderItem[]) {
            const quantity = Number(item.received_quantity || item.quantity || 0);
            if (!item.product_id || quantity <= 0) continue;

            const { data: invData, error: invFetchError } = await supabase
              .from('inventory')
              .select('current_quantity')
              .eq('outlet_id', outletId)
              .eq('product_id', item.product_id)
              .maybeSingle();

            if (invFetchError) throw invFetchError;

            const currentQty = Number(invData?.current_quantity || 0);
            const { error: inventoryError } = await supabase.from('inventory').upsert(
              {
                outlet_id: outletId,
                product_id: item.product_id,
                current_quantity: currentQty + quantity,
              },
              { onConflict: 'outlet_id, product_id' }
            );

            if (inventoryError) throw inventoryError;
          }
        }
      }

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
