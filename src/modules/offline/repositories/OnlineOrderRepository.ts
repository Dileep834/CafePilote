import { supabase } from '@/lib/supabase';

/**
 * Online order repository — single place for Supabase POS order writes.
 * Sync engine and live online checkout both reuse this (no duplicated insert logic).
 */
export type OnlineOrderWriteInput = {
  outletId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  tenderedAmount: number;
  changeDue: number;
  status?: string;
  kitchenStatus: string;
  tableId?: string | null;
  tableNumber?: string | null;
  orderSource?: string;
  notes?: string | null;
  idempotencyKey: string;
  paymentIntentId?: string | null;
  /** Client UUID for server-side idempotency / duplicate rejection */
  clientUuid: string;
  retryToken: string;
  lines: Array<{
    productId: string | null;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

export type OnlineOrderWriteResult = {
  orderId: string;
  reused: boolean;
  orderNumber: string | null;
  raw: Record<string, unknown>;
};

export const OnlineOrderRepository = {
  async createCompletedOrder(input: OnlineOrderWriteInput): Promise<OnlineOrderWriteResult> {
    const fullRow = {
      outlet_id: input.outletId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      total_amount: input.totalAmount,
      tax_amount: input.taxAmount,
      payment_method: input.paymentMethod,
      tendered_amount: input.tenderedAmount,
      change_due: input.changeDue,
      status: input.status || 'completed',
      kitchen_status: input.kitchenStatus,
      table_id: input.tableId || null,
      table_number: input.tableNumber || null,
      order_source: input.orderSource || 'pos',
      notes: input.notes,
      idempotency_key: input.idempotencyKey,
      payment_intent_id:
        input.paymentIntentId && !String(input.paymentIntentId).startsWith('local-')
          ? input.paymentIntentId
          : null,
      client_uuid: input.clientUuid,
      retry_token: input.retryToken,
    };

    const legacyRow = {
      outlet_id: input.outletId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      total_amount: input.totalAmount,
      tax_amount: input.taxAmount,
      payment_method: input.paymentMethod,
      tendered_amount: input.tenderedAmount,
      change_due: input.changeDue,
      status: input.status || 'completed',
      kitchen_status: input.kitchenStatus,
      notes: input.notes,
    };

    let { data: orderData, error: orderError } = await supabase
      .from('pos_orders')
      .insert([fullRow])
      .select()
      .single();

    if (orderError) {
      if (orderError.code === '23505' && input.idempotencyKey) {
        const { data: existing } = await supabase
          .from('pos_orders')
          .select('*')
          .eq('idempotency_key', input.idempotencyKey)
          .maybeSingle();
        if (existing) {
          return {
            orderId: existing.id,
            reused: true,
            orderNumber: existing.order_number || existing.invoice_number || null,
            raw: existing as Record<string, unknown>,
          };
        }
        // Also try client_uuid uniqueness if present
        const { data: byClient } = await supabase
          .from('pos_orders')
          .select('*')
          .eq('client_uuid', input.clientUuid)
          .maybeSingle();
        if (byClient) {
          return {
            orderId: byClient.id,
            reused: true,
            orderNumber: byClient.order_number || byClient.invoice_number || null,
            raw: byClient as Record<string, unknown>,
          };
        }
      }

      // Schema may not yet have client_uuid / retry_token — fall back
      ({ data: orderData, error: orderError } = await supabase
        .from('pos_orders')
        .insert([
          {
            ...legacyRow,
            table_id: input.tableId || null,
            table_number: input.tableNumber || null,
            order_source: input.orderSource || 'pos',
            idempotency_key: input.idempotencyKey,
          },
        ])
        .select()
        .single());

      if (orderError) {
        ({ data: orderData, error: orderError } = await supabase
          .from('pos_orders')
          .insert([legacyRow])
          .select()
          .single());
      }
    }

    if (orderError) throw orderError;
    if (!orderData?.id) throw new Error('Order insert returned no id');

    const { count } = await supabase
      .from('pos_order_items')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderData.id);

    if (!count) {
      const orderItems = input.lines.map((item) => ({
        order_id: orderData.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
      }));
      const { error: itemsError } = await supabase.from('pos_order_items').insert(orderItems);
      if (itemsError) throw itemsError;
    }

    return {
      orderId: orderData.id,
      reused: false,
      orderNumber: orderData.order_number || orderData.invoice_number || null,
      raw: orderData as Record<string, unknown>,
    };
  },

  async insertKitchenTicket(input: {
    outletId: string | null;
    tableId?: string | null;
    tableNumber?: string | null;
    customerName?: string | null;
    notes?: string | null;
    clientUuid: string;
    retryToken: string;
    idempotencyKey: string;
    lines: Array<{
      productId: string | null;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }): Promise<{ orderId: string; reused: boolean }> {
    const row = {
      outlet_id: input.outletId,
      customer_name: input.customerName || (input.tableNumber ? `Table ${input.tableNumber}` : null),
      total_amount: input.lines.reduce((s, l) => s + l.totalPrice, 0),
      tax_amount: 0,
      payment_method: null,
      status: 'sent',
      kitchen_status: 'pending',
      table_id: input.tableId || null,
      table_number: input.tableNumber || null,
      order_source: 'pos',
      notes: input.notes || null,
      idempotency_key: input.idempotencyKey,
      client_uuid: input.clientUuid,
      retry_token: input.retryToken,
    };

    let { data, error } = await supabase.from('pos_orders').insert([row]).select().single();
    if (error?.code === '23505') {
      const { data: existing } = await supabase
        .from('pos_orders')
        .select('id')
        .eq('idempotency_key', input.idempotencyKey)
        .maybeSingle();
      if (existing) return { orderId: existing.id, reused: true };
    }
    if (error) {
      const { client_uuid: _c, retry_token: _r, ...legacy } = row;
      ({ data, error } = await supabase.from('pos_orders').insert([legacy]).select().single());
    }
    if (error) throw error;

    const items = input.lines.map((l) => ({
      order_id: data.id,
      product_id: l.productId,
      product_name: l.productName,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      total_price: l.totalPrice,
    }));
    const { error: itemsError } = await supabase.from('pos_order_items').insert(items);
    if (itemsError) throw itemsError;
    return { orderId: data.id, reused: false };
  },
};
