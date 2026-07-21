import { getOfflineDB } from '../db/CafePilotsOfflineDB';
import type { LocalInventoryTxn, LocalKotQueueItem } from '../types/entities';
import { createSyncableBase, newClientUuid, newRetryToken, nowIso } from '../lib/ids';
import { SyncQueueRepository } from './SyncQueueRepository';
import { AuditLogRepository } from './AuditLogRepository';

const INV_SNAPSHOT_KEY = 'inventory_snapshot';

export type LocalStockMap = Record<string, number>;

export const OfflineInventoryRepository = {
  async getSnapshot(outletId: string): Promise<LocalStockMap> {
    const row = await getOfflineDB()
      .settings_cache.where('cache_key')
      .equals(`${INV_SNAPSHOT_KEY}:${outletId}`)
      .first();
    return (row?.value as LocalStockMap) || {};
  },

  async putSnapshot(outletId: string, map: LocalStockMap): Promise<void> {
    const existing = await getOfflineDB()
      .settings_cache.where('cache_key')
      .equals(`${INV_SNAPSHOT_KEY}:${outletId}`)
      .first();
    const base = existing || createSyncableBase({ sync_status: 'SYNCED' });
    await getOfflineDB().settings_cache.put({
      ...base,
      cache_key: `${INV_SNAPSHOT_KEY}:${outletId}`,
      value: map,
      outlet_id: outletId,
      updated_at: nowIso(),
      version: (existing?.version || 0) + 1,
      sync_status: 'SYNCED',
    });
  },

  async applyLocalDelta(input: {
    outletId: string;
    productId: string;
    delta: number;
    movementType: string;
    orderLocalId?: string | null;
    reason?: string | null;
    strict?: boolean;
  }): Promise<{ ok: boolean; message?: string; txn?: LocalInventoryTxn }> {
    const snap = await this.getSnapshot(input.outletId);
    const current = snap[input.productId] ?? 0;
    const next = current + input.delta;
    if (input.strict && next < 0) {
      return { ok: false, message: `Insufficient local stock for ${input.productId}` };
    }
    snap[input.productId] = next;
    await this.putSnapshot(input.outletId, snap);

    const txn: LocalInventoryTxn = {
      ...createSyncableBase({ sync_status: 'PENDING' }),
      outlet_id: input.outletId,
      product_id: input.productId,
      delta: input.delta,
      movement_type: input.movementType,
      order_local_id: input.orderLocalId ?? null,
      client_uuid: newClientUuid(),
      retry_token: newRetryToken(),
      reason: input.reason ?? null,
    };
    await getOfflineDB().inventory_transactions.put(txn);

    const invJob = await SyncQueueRepository.enqueue({
      job_type: 'Inventory',
      entity_local_id: txn.local_id,
      entity_table: 'inventory_transactions',
      client_uuid: txn.client_uuid,
      retry_token: txn.retry_token,
      payload: { txnLocalId: txn.local_id },
      priority: 30,
    });

    await AuditLogRepository.write({
      event_type: 'OfflineInventory',
      message: `Local inventory ${input.delta} for ${input.productId}`,
      outlet_id: input.outletId,
      meta: { txnLocalId: txn.local_id, syncJobId: invJob.id },
    });

    return { ok: true, txn };
  },
};

export const OfflineKitchenRepository = {
  async enqueueKot(input: {
    outletId: string | null;
    orderLocalId: string;
    tableId?: string | null;
    tableNumber?: string | null;
    items: LocalKotQueueItem['items'];
  }): Promise<LocalKotQueueItem> {
    const row: LocalKotQueueItem = {
      ...createSyncableBase({ sync_status: 'PENDING' }),
      outlet_id: input.outletId,
      order_local_id: input.orderLocalId,
      table_id: input.tableId ?? null,
      table_number: input.tableNumber ?? null,
      kitchen_status: 'pending',
      printed: false,
      items: input.items,
      client_uuid: newClientUuid(),
      retry_token: newRetryToken(),
    };
    await getOfflineDB().kot_queue.put(row);

    await SyncQueueRepository.enqueue({
      job_type: 'KitchenStatus',
      entity_local_id: row.local_id,
      entity_table: 'kot_queue',
      client_uuid: row.client_uuid,
      retry_token: row.retry_token,
      payload: { kotLocalId: row.local_id },
      priority: 15,
    });

    await AuditLogRepository.write({
      event_type: 'OfflineKot',
      message: `Offline KOT queued for order ${input.orderLocalId}`,
      outlet_id: input.outletId,
      meta: { kotLocalId: row.local_id },
    });

    return row;
  },

  async markPrinted(localId: string): Promise<void> {
    const db = getOfflineDB();
    const row = await db.kot_queue.get(localId);
    if (!row) return;
    await db.kot_queue.put({ ...row, printed: true, updated_at: nowIso(), version: row.version + 1 });
  },

  async listPending(): Promise<LocalKotQueueItem[]> {
    return getOfflineDB().kot_queue.where('sync_status').anyOf(['PENDING', 'SYNCING', 'FAILED']).toArray();
  },
};
