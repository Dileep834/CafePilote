import { getOfflineDB } from '../db/CafePilotsOfflineDB';
import type { LocalOrder, LocalOrderItem, LocalPayment } from '../types/entities';
import {
  createSyncableBase,
  newClientUuid,
  newRetryToken,
  nextTempNumber,
  nowIso,
  parseTempSeq,
} from '../lib/ids';
import { SyncQueueRepository } from './SyncQueueRepository';
import { AuditLogRepository } from './AuditLogRepository';

export type OfflineCheckoutLine = {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
};

export type OfflineCheckoutInput = {
  outletId: string | null;
  companyId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: string;
  tenderedAmount: number;
  changeDue: number;
  tableId?: string | null;
  tableNumber?: string | null;
  orderSource?: string;
  notes?: string | null;
  idempotencyKey: string;
  lines: OfflineCheckoutLine[];
  splitLines?: Array<{ method: string; amount: number; tendered?: number }> | null;
  gatewayReference?: Record<string, unknown> | null;
  actorId?: string | null;
  kitchenStatus?: string;
};

export type OfflineCheckoutResult = {
  order: LocalOrder;
  items: LocalOrderItem[];
  payment: LocalPayment;
  createOrderJobId: string;
  createPaymentJobId: string;
};

async function maxTempSeq(): Promise<number> {
  const orders = await getOfflineDB().orders.toArray();
  return orders.reduce((max, o) => Math.max(max, parseTempSeq(o.temp_order_number)), 0);
}

/**
 * Offline order repository — durable IndexedDB writes.
 * Never deletes PENDING rows. Server mapping retained after sync.
 */
export const OfflineOrderRepository = {
  async findByIdempotencyKey(key: string): Promise<LocalOrder | undefined> {
    return getOfflineDB().orders.where('idempotency_key').equals(key).first();
  },

  async getByLocalId(localId: string): Promise<LocalOrder | undefined> {
    return getOfflineDB().orders.where('local_id').equals(localId).first();
  },

  async listPending(): Promise<LocalOrder[]> {
    return getOfflineDB().orders.where('sync_status').anyOf(['PENDING', 'SYNCING', 'FAILED', 'CONFLICT']).toArray();
  },

  async createPaidOrder(input: OfflineCheckoutInput): Promise<OfflineCheckoutResult> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      const items = await getOfflineDB().order_items.where('order_local_id').equals(existing.local_id).toArray();
      const payment = await getOfflineDB().payments.where('order_local_id').equals(existing.local_id).first();
      if (payment) {
        return {
          order: existing,
          items,
          payment,
          createOrderJobId: '',
          createPaymentJobId: '',
        };
      }
    }

    const db = getOfflineDB();
    const clientUuid = newClientUuid();
    const retryToken = newRetryToken();
    const tempOrder = await nextTempNumber(maxTempSeq);
    const tempInvoice = tempOrder.replace('TMP-', 'TMP-INV-');

    const orderBase = createSyncableBase({ sync_status: 'PENDING' });
    const order: LocalOrder = {
      ...orderBase,
      outlet_id: input.outletId,
      company_id: input.companyId ?? null,
      client_uuid: clientUuid,
      retry_token: retryToken,
      temp_order_number: tempOrder,
      temp_invoice_number: tempInvoice,
      server_order_number: null,
      customer_name: input.customerName ?? null,
      customer_phone: input.customerPhone ?? null,
      total_amount: input.totalAmount,
      tax_amount: input.taxAmount,
      discount_amount: input.discountAmount,
      payment_method: input.paymentMethod,
      tendered_amount: input.tenderedAmount,
      change_due: input.changeDue,
      status: 'completed',
      kitchen_status: input.kitchenStatus || (input.tableId ? 'delivered' : 'pending'),
      table_id: input.tableId ?? null,
      table_number: input.tableNumber ?? null,
      order_source: input.orderSource || 'pos',
      notes: input.notes ?? null,
      idempotency_key: input.idempotencyKey,
      payload: {
        printedReceiptOrderNumber: tempOrder,
        printedInvoiceNumber: tempInvoice,
      },
    };

    const items: LocalOrderItem[] = input.lines.map((line) => ({
      ...createSyncableBase({ sync_status: 'PENDING' }),
      order_local_id: order.local_id,
      order_server_id: null,
      product_id: line.productId,
      product_name: line.notes ? `${line.name} (${line.notes})` : line.name,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      total_price: line.unitPrice * line.quantity,
      notes: line.notes ?? null,
    }));

    const payment: LocalPayment = {
      ...createSyncableBase({ sync_status: 'PENDING' }),
      order_local_id: order.local_id,
      order_server_id: null,
      client_uuid: newClientUuid(),
      retry_token: newRetryToken(),
      method: input.paymentMethod,
      amount: input.totalAmount,
      tendered: input.tenderedAmount,
      status: 'succeeded',
      split_lines: input.splitLines ?? null,
      gateway_reference: input.gatewayReference ?? null,
    };

    await db.transaction('rw', db.orders, db.order_items, db.payments, db.sync_queue, db.audit_logs, async () => {
      await db.orders.put(order);
      await db.order_items.bulkPut(items);
      await db.payments.put(payment);
    });

    const orderJob = await SyncQueueRepository.enqueue({
      job_type: 'CreateOrder',
      entity_local_id: order.local_id,
      entity_table: 'orders',
      client_uuid: clientUuid,
      retry_token: retryToken,
      payload: {
        orderLocalId: order.local_id,
        idempotencyKey: input.idempotencyKey,
        clientUuid,
        retryToken,
      },
      priority: 10,
    });

    const paymentJob = await SyncQueueRepository.enqueue({
      job_type: 'CreatePayment',
      entity_local_id: payment.local_id,
      entity_table: 'payments',
      depends_on: [orderJob.id],
      payload: {
        paymentLocalId: payment.local_id,
        orderLocalId: order.local_id,
      },
      priority: 20,
    });

    await AuditLogRepository.write({
      event_type: 'OfflineCheckout',
      message: `Offline order ${tempOrder} saved locally`,
      actor_id: input.actorId,
      outlet_id: input.outletId,
      meta: { orderLocalId: order.local_id, clientUuid, total: input.totalAmount },
    });

    return {
      order,
      items,
      payment,
      createOrderJobId: orderJob.id,
      createPaymentJobId: paymentJob.id,
    };
  },

  async markSynced(localId: string, serverId: string, serverOrderNumber: string | null): Promise<void> {
    const db = getOfflineDB();
    const order = await this.getByLocalId(localId);
    if (!order) return;
    // Keep local history forever; only update mapping + status.
    await db.orders.put({
      ...order,
      server_id: serverId,
      server_order_number: serverOrderNumber,
      sync_status: 'SYNCED',
      updated_at: nowIso(),
      version: order.version + 1,
      payload: {
        ...order.payload,
        // Printed receipt numbers NEVER change
        printedReceiptOrderNumber: order.payload.printedReceiptOrderNumber || order.temp_order_number,
        printedInvoiceNumber: order.payload.printedInvoiceNumber || order.temp_invoice_number,
        serverOrderNumber,
      },
    });
    const items = await db.order_items.where('order_local_id').equals(localId).toArray();
    for (const item of items) {
      await db.order_items.put({
        ...item,
        order_server_id: serverId,
        sync_status: 'SYNCED',
        updated_at: nowIso(),
        version: item.version + 1,
      });
    }
  },

  async markConflict(localId: string, reason: string): Promise<void> {
    const db = getOfflineDB();
    const order = await this.getByLocalId(localId);
    if (!order) return;
    await db.orders.put({
      ...order,
      sync_status: 'CONFLICT',
      updated_at: nowIso(),
      version: order.version + 1,
      payload: { ...order.payload, conflictReason: reason },
    });
  },
};
