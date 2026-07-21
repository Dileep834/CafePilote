/** CafePilots Enterprise Offline POS — public module API */

export { CafePilotsOfflineDB, getOfflineDB, resetOfflineDBForTests, clearOfflineDB } from './db/CafePilotsOfflineDB';
export * from './types/entities';
export { bootstrapOfflinePos } from './bootstrap';

export { ConnectivityService, useConnectivityStore } from './services/ConnectivityService';
export { OrderService } from './services/OrderService';
export { PaymentService } from './services/PaymentService';
export { InventoryService } from './services/InventoryService';
export { KitchenService } from './services/KitchenService';
export { SyncService } from './services/SyncService';
export { ConflictResolver } from './services/ConflictResolver';
export { CacheService } from './services/CacheService';

export { OfflineOrderRepository } from './repositories/OfflineOrderRepository';
export { OnlineOrderRepository } from './repositories/OnlineOrderRepository';
export { SyncQueueRepository } from './repositories/SyncQueueRepository';
export { AuditLogRepository } from './repositories/AuditLogRepository';
export {
  OfflineInventoryRepository,
  OfflineKitchenRepository,
} from './repositories/OfflineInventoryRepository';

export {
  getOfflineCapability,
  isOfflineBillingAllowed,
  isFullOfflineAllowed,
  resolveOfflinePaymentPolicy,
} from './lib/capabilities';
export { RETRY_DELAYS_MS, nextRetryAt, nextTempNumber } from './lib/ids';
