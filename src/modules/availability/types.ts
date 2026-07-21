export type AvailabilityMode =
  | 'manual'
  | 'always_available'
  | 'show_oos'
  | 'hide'
  | 'move_category'
  | 'warn_sale';

export type InventoryEnforcementMode = 'track' | 'warn' | 'strict';

export type ProductAvailabilityStatus =
  | 'available'
  | 'low_stock'
  | 'out_of_stock'
  | 'hidden'
  | 'inactive'
  | 'discontinued'
  | 'seasonal';

export type ManualAvailabilityStatus =
  | 'available'
  | 'out_of_stock'
  | 'hidden'
  | 'seasonal'
  | 'discontinued';

export type AvailabilityChannel =
  | 'pos'
  | 'qr'
  | 'website'
  | 'swiggy'
  | 'zomato'
  | 'ondc'
  | 'whatsapp'
  | 'api'
  | 'kitchen';

export type ChannelVisibilityMode =
  | 'inherit'
  | 'show'
  | 'hide'
  | 'oos_badge'
  | 'unavailable_api';

export type ProductAvailabilityPolicy = {
  outletId: string;
  inventoryTrackingEnabled: boolean;
  availabilityMode: AvailabilityMode;
  inventoryEnforcement: InventoryEnforcementMode;
  lowStockThresholdPct: number;
  lowStockServings: number;
  outOfStockCategoryId?: string | null;
  autoMarkUnavailable: boolean;
  autoRestore: boolean;
  autoNotify: boolean;
  autoSync: boolean;
  autoCategoryMove: boolean;
  warnSaleRequiresPin: boolean;
};

export type ProductOutletAvailability = {
  outletId: string;
  productId: string;
  computedStatus: ProductAvailabilityStatus;
  manualStatus?: ManualAvailabilityStatus | null;
  manualReason?: string | null;
  manualUntil?: string | null;
  manualBy?: string | null;
  availableServings?: number | null;
  lowStockAt?: number | null;
  effectiveStatus: ProductAvailabilityStatus;
  updatedAt?: string | null;
};

export type ProductAvailabilityLogEntry = {
  id?: string;
  outletId: string;
  productId: string;
  oldStatus?: string | null;
  newStatus: string;
  reason?: string | null;
  source:
    | 'automatic'
    | 'manual'
    | 'sale'
    | 'refund'
    | 'purchase'
    | 'adjustment'
    | 'transfer'
    | 'waste'
    | 'recipe_update'
    | 'opening'
    | 'sync'
    | 'system';
  channel?: AvailabilityChannel | null;
  userId?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: string;
};

export type ResolvedAvailability = {
  productId: string;
  status: ProductAvailabilityStatus;
  source: 'manual' | 'inventory' | 'product' | 'policy';
  canShow: boolean;
  canSell: boolean;
  badge: string;
  reason?: string;
  requireManagerApproval?: boolean;
  availableServings?: number | null;
};

export const DEFAULT_PRODUCT_AVAILABILITY_POLICY: Omit<ProductAvailabilityPolicy, 'outletId'> = {
  inventoryTrackingEnabled: false,
  availabilityMode: 'manual',
  inventoryEnforcement: 'strict',
  lowStockThresholdPct: 15,
  lowStockServings: 3,
  outOfStockCategoryId: null,
  autoMarkUnavailable: true,
  autoRestore: true,
  autoNotify: true,
  autoSync: false,
  autoCategoryMove: false,
  warnSaleRequiresPin: false,
};
