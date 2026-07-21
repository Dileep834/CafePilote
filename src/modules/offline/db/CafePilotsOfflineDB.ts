import Dexie, { type Table } from 'dexie';
import type {
  LocalAuditLog,
  LocalCustomer,
  LocalHeldOrder,
  LocalInventoryTxn,
  LocalKotQueueItem,
  LocalOrder,
  LocalOrderItem,
  LocalPayment,
  ProductsCacheRow,
  RecipesCacheRow,
  SettingsCacheRow,
  SyncQueueJob,
  TaxCacheRow,
} from '../types/entities';

/**
 * CafePilotsOfflineDB — IndexedDB via Dexie.
 * Transactional POS data MUST live here (never localStorage).
 */
export class CafePilotsOfflineDB extends Dexie {
  orders!: Table<LocalOrder, string>;
  order_items!: Table<LocalOrderItem, string>;
  payments!: Table<LocalPayment, string>;
  inventory_transactions!: Table<LocalInventoryTxn, string>;
  kot_queue!: Table<LocalKotQueueItem, string>;
  held_orders!: Table<LocalHeldOrder, string>;
  customers!: Table<LocalCustomer, string>;
  sync_queue!: Table<SyncQueueJob, string>;
  audit_logs!: Table<LocalAuditLog, string>;
  settings_cache!: Table<SettingsCacheRow, string>;
  products_cache!: Table<ProductsCacheRow, string>;
  recipes_cache!: Table<RecipesCacheRow, string>;
  tax_cache!: Table<TaxCacheRow, string>;

  constructor(name = 'CafePilotsOfflineDB') {
    super(name);

    this.version(1).stores({
      orders:
        'id, local_id, server_id, sync_status, client_uuid, idempotency_key, temp_order_number, outlet_id, created_at, updated_at',
      order_items: 'id, local_id, order_local_id, sync_status, product_id, created_at',
      payments: 'id, local_id, order_local_id, sync_status, client_uuid, created_at',
      inventory_transactions:
        'id, local_id, outlet_id, product_id, sync_status, order_local_id, client_uuid, created_at',
      kot_queue: 'id, local_id, order_local_id, sync_status, kitchen_status, outlet_id, created_at',
      held_orders: 'id, local_id, sync_status, outlet_id, created_at',
      customers: 'id, local_id, server_id, sync_status, phone, created_at',
      sync_queue:
        'id, local_id, job_type, state, sync_status, entity_local_id, next_retry_at, created_at, priority',
      audit_logs: 'id, local_id, event_type, outlet_id, created_at',
      settings_cache: 'id, local_id, cache_key, outlet_id, updated_at',
      products_cache: 'id, local_id, product_id, outlet_id, updated_at',
      recipes_cache: 'id, local_id, recipe_id, outlet_id, updated_at',
      tax_cache: 'id, local_id, tax_key, outlet_id, updated_at',
    });
  }
}

let dbSingleton: CafePilotsOfflineDB | null = null;

export function getOfflineDB(): CafePilotsOfflineDB {
  if (!dbSingleton) {
    dbSingleton = new CafePilotsOfflineDB();
  }
  return dbSingleton;
}

/** Test helper — replaces singleton with an isolated DB name. */
export function resetOfflineDBForTests(name?: string): CafePilotsOfflineDB {
  if (dbSingleton) {
    dbSingleton.close();
    dbSingleton = null;
  }
  dbSingleton = new CafePilotsOfflineDB(name || `CafePilotsOfflineDB_test_${Date.now()}`);
  return dbSingleton;
}

export async function clearOfflineDB(): Promise<void> {
  const db = getOfflineDB();
  await Promise.all(db.tables.map((t) => t.clear()));
}
