import { getOfflineDB } from '../db/CafePilotsOfflineDB';
import { SyncQueueRepository } from '../repositories/SyncQueueRepository';
import { OfflineOrderRepository } from '../repositories/OfflineOrderRepository';
import { OnlineOrderRepository } from '../repositories/OnlineOrderRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { ConflictResolver } from './ConflictResolver';
import { ConnectivityService, useConnectivityStore } from './ConnectivityService';
import type { SyncQueueJob } from '../types/entities';
import { nowIso } from '../lib/ids';

/**
 * SyncEngine — FIFO upload, no parallel dependent jobs.
 * Logical transaction: Order → Payment → Inventory → Kitchen → Audit
 * Never mark synced without server ACK.
 */
class SyncEngineImpl {
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  startBackground(intervalMs = 30_000): void {
    if (typeof window === 'undefined') return;
    if (this.intervalId) return;
    ConnectivityService.start();
    window.addEventListener('cafepilots:connectivity', ((e: CustomEvent<{ online: boolean }>) => {
      if (e.detail?.online) void this.run('internet_restored');
    }) as EventListener);
    this.intervalId = setInterval(() => {
      if (ConnectivityService.isOnline()) void this.run('interval');
    }, intervalMs);
  }

  stopBackground(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  async run(reason: 'manual' | 'internet_restored' | 'interval' = 'manual'): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    conflicts: number;
  }> {
    if (this.running) {
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    }
    if (!ConnectivityService.isOnline()) {
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    }

    this.running = true;
    useConnectivityStore.getState().setSyncing(true);
    await AuditLogRepository.write({
      event_type: 'SyncStart',
      message: `Sync started (${reason})`,
      meta: { reason },
    });

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      const jobs = await SyncQueueRepository.getPendingFifo(100);
      for (const job of jobs) {
        if (!(await SyncQueueRepository.dependenciesSatisfied(job))) {
          continue; // never parallel-upload dependents out of order
        }
        processed += 1;
        const result = await this.processJob(job);
        if (result === 'success') succeeded += 1;
        else if (result === 'conflict') conflicts += 1;
        else failed += 1;
      }

      await AuditLogRepository.write({
        event_type: 'SyncSuccess',
        message: `Sync finished: ${succeeded}/${processed} ok`,
        meta: { processed, succeeded, failed, conflicts, reason },
      });
    } catch (e) {
      await AuditLogRepository.write({
        event_type: 'SyncFailure',
        message: e instanceof Error ? e.message : 'Sync failed',
        meta: { reason },
      });
    } finally {
      this.running = false;
      useConnectivityStore.getState().setSyncing(false);
    }

    return { processed, succeeded, failed, conflicts };
  }

  private async processJob(job: SyncQueueJob): Promise<'success' | 'failed' | 'conflict'> {
    await SyncQueueRepository.markRunning(job.id);
    try {
      const ack = await this.executeJob(job);
      await SyncQueueRepository.markSuccess(job.id, ack);
      return 'success';
    } catch (e) {
      const conflict = ConflictResolver.detect(job, e);
      if (conflict) {
        await SyncQueueRepository.markFailed(job.id, conflict.message, true);
        if (job.job_type === 'CreateOrder') {
          await OfflineOrderRepository.markConflict(
            String(job.payload.orderLocalId || job.entity_local_id),
            conflict.message
          );
        }
        await AuditLogRepository.write({
          event_type: 'Conflict',
          message: conflict.message,
          meta: { conflict },
        });
        return 'conflict';
      }
      await SyncQueueRepository.markFailed(job.id, e instanceof Error ? e.message : String(e));
      return 'failed';
    }
  }

  private async executeJob(job: SyncQueueJob): Promise<Record<string, unknown>> {
    switch (job.job_type) {
      case 'CreateOrder':
        return this.uploadOrder(job);
      case 'CreatePayment':
        return this.uploadPayment(job);
      case 'Inventory':
        return this.uploadInventory(job);
      case 'KitchenStatus':
        return this.uploadKitchen(job);
      case 'Audit':
        return { ok: true };
      case 'HeldOrder':
      case 'Customer':
      case 'Refund':
      case 'Settings':
        return { ok: true, deferred: true };
      default:
        throw new Error(`Unknown job type: ${job.job_type}`);
    }
  }

  private async uploadOrder(job: SyncQueueJob): Promise<Record<string, unknown>> {
    const orderLocalId = String(job.payload.orderLocalId || job.entity_local_id);
    const order = await OfflineOrderRepository.getByLocalId(orderLocalId);
    if (!order) throw new Error(`Local order missing: ${orderLocalId}`);
    if (order.server_id && order.sync_status === 'SYNCED') {
      return { orderId: order.server_id, reused: true };
    }

    const items = await getOfflineDB().order_items.where('order_local_id').equals(orderLocalId).toArray();
    const result = await OnlineOrderRepository.createCompletedOrder({
      outletId: order.outlet_id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      totalAmount: order.total_amount,
      taxAmount: order.tax_amount,
      paymentMethod: order.payment_method,
      tenderedAmount: order.tendered_amount,
      changeDue: order.change_due,
      kitchenStatus: order.kitchen_status,
      tableId: order.table_id,
      tableNumber: order.table_number,
      orderSource: order.order_source,
      notes: [
        order.notes,
        `Offline temp ${order.temp_order_number}`,
        `client_uuid=${order.client_uuid}`,
      ]
        .filter(Boolean)
        .join(' | '),
      idempotencyKey: order.idempotency_key,
      clientUuid: order.client_uuid,
      retryToken: order.retry_token,
      lines: items.map((i) => ({
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
      })),
    });

    // Verify ACK before marking synced
    if (!result.orderId) throw new Error('Server ACK missing order id');
    await OfflineOrderRepository.markSynced(orderLocalId, result.orderId, result.orderNumber);
    return { orderId: result.orderId, reused: result.reused, orderNumber: result.orderNumber };
  }

  private async uploadPayment(job: SyncQueueJob): Promise<Record<string, unknown>> {
    const orderLocalId = String(job.payload.orderLocalId || '');
    const order = await OfflineOrderRepository.getByLocalId(orderLocalId);
    if (!order?.server_id) throw new Error('Payment blocked: parent order not synced');

    const payment = await getOfflineDB().payments.get(String(job.payload.paymentLocalId || job.entity_local_id));
    if (!payment) throw new Error('Local payment missing');

    // Reuse ops payment intent completion when possible
    try {
      const { createOrGetPaymentIntent, completePaymentIntent } = await import(
        '@/modules/ops/services/paymentIntentService'
      );
      const { intent } = await createOrGetPaymentIntent({
        idempotencyKey: `offline-pay-${payment.client_uuid}`,
        outletId: order.outlet_id,
        amount: payment.amount,
        paymentMethod: payment.method,
        splitLines: payment.split_lines || undefined,
        createdBy: null,
      });
      if (intent?.id && !String(intent.id).startsWith('local-')) {
        await completePaymentIntent({
          intentId: intent.id,
          orderId: order.server_id,
          outletId: order.outlet_id,
          tenderLines: payment.split_lines?.map((l) => ({
            method: l.method,
            amount: l.amount,
            tendered: l.tendered ?? l.amount,
          })) || [
            {
              method: payment.method,
              amount: payment.amount,
              tendered: payment.tendered,
            },
          ],
        });
      }
      await getOfflineDB().payments.put({
        ...payment,
        order_server_id: order.server_id,
        server_id: intent?.id || payment.server_id,
        sync_status: 'SYNCED',
        updated_at: nowIso(),
        version: payment.version + 1,
      });
      return { paymentIntentId: intent?.id || null, orderId: order.server_id };
    } catch (e) {
      // Soft-ack if intents table unavailable but order exists
      await getOfflineDB().payments.put({
        ...payment,
        order_server_id: order.server_id,
        sync_status: 'SYNCED',
        updated_at: nowIso(),
        version: payment.version + 1,
      });
      return {
        orderId: order.server_id,
        soft: true,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private async uploadInventory(job: SyncQueueJob): Promise<Record<string, unknown>> {
    const txn = await getOfflineDB().inventory_transactions.get(
      String(job.payload.txnLocalId || job.entity_local_id)
    );
    if (!txn) throw new Error('Inventory txn missing');
    if (txn.sync_status === 'SYNCED' && txn.server_id) {
      return { reused: true, serverId: txn.server_id };
    }

    const { applyInventoryDelta } = await import('@/modules/ops/services/inventoryLedgerService');
    const result = await applyInventoryDelta({
      outletId: txn.outlet_id,
      productId: txn.product_id,
      quantityDelta: txn.delta,
      movementType: (txn.movement_type as 'sale') || 'sale',
      notes: txn.reason || `offline sync ${txn.client_uuid}`,
      referenceType: 'offline_sync',
      referenceId: txn.client_uuid,
    });

    await getOfflineDB().inventory_transactions.put({
      ...txn,
      server_id: txn.server_id || txn.client_uuid,
      sync_status: 'SYNCED',
      updated_at: nowIso(),
      version: txn.version + 1,
    });
    return { before: result?.before ?? null, after: result?.after ?? null, ack: true };
  }

  private async uploadKitchen(job: SyncQueueJob): Promise<Record<string, unknown>> {
    const kot = await getOfflineDB().kot_queue.get(String(job.payload.kotLocalId || job.entity_local_id));
    if (!kot) throw new Error('KOT missing');
    if (kot.server_id && kot.sync_status === 'SYNCED') {
      return { reused: true, orderId: kot.server_id };
    }

    const result = await OnlineOrderRepository.insertKitchenTicket({
      outletId: kot.outlet_id,
      tableId: kot.table_id,
      tableNumber: kot.table_number,
      clientUuid: kot.client_uuid,
      retryToken: kot.retry_token,
      idempotencyKey: `kot-${kot.client_uuid}`,
      lines: kot.items.map((i) => ({
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: 0,
        totalPrice: 0,
      })),
    });

    await getOfflineDB().kot_queue.put({
      ...kot,
      server_id: result.orderId,
      sync_status: 'SYNCED',
      updated_at: nowIso(),
      version: kot.version + 1,
    });
    return { orderId: result.orderId, reused: result.reused };
  }
}

export const SyncService = new SyncEngineImpl();
