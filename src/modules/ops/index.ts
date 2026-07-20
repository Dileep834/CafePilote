export type * from './types';
export { REFUND_REASON_LABELS, DEFAULT_OPS_SETTINGS } from './types';
export * from './lib/validators';
export { writeAuditLog, fetchAuditLogs } from './services/auditService';
export {
  verifyManagerPin,
  setManagerPin,
  loadOpsSettings,
  saveOpsSettings,
} from './services/managerPinService';
export {
  checkInventoryForSale,
  deductInventoryForSale,
  restoreInventoryForRefund,
} from './services/recipeDeductionService';
export {
  createOrGetPaymentIntent,
  completePaymentIntent,
  acquireCheckoutLock,
  releaseCheckoutLock,
} from './services/paymentIntentService';
export {
  openShift,
  closeShift,
  getOpenShift,
  attachSaleToOpenShift,
  getTerminalId,
} from './services/shiftService';
export { processRefund, listRefunds } from './services/refundService';
export { ManagerPinDialog } from './components/ManagerPinDialog';
export { RefundDialog } from './components/RefundDialog';
export { NotificationCenter } from './components/NotificationCenter';
export { ShiftManagementPage } from './pages/ShiftManagementPage';
export { AuditLogsPage, RefundsPage } from './pages/OpsPages';

// Phase 2
export {
  recordLifecycleTransition,
  transitionOrder,
  kitchenToLifecycle,
  lifecycleToKitchen,
} from './services/orderLifecycleService';
export {
  pushAppNotification,
  requestDesktopNotificationPermission,
  useNotificationStore,
} from './services/notificationService';
export { fetchLowStockItems, notifyLowStock } from './services/inventoryAutomationService';
export { createGrn, createPurchaseReturn } from './services/purchaseAdvancedService';
export { earnLoyaltyPoints, pointsForSpend } from './services/loyaltyService';
