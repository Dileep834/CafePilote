/** CafePilots Phase 1 — shared ops types */

export type InventoryMovementType =
  | 'opening'
  | 'purchase'
  | 'adjustment'
  | 'sale'
  | 'refund'
  | 'waste'
  | 'transfer_in'
  | 'transfer_out';

export type PaymentIntentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type RefundType = 'full' | 'partial' | 'item';

export type RefundReasonCode =
  | 'customer_cancelled'
  | 'food_quality'
  | 'duplicate_order'
  | 'wrong_item'
  | 'system_error'
  | 'other';

export const REFUND_REASON_LABELS: Record<RefundReasonCode, string> = {
  customer_cancelled: 'Customer Cancelled',
  food_quality: 'Food Quality',
  duplicate_order: 'Duplicate Order',
  wrong_item: 'Wrong Item',
  system_error: 'System Error',
  other: 'Other',
};

export type ShiftTxnType =
  | 'sale'
  | 'refund'
  | 'cash_in'
  | 'cash_out'
  | 'expense'
  | 'petty_cash'
  | 'adjustment';

export type AuditAction =
  | 'discount'
  | 'delete'
  | 'refund'
  | 'void'
  | 'price_change'
  | 'recipe_change'
  | 'stock_adjustment'
  | 'purchase_edit'
  | 'table_merge'
  | 'table_transfer'
  | 'login'
  | 'logout'
  | 'permissions'
  | 'payment'
  | 'shift_open'
  | 'shift_close'
  | 'manager_override'
  | 'checkout';

export type SaleLineInput = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export type DeductionLine = {
  productId: string;
  productName: string;
  quantity: number;
  fromProductId: string;
  fromProductName: string;
};

export type OutletOpsSettings = {
  outletId: string;
  inventoryTrackingEnabled: boolean;
  allowNegativeStock: boolean;
  discountPinThresholdPct: number;
  managerPinConfigured: boolean;
};

export const DEFAULT_OPS_SETTINGS: Omit<OutletOpsSettings, 'outletId'> = {
  inventoryTrackingEnabled: true,
  allowNegativeStock: false,
  discountPinThresholdPct: 10,
  managerPinConfigured: false,
};

export type SplitTenderLine = {
  method: string;
  amount: number;
  tendered?: number;
};

export type PaymentValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };
