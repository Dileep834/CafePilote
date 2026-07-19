import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId } from '@/store/useTenantStore';
import { useTableBillStore, type TableBillItem } from '@/modules/tables/store/useTableBillStore';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import type { Table } from '@/types';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface AddCartItemOptions {
  price?: number;
  notes?: string;
  quantity?: number;
}

export type OnlinePaymentMethod = 'paytm' | 'phonepe' | 'amazonpay';
export type ManualPaymentMethod =
  | 'cash'
  | 'card'
  | 'upi'
  | 'wallet'
  | 'gift_card'
  | 'credit'
  | 'split'
  | 'store_credit';
export type PaymentMethod = ManualPaymentMethod | OnlinePaymentMethod;

export interface CheckoutPaymentReference {
  gateway: OnlinePaymentMethod;
  providerOrderId: string;
  providerSessionId?: string;
  providerTransactionId?: string;
  status?: string;
}

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

  heldOrders: HeldOrder[];

  paymentMethod: PaymentMethod;
  tenderedAmount: string;
  customerName: string;
  customerPhone: string;
  lastOrder: any | null;

  activeTableId: string | null;
  activeTableLabel: string | null;

  searchQuery: string;

  setSearchQuery: (query: string) => void;
  addItem: (product: any, options?: AddCartItemOptions) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setDiscount: (type: 'percentage' | 'fixed', value: number) => void;

  setPaymentMethod: (method: PaymentMethod) => void;
  setTenderedAmount: (amount: string) => void;
  setCustomerDetails: (name: string, phone: string) => void;
  processCheckout: (paymentReference?: CheckoutPaymentReference) => Promise<void>;

  attachTable: (table: Table, allTables: Table[]) => void;
  detachTable: () => void;
  loadTableBill: (table: Table, allTables: Table[]) => void;
  reloadActiveTableBill: () => void;
  syncActiveTableBill: () => void;
  fireActiveTableKitchen: () => Promise<boolean>;

  holdCurrentOrder: (note: string) => Promise<void>;
  fetchHeldOrders: () => Promise<void>;
  resumeOrder: (orderId: string) => Promise<void>;
  discardHeldOrder: (orderId: string) => Promise<void>;
}

function cartToBillItems(cart: CartItem[]): TableBillItem[] {
  return cart.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    notes: item.notes,
  }));
}

function cloudOutletId(outletId?: string | null) {
  if (!outletId || outletId === 'current-outlet' || outletId.startsWith('local')) return null;
  return outletId;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  heldOrders: [],
  discountType: 'fixed',
  discountValue: 0,
  taxRate: 0.18,
  paymentMethod: 'cash',
  tenderedAmount: '',
  customerName: '',
  customerPhone: '',
  lastOrder: null,
  activeTableId: null,
  activeTableLabel: null,
  searchQuery: '',

  setSearchQuery: (query) => set({ searchQuery: query }),

  addItem: (product, options = {}) => {
    set((state) => {
      const price = options.price ?? product.selling_price ?? product.sellingPrice ?? product.price ?? 0;
      const notes = options.notes?.trim() || undefined;
      const quantity = Math.max(1, options.quantity || 1);
      const existing = state.cart.find(
        (item) => item.productId === product.id && item.price === price && (item.notes || '') === (notes || '')
      );
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.productId === product.id
            && item.price === price
            && (item.notes || '') === (notes || '')
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        };
      }
      return {
        cart: [
          ...state.cart,
          {
            id: crypto.randomUUID(),
            productId: product.id,
            name: product.name,
            price,
            quantity,
            notes,
          },
        ],
      };
    });
    get().syncActiveTableBill();
  },

  removeItem: (id) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== id),
    }));
    get().syncActiveTableBill();
  },

  updateQuantity: (id, quantity) => {
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      ),
    }));
    get().syncActiveTableBill();
  },

  clearCart: () =>
    set({
      cart: [],
      discountValue: 0,
      tenderedAmount: '',
      customerName: '',
      customerPhone: '',
      activeTableId: null,
      activeTableLabel: null,
    }),

  setDiscount: (type, value) => set({ discountType: type, discountValue: value }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setTenderedAmount: (amount) => set({ tenderedAmount: amount }),
  setCustomerDetails: (name, phone) => set({ customerName: name, customerPhone: phone }),

  attachTable: (table, allTables) => {
    const bill = useTableBillStore.getState().ensureOpenBill(table, allTables, 'pos');
    set({
      activeTableId: bill.tableId,
      activeTableLabel: bill.tableLabel,
      customerName: get().customerName || `Table ${bill.tableLabel}`,
    });
  },

  detachTable: () => set({ activeTableId: null, activeTableLabel: null }),

  loadTableBill: (table, allTables) => {
    const bill = useTableBillStore.getState().ensureOpenBill(table, allTables, 'pos');
    set({
      cart: bill.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
      })),
      activeTableId: bill.tableId,
      activeTableLabel: bill.tableLabel,
      customerName: `Table ${bill.tableLabel}`,
      discountValue: 0,
      tenderedAmount: '',
    });
  },

  /** Refresh cart from cloud/local open bill without creating a new check */
  reloadActiveTableBill: () => {
    const { activeTableId, cart } = get();
    if (!activeTableId) return;
    const bill = useTableBillStore.getState().getOpenBill(activeTableId);
    if (!bill) return;
    const cartQty = cart.reduce((s, i) => s + i.quantity, 0);
    const billQty = bill.items.reduce((s, i) => s + i.quantity, 0);
    // Only pull when the open check has something the cart is missing (QR guest sync)
    if (billQty <= cartQty) return;
    set({
      cart: bill.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
      })),
      activeTableLabel: bill.tableLabel,
      customerName: `Table ${bill.tableLabel}`,
    });
  },

  syncActiveTableBill: () => {
    const { activeTableId, cart } = get();
    if (!activeTableId) return;
    useTableBillStore.getState().syncBillFromCart(activeTableId, cartToBillItems(cart));
  },

  fireActiveTableKitchen: async () => {
    const state = get();
    if (!state.activeTableId) return false;
    state.syncActiveTableBill();
    return useTableBillStore.getState().fireKitchenTicket(state.activeTableId, undefined, 'pos');
  },

  processCheckout: async (paymentReference) => {
    const state = get();
    const { user } = useAuthStore.getState();
    const tableBill = state.activeTableId
      ? useTableBillStore.getState().getOpenBill(state.activeTableId)
      : undefined;
    const outletId =
      cloudOutletId(tableBill?.outletId) ||
      cloudOutletId(getTenantOutletId(user)) ||
      cloudOutletId(user?.outletId);

    const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount =
      state.discountType === 'percentage'
        ? (subtotal * state.discountValue) / 100
        : state.discountValue;
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = discountedSubtotal * state.taxRate;
    const totalAmount = discountedSubtotal + taxAmount;

    const tenderedNumeric =
      state.paymentMethod === 'cash' ? parseFloat(state.tenderedAmount) || 0 : totalAmount;
    const changeDue = state.paymentMethod === 'cash' ? Math.max(0, tenderedNumeric - totalAmount) : 0;

    let orderId: string | null = null;
    const cartSnapshot = [...state.cart];
    const tableLabel = state.activeTableLabel;
    const tableId = state.activeTableId;

    // Table sales: kitchen already got (or will get) tickets via settleBill
    const kitchenStatus = tableId ? 'delivered' : 'pending';

    const gatewayNote = paymentReference
      ? [
          `Gateway ${paymentReference.gateway.toUpperCase()}`,
          paymentReference.providerOrderId,
          paymentReference.providerTransactionId,
        ]
          .filter(Boolean)
          .join(' - ')
      : null;
    const notes =
      [tableLabel ? `Paid dine-in - ${tableLabel}` : null, gatewayNote].filter(Boolean).join(' | ') ||
      null;

    const fullRow = {
      outlet_id: outletId,
      customer_name: state.customerName || (tableLabel ? `Table ${tableLabel}` : null),
      customer_phone: state.customerPhone || null,
      total_amount: totalAmount,
      tax_amount: taxAmount,
      payment_method: state.paymentMethod,
      tendered_amount: tenderedNumeric,
      change_due: changeDue,
      status: 'completed',
      kitchen_status: kitchenStatus,
      table_id: tableId || null,
      table_number: tableLabel || null,
      order_source: 'pos',
      notes,
    };

    const legacyRow = {
      outlet_id: outletId,
      customer_name: state.customerName || (tableLabel ? `Table ${tableLabel}` : null),
      customer_phone: state.customerPhone || null,
      total_amount: totalAmount,
      tax_amount: taxAmount,
      payment_method: state.paymentMethod,
      tendered_amount: tenderedNumeric,
      change_due: changeDue,
      status: 'completed',
      kitchen_status: kitchenStatus,
      notes,
    };

    try {
      let { data: orderData, error: orderError } = await supabase
        .from('pos_orders')
        .insert([fullRow])
        .select()
        .single();

      if (orderError) {
        ({ data: orderData, error: orderError } = await supabase
          .from('pos_orders')
          .insert([legacyRow])
          .select()
          .single());
      }

      if (orderError) throw orderError;
      orderId = orderData.id;

      const orderItems = cartSnapshot.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        product_name: item.notes ? `${item.name} (${item.notes})` : item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('pos_order_items').insert(orderItems);
      if (itemsError) throw itemsError;
    } catch (error) {
      console.error('Error processing checkout:', error);
      if (!tableId) {
        alert('Failed to save order to database. Please try again.');
        throw error;
      }
      orderId = `local-paid-${Date.now()}`;
    }

    if (tableId) {
      await useTableBillStore.getState().settleBill(tableId, orderId || undefined);
    }

    set({
      cart: [],
      tenderedAmount: '',
      paymentMethod: 'cash',
      customerName: '',
      customerPhone: '',
      discountValue: 0,
      activeTableId: null,
      activeTableLabel: null,
      lastOrder: {
        id: orderId,
        cart: cartSnapshot,
        paymentMethod: state.paymentMethod,
        tenderedAmount: state.tenderedAmount,
        taxAmount,
        discountAmount,
        totalAmount,
        changeDue,
        paymentReference,
        tableLabel,
        outletId,
        customer: { name: state.customerName, phone: state.customerPhone },
        timestamp: new Date().toISOString(),
      },
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cafepilots:orders-updated', {
          detail: { orderId, outletId, totalAmount },
        })
      );
    }
  },

  holdCurrentOrder: async (note: string) => {
    const state = get();
    if (state.cart.length === 0) return;

    if (state.activeTableId) {
      state.syncActiveTableBill();
      set({
        cart: [],
        activeTableId: null,
        activeTableLabel: null,
        customerName: '',
        customerPhone: '',
        discountValue: 0,
        tenderedAmount: '',
      });
      return;
    }

    const { user } = useAuthStore.getState();
    const outletId = cloudOutletId(getTenantOutletId(user)) || cloudOutletId(user?.outletId);
    const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmount = subtotal * state.taxRate;
    const totalAmount = subtotal + taxAmount;

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('pos_orders')
        .insert([
          {
            outlet_id: outletId,
            customer_name: state.customerName || null,
            customer_phone: state.customerPhone || null,
            total_amount: totalAmount,
            tax_amount: taxAmount,
            status: 'held',
            notes: note || 'Held Order',
          },
        ])
        .select('id')
        .single();

      if (orderError) throw orderError;

      const orderItems = state.cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
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
        .select(
          `
          id, created_at, notes, total_amount, customer_name, customer_phone,
          pos_order_items (
            product_id, product_name, quantity, unit_price, total_price
          )
        `
        )
        .eq('status', 'held')
        .order('created_at', { ascending: false });

      const outletId = cloudOutletId(getTenantOutletId(user)) || cloudOutletId(user?.outletId);
      if (outletId) query = query.eq('outlet_id', outletId);
      else query = query.is('outlet_id', null);

      const { data, error } = await query;
      if (error) throw error;

      set({
        heldOrders: data.map((order: any) => ({
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
            price: item.unit_price,
          })),
        })),
      });
    } catch (error) {
      console.error('Failed to fetch held orders:', error);
    }
  },

  resumeOrder: async (orderId: string) => {
    const state = get();
    if (state.cart.length > 0) await state.holdCurrentOrder('Auto-held');

    const orderToResume = state.heldOrders.find((o) => o.id === orderId);
    if (!orderToResume) return;

    set({
      cart: orderToResume.items.map((i) => ({
        id: crypto.randomUUID(),
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      customerName: orderToResume.customer_name || '',
      customerPhone: orderToResume.customer_phone || '',
      activeTableId: null,
      activeTableLabel: null,
    });

    try {
      await supabase.from('pos_orders').delete().eq('id', orderId);
      await state.fetchHeldOrders();
    } catch (error) {
      console.error('Failed to delete held order after resuming:', error);
    }
  },

  discardHeldOrder: async (orderId: string) => {
    try {
      await supabase.from('pos_orders').delete().eq('id', orderId);
      await get().fetchHeldOrders();
    } catch (error) {
      console.error('Failed to discard held order:', error);
    }
  },
}));

export async function openTableOnPOS(table: Table) {
  const allTables = useTableStore.getState().tables;
  const user = useAuthStore.getState().user;
  const outletId = getTenantOutletId(user) || table.outletId;
  // Pull QR guest lines before painting the cart (staff localStorage may be empty)
  await useTableBillStore.getState().hydrateOpenBills(outletId);
  usePOSStore.getState().loadTableBill(table, allTables);
}
