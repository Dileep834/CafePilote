/** Shared offline entity contracts for CafePilots Offline POS. */

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export type SyncJobType =
  | 'CreateOrder'
  | 'CreatePayment'
  | 'Inventory'
  | 'Refund'
  | 'Customer'
  | 'HeldOrder'
  | 'KitchenStatus'
  | 'Settings'
  | 'Audit';

export type SyncJobState =
  | 'Pending'
  | 'Running'
  | 'Success'
  | 'Failed'
  | 'Conflict'
  | 'Retry';

export type ConnectivityState = 'Online' | 'Offline' | 'Poor' | 'Syncing';

export type OfflineCapability = 'online_only' | 'offline_billing' | 'full_offline';

export type PaymentMethodOffline = 'cash' | 'card' | 'upi' | 'split' | 'wallet' | 'other';

/** Every local table row carries these columns. */
export interface SyncableEntity {
  id: string;
  local_id: string;
  server_id: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface LocalOrder extends SyncableEntity {
  outlet_id: string | null;
  company_id: string | null;
  client_uuid: string;
  retry_token: string;
  temp_order_number: string;
  temp_invoice_number: string;
  server_order_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: PaymentMethodOffline | string;
  tendered_amount: number;
  change_due: number;
  status: string;
  kitchen_status: string;
  table_id: string | null;
  table_number: string | null;
  order_source: string;
  notes: string | null;
  idempotency_key: string;
  payload: Record<string, unknown>;
}

export interface LocalOrderItem extends SyncableEntity {
  order_local_id: string;
  order_server_id: string | null;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

export interface LocalPayment extends SyncableEntity {
  order_local_id: string;
  order_server_id: string | null;
  client_uuid: string;
  retry_token: string;
  method: string;
  amount: number;
  tendered: number;
  status: string;
  split_lines: Array<{ method: string; amount: number; tendered?: number }> | null;
  gateway_reference: Record<string, unknown> | null;
}

export interface LocalInventoryTxn extends SyncableEntity {
  outlet_id: string;
  product_id: string;
  delta: number;
  movement_type: string;
  order_local_id: string | null;
  client_uuid: string;
  retry_token: string;
  reason: string | null;
}

export interface LocalKotQueueItem extends SyncableEntity {
  outlet_id: string | null;
  order_local_id: string;
  table_id: string | null;
  table_number: string | null;
  kitchen_status: string;
  printed: boolean;
  items: Array<{
    product_id: string | null;
    product_name: string;
    quantity: number;
    notes?: string | null;
  }>;
  client_uuid: string;
  retry_token: string;
}

export interface LocalHeldOrder extends SyncableEntity {
  outlet_id: string | null;
  label: string | null;
  cart_json: unknown;
  client_uuid: string;
}

export interface LocalCustomer extends SyncableEntity {
  name: string;
  phone: string | null;
  email: string | null;
  meta: Record<string, unknown> | null;
}

export interface SyncQueueJob extends SyncableEntity {
  job_type: SyncJobType;
  state: SyncJobState;
  entity_local_id: string;
  entity_table: string;
  client_uuid: string;
  retry_token: string;
  attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  depends_on: string[];
  payload: Record<string, unknown>;
  priority: number;
}

export interface LocalAuditLog extends SyncableEntity {
  event_type: string;
  actor_id: string | null;
  outlet_id: string | null;
  message: string;
  meta: Record<string, unknown> | null;
}

export interface SettingsCacheRow extends SyncableEntity {
  cache_key: string;
  value: unknown;
  outlet_id: string | null;
}

export interface ProductsCacheRow extends SyncableEntity {
  outlet_id: string | null;
  product_id: string;
  data: unknown;
}

export interface RecipesCacheRow extends SyncableEntity {
  outlet_id: string | null;
  recipe_id: string;
  data: unknown;
}

export interface TaxCacheRow extends SyncableEntity {
  outlet_id: string | null;
  tax_key: string;
  data: unknown;
}

export interface OfflinePaymentPolicy {
  cash: boolean;
  card: boolean;
  upi: boolean;
  split: boolean;
  cardRequiresOnline: boolean;
  upiRequiresOnlineGateway: boolean;
}

export const DEFAULT_OFFLINE_PAYMENT_POLICY: OfflinePaymentPolicy = {
  cash: true,
  card: true,
  upi: false,
  split: true,
  cardRequiresOnline: false,
  upiRequiresOnlineGateway: true,
};
