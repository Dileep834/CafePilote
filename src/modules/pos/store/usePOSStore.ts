import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId } from '@/store/useTenantStore';
import { useTableBillStore, type TableBillItem } from '@/modules/tables/store/useTableBillStore';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import type { Table } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';

export function calculateOrderTotals(cart: CartItem[], discountType: 'percentage' | 'fixed', discountValue: number) {
  const { taxMode, defaultTaxRate, taxInclusive, serviceChargeMode, serviceChargeValue, roundingRule } = useSettingsStore.getState();

  let subtotal = 0;
  cart.forEach(item => subtotal += item.price * item.quantity);

  let discountAmount = discountType === 'percentage' ? (subtotal * discountValue) / 100 : discountValue;
  discountAmount = Math.min(discountAmount, subtotal);

  let taxableBaseTotal = 0;
  let taxAmount = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    const itemDiscount = subtotal > 0 ? (itemTotal / subtotal) * discountAmount : 0;
    const itemDiscountedTotal = itemTotal - itemDiscount;

    let itemGstRate = 0;
    if (item.isTaxable !== false && taxMode !== 'none') {
      itemGstRate = taxMode === 'per_product' ? (item.taxRate || 0) : defaultTaxRate;
    }

    if (taxInclusive) {
      const base = itemDiscountedTotal / (1 + (itemGstRate / 100));
      const tax = itemDiscountedTotal - base;
      taxableBaseTotal += base;
      taxAmount += tax;
    } else {
      const tax = itemDiscountedTotal * (itemGstRate / 100);
      taxableBaseTotal += itemDiscountedTotal;
      taxAmount += tax;
    }
  });

  const baseForSC = taxInclusive ? taxableBaseTotal : (subtotal - discountAmount);
  let scAmount = 0;
  if (serviceChargeMode === 'fixed') scAmount = serviceChargeValue;
  else if (serviceChargeMode === 'percentage') scAmount = baseForSC * (serviceChargeValue / 100);

  let grandTotalRaw = taxInclusive 
    ? (subtotal - discountAmount + scAmount) 
    : (subtotal - discountAmount + taxAmount + scAmount);

  let grandTotal = grandTotalRaw;
  switch (roundingRule) {
    case 'up': grandTotal = Math.ceil(grandTotalRaw); break;
    case 'down': grandTotal = Math.floor(grandTotalRaw); break;
    case 'nearest_1': grandTotal = Math.round(grandTotalRaw); break;
    case 'nearest_0_5': grandTotal = Math.round(grandTotalRaw * 2) / 2; break;
  }
  
  return {
    subtotal,
    discountAmount,
    taxAmount,
    serviceCharge: scAmount,
    roundOff: grandTotal - grandTotalRaw,
    totalAmount: grandTotal
  };
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
  taxRate?: number;
  isTaxable?: boolean;
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

export type CheckoutOptions = {
  idempotencyKey?: string;
  splitLines?: Array<{ method: string; amount: number; tendered?: number }>;
  managerApprovalId?: string | null;
};

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
  serviceCharge: number;
  orderNotes: string;

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
  setItemNotes: (id: string, notes: string) => void;
  adjustProductQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  setDiscount: (type: 'percentage' | 'fixed', value: number) => void;
  setServiceCharge: (value: number) => void;
  setOrderNotes: (notes: string) => void;

  setPaymentMethod: (method: PaymentMethod) => void;
  setTenderedAmount: (amount: string) => void;
  setCustomerDetails: (name: string, phone: string) => void;
  processCheckout: (
    paymentReference?: CheckoutPaymentReference,
    options?: CheckoutOptions
  ) => Promise<void>;

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
  mergeHeldOrders: (targetId: string, sourceId: string) => Promise<void>;
  transferHeldTable: (orderId: string, tableLabel: string) => Promise<void>;
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
  serviceCharge: 0,
  orderNotes: '',
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
            imageUrl: product.image_url || product.imageUrl || null,
            taxRate: product.gst,
            isTaxable: product.isTaxable !== false,
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

  setItemNotes: (id, notes) => {
    const trimmed = notes.trim();
    set((state) => ({
      cart: state.cart.map((item) =>
        item.id === id ? { ...item, notes: trimmed || undefined } : item
      ),
    }));
    get().syncActiveTableBill();
  },

  adjustProductQuantity: (productId, delta) => {
    const state = get();
    const lines = state.cart.filter((item) => item.productId === productId);
    if (delta > 0) {
      if (lines.length === 0) return;
      const last = lines[lines.length - 1];
      state.updateQuantity(last.id, last.quantity + delta);
      return;
    }
    if (!lines.length) return;
    const last = lines[lines.length - 1];
    if (last.quantity + delta <= 0) state.removeItem(last.id);
    else state.updateQuantity(last.id, last.quantity + delta);
  },

  clearCart: () =>
    set({
      cart: [],
      discountValue: 0,
      serviceCharge: 0,
      orderNotes: '',
      tenderedAmount: '',
      customerName: '',
      customerPhone: '',
      activeTableId: null,
      activeTableLabel: null,
    }),

  setDiscount: (type, value) => set({ discountType: type, discountValue: value }),
  setServiceCharge: (value) => set({ serviceCharge: Math.max(0, value) }),
  setOrderNotes: (notes) => set({ orderNotes: notes }),
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

  processCheckout: async (paymentReference, options) => {
    const state = get();
    const { user } = useAuthStore.getState();
    const tableBill = state.activeTableId
      ? useTableBillStore.getState().getOpenBill(state.activeTableId)
      : undefined;
    const outletId =
      cloudOutletId(tableBill?.outletId) ||
      cloudOutletId(getTenantOutletId(user)) ||
      cloudOutletId(user?.outletId);

    const totals = calculateOrderTotals(state.cart, state.discountType, state.discountValue);
    const subtotal = totals.subtotal;
    const discountAmount = totals.discountAmount;
    const taxAmount = totals.taxAmount;
    const totalAmount = totals.totalAmount;

    const tenderedNumeric =
      state.paymentMethod === 'cash' ? parseFloat(state.tenderedAmount) || 0 : totalAmount;
    const changeDue = state.paymentMethod === 'cash' ? Math.max(0, tenderedNumeric - totalAmount) : 0;

    // --- Phase 1: payment validation (cash / split) ---
    const { validateCashTender, validateSplitPayment, createIdempotencyKey } = await import(
      '@/modules/ops/lib/validators'
    );
    if (state.paymentMethod === 'cash') {
      const v = validateCashTender(totalAmount, tenderedNumeric);
      if (!v.ok) throw new Error(v.message);
    }
    if (state.paymentMethod === 'split' && options?.splitLines) {
      const v = validateSplitPayment(totalAmount, options.splitLines);
      if (!v.ok) throw new Error(v.message);
    }

    const idempotencyKey =
      options?.idempotencyKey ||
      createIdempotencyKey([
        outletId || 'no-outlet',
        state.activeTableId || 'counter',
        totalAmount.toFixed(2),
        state.paymentMethod,
        state.cart.map((c) => `${c.productId}x${c.quantity}`).join(','),
        // bucket to nearest 2s to collapse double-clicks, still unique per order shape
        Math.floor(Date.now() / 2000),
      ]);

    const {
      createOrGetPaymentIntent,
      completePaymentIntent,
      failPaymentIntent,
      acquireCheckoutLock,
      releaseCheckoutLock,
    } = await import('@/modules/ops/services/paymentIntentService');

    if (!acquireCheckoutLock(idempotencyKey)) {
      throw new Error('Checkout already in progress. Please wait.');
    }

    let intentId: string | null = null;

    try {
      // --- Enterprise Offline POS: never lose the sale when connectivity drops ---
      const { ConnectivityService } = await import('@/modules/offline/services/ConnectivityService');
      const { isOfflineBillingAllowed } = await import('@/modules/offline/lib/capabilities');
      const { PaymentService } = await import('@/modules/offline/services/PaymentService');
      const { useTenantStore } = await import('@/store/useTenantStore');
      const planId = useTenantStore.getState().planId;
      const offlineCapable = isOfflineBillingAllowed(planId);
      const isOnline = ConnectivityService.isOnline();

      if (!isOnline) {
        if (!offlineCapable) {
          throw new Error(
            'You are offline. Offline billing requires Professional or Enterprise. Reconnect to complete this sale.'
          );
        }
        PaymentService.assertAllowed(state.paymentMethod);

        const { OrderService } = await import('@/modules/offline/services/OrderService');
        const offlineResult = await OrderService.checkoutOffline({
          outletId,
          companyId: useTenantStore.getState().companyId,
          customerName: state.customerName || (state.activeTableLabel ? `Table ${state.activeTableLabel}` : null),
          customerPhone: state.customerPhone || null,
          totalAmount,
          taxAmount,
          discountAmount,
          paymentMethod: state.paymentMethod,
          tenderedAmount: tenderedNumeric,
          changeDue,
          tableId: state.activeTableId,
          tableNumber: state.activeTableLabel,
          orderSource: 'pos',
          notes: state.activeTableLabel ? `Paid dine-in - ${state.activeTableLabel} (offline)` : 'Offline POS sale',
          idempotencyKey,
          lines: state.cart.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            notes: item.notes,
          })),
          splitLines: options?.splitLines || null,
          gatewayReference: paymentReference
            ? (paymentReference as unknown as Record<string, unknown>)
            : null,
          actorId: user?.id || null,
          kitchenStatus: state.activeTableId ? 'delivered' : 'pending',
          fireKot: !state.activeTableId,
          strictInventory: false,
        });

        const orderId = offlineResult.orderId;
        const cartSnapshot = [...state.cart];
        const tableId = state.activeTableId;
        const tableLabel = state.activeTableLabel;

        if (tableId) {
          await useTableBillStore.getState().settleBill(tableId, orderId);
        }

        set({
          cart: [],
          tenderedAmount: '',
          paymentMethod: 'cash',
          customerName: '',
          customerPhone: '',
          discountValue: 0,
          serviceCharge: 0,
          orderNotes: '',
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
            // Printed temp numbers must never change after sync
            offlineTempOrderNumber: offlineResult.tempOrderNumber,
            offlineTempInvoiceNumber: offlineResult.tempInvoiceNumber,
            offlineMode: true,
          } as never,
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('cafepilots:orders-updated', {
              detail: {
                orderId,
                outletId,
                totalAmount,
                offline: true,
                tempOrderNumber: offlineResult.tempOrderNumber,
              },
            })
          );
          window.dispatchEvent(new CustomEvent('cafepilots:offline-order-saved', {
            detail: { orderId, tempOrderNumber: offlineResult.tempOrderNumber },
          }));
        }
        return;
      }

      const { intent, reused } = await createOrGetPaymentIntent({
        idempotencyKey,
        outletId,
        amount: totalAmount,
        paymentMethod: state.paymentMethod,
        splitLines: options?.splitLines,
        gatewayPayload: paymentReference
          ? (paymentReference as unknown as Record<string, unknown>)
          : undefined,
        createdBy: user?.id || null,
      });

      intentId = intent?.id || null;

      if (reused && intent?.status === 'succeeded' && intent.order_id) {
        // Idempotent replay — order already paid
        set({
          cart: [],
          tenderedAmount: '',
          paymentMethod: 'cash',
          customerName: '',
          customerPhone: '',
          discountValue: 0,
          serviceCharge: 0,
          orderNotes: '',
          activeTableId: null,
          activeTableLabel: null,
          lastOrder: {
            id: intent.order_id,
            cart: [...state.cart],
            paymentMethod: state.paymentMethod,
            tenderedAmount: state.tenderedAmount,
            taxAmount,
            discountAmount,
            totalAmount,
            changeDue,
            paymentReference,
            tableLabel: state.activeTableLabel,
            outletId,
            customer: { name: state.customerName, phone: state.customerPhone },
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // --- Phase 1: inventory availability (block before sale) ---
      const saleLines = state.cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        notes: item.notes,
      }));

      if (outletId) {
        const { checkInventoryForSale } = await import(
          '@/modules/ops/services/recipeDeductionService'
        );
        const stockCheck = await checkInventoryForSale({ outletId, lines: saleLines });
        if (!stockCheck.ok) {
          if (intentId) await failPaymentIntent(intentId, stockCheck.message);
          throw new Error(stockCheck.message);
        }
      }

      let orderId: string | null = null;
      const cartSnapshot = [...state.cart];
      const tableLabel = state.activeTableLabel;
      const tableId = state.activeTableId;
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
        order_source: 'pos' as const,
        notes,
        idempotency_key: idempotencyKey,
        payment_intent_id: intentId && !intentId.startsWith('local-') ? intentId : null,
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
          // Idempotency unique hit — fetch existing
          if (orderError.code === '23505' && idempotencyKey) {
            const { data: existing } = await supabase
              .from('pos_orders')
              .select('*')
              .eq('idempotency_key', idempotencyKey)
              .maybeSingle();
            if (existing) {
              orderId = existing.id;
              orderData = existing;
              orderError = null;
            }
          }
        }

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

        // Avoid duplicate items on idempotent replay
        const { count } = await supabase
          .from('pos_order_items')
          .select('id', { count: 'exact', head: true })
          .eq('order_id', orderId);
        if (!count) {
          const { error: itemsError } = await supabase.from('pos_order_items').insert(orderItems);
          if (itemsError) throw itemsError;
        }
      } catch (error) {
        console.error('Error processing checkout:', error);
        if (intentId) await failPaymentIntent(intentId, (error as Error)?.message || 'checkout failed');
        if (!tableId) {
          alert('Failed to save order to database. Please try again.');
          throw error;
        }
        orderId = `local-paid-${Date.now()}`;
      }

      if (orderId && intentId) {
        const tenderLines =
          state.paymentMethod === 'split' && options?.splitLines?.length
            ? options.splitLines.map((l) => ({
                method: l.method,
                amount: l.amount,
                tendered: l.tendered ?? l.amount,
                changeDue: 0,
                providerRef: paymentReference?.providerTransactionId,
              }))
            : [
                {
                  method: state.paymentMethod,
                  amount: totalAmount,
                  tendered: tenderedNumeric,
                  changeDue,
                  providerRef: paymentReference?.providerTransactionId,
                },
              ];

        await completePaymentIntent({
          intentId,
          orderId,
          outletId,
          tenderLines,
        });
      }

      // --- Phase 1: inventory deduction after successful payment ---
      if (outletId && orderId && !String(orderId).startsWith('local-')) {
        try {
          const { deductInventoryForSale } = await import(
            '@/modules/ops/services/recipeDeductionService'
          );
          await deductInventoryForSale({
            outletId,
            orderId,
            lines: saleLines,
            createdBy: user?.id || null,
            orderSource: 'pos',
          });
        } catch (invErr) {
          console.error('[checkout] inventory deduction failed after payment', invErr);
          // Payment already captured — surface warning but do not roll back sale
          alert(
            `Order saved, but inventory update failed: ${(invErr as Error)?.message || 'unknown'}. Adjust stock manually.`
          );
        }
      }

      // --- Phase 1: shift + audit ---
      if (outletId && orderId) {
        try {
          const { attachSaleToOpenShift } = await import('@/modules/ops/services/shiftService');
          const shiftId = await attachSaleToOpenShift({
            outletId,
            orderId,
            amount: totalAmount,
            paymentMethod: state.paymentMethod,
            userId: user?.id || null,
          });
          if (shiftId && !String(orderId).startsWith('local-')) {
            await supabase.from('pos_orders').update({ shift_id: shiftId }).eq('id', orderId);
          }
        } catch (shiftErr) {
          console.warn('[checkout] shift attach skipped', shiftErr);
        }

        try {
          const { writeAuditLog } = await import('@/modules/ops/services/auditService');
          await writeAuditLog({
            outletId,
            userId: user?.id,
            userName: user?.name,
            userRole: user?.role,
            action: 'checkout',
            entityType: 'pos_order',
            entityId: orderId,
            newValue: {
              totalAmount,
              paymentMethod: state.paymentMethod,
              discountAmount,
              taxAmount,
              itemCount: cartSnapshot.length,
            },
            reason: discountAmount > 0 ? `Discount ${discountAmount}` : null,
            managerApprovalId: options?.managerApprovalId,
          });
        } catch {
          /* ignore */
        }

        // --- Phase 2: lifecycle + loyalty ---
        if (!String(orderId).startsWith('local-')) {
          try {
            const { recordLifecycleTransition } = await import(
              '@/modules/ops/services/orderLifecycleService'
            );
            await recordLifecycleTransition({
              orderId,
              outletId,
              channel: tableId ? 'dine_in' : 'pos',
              fromStatus: 'new',
              toStatus: tableId ? 'completed' : 'accepted',
              actorId: user?.id,
              actorName: user?.name,
            });
          } catch {
            /* optional */
          }

          try {
            const { earnLoyaltyPoints } = await import('@/modules/ops/services/loyaltyService');
            await earnLoyaltyPoints({
              outletId,
              customerPhone: state.customerPhone || null,
              orderId,
              spendAmount: totalAmount,
              userId: user?.id || null,
            });
          } catch {
            /* optional */
          }

          try {
            const { pushAppNotification } = await import(
              '@/modules/ops/services/notificationService'
            );
            if (!tableId) {
              await pushAppNotification({
                outletId,
                kind: 'new_order',
                title: 'New kitchen order',
                body: `#${String(orderId).slice(0, 8)} · ${cartSnapshot.length} item(s)`,
                entityType: 'pos_order',
                entityId: orderId,
              });
            }
          } catch {
            /* optional */
          }
        }
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
        serviceCharge: 0,
        orderNotes: '',
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
    } finally {
      releaseCheckoutLock(idempotencyKey);
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
        serviceCharge: 0,
        orderNotes: '',
        tenderedAmount: '',
      });
      return;
    }

    const { user } = useAuthStore.getState();
    const outletId = cloudOutletId(getTenantOutletId(user)) || cloudOutletId(user?.outletId);
    const totals = calculateOrderTotals(state.cart, state.discountType, state.discountValue);
    const taxAmount = totals.taxAmount;
    const totalAmount = totals.totalAmount;

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

  mergeHeldOrders: async (targetId, sourceId) => {
    if (targetId === sourceId) return;
    const state = get();
    const target = state.heldOrders.find((o) => o.id === targetId);
    const source = state.heldOrders.find((o) => o.id === sourceId);
    if (!target || !source) return;

    const mergedItems = [...target.items];
    for (const line of source.items) {
      const existing = mergedItems.find(
        (i) => i.productId === line.productId && i.price === line.price
      );
      if (existing) existing.quantity += line.quantity;
      else mergedItems.push({ ...line });
    }
    const total = mergedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    try {
      await supabase.from('pos_order_items').delete().eq('order_id', targetId);
      await supabase.from('pos_order_items').insert(
        mergedItems.map((item) => ({
          order_id: targetId,
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        }))
      );
      await supabase
        .from('pos_orders')
        .update({
          total_amount: total,
          notes: [target.notes, source.notes].filter(Boolean).join(' · ') || 'Merged hold',
        })
        .eq('id', targetId);
      await supabase.from('pos_orders').delete().eq('id', sourceId);
      await state.fetchHeldOrders();
    } catch (error) {
      console.error('Failed to merge held orders:', error);
    }
  },

  transferHeldTable: async (orderId, tableLabel) => {
    const label = tableLabel.trim();
    if (!label) return;
    try {
      await supabase
        .from('pos_orders')
        .update({
          notes: `Table ${label}`,
          customer_name: `Table ${label}`,
          table_number: label,
        })
        .eq('id', orderId);
      await get().fetchHeldOrders();
    } catch (error) {
      console.error('Failed to transfer held order table:', error);
      // Fallback without table_number column
      try {
        await supabase
          .from('pos_orders')
          .update({ notes: `Table ${label}`, customer_name: `Table ${label}` })
          .eq('id', orderId);
        await get().fetchHeldOrders();
      } catch (e2) {
        console.error(e2);
      }
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
