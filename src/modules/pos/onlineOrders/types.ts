/**
 * Online Order Hub — platform-agnostic types.
 * Add new aggregators by registering in `platforms.ts` only.
 */

export type OnlinePlatformId =
  | 'swiggy'
  | 'zomato'
  | 'ondc'
  | 'website'
  | 'qr'
  | 'whatsapp'
  | 'phone'
  | 'walk_in'
  | 'ubereats'
  | 'magicpin'
  | 'blinkit'
  | 'zepto';

export type OnlineOrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'rejected'
  | 'expired';

export type OnlinePaymentKind = 'prepaid' | 'cod' | 'online' | 'card';

export type OnlineAlertKind =
  | 'new_order'
  | 'cancelled'
  | 'driver_arrived'
  | 'late_pickup'
  | 'payment_failed'
  | 'refund'
  | 'kitchen_delay'
  | 'customer_call'
  | 'store_offline';

export type OnlineSoundKind =
  | 'swiggy'
  | 'zomato'
  | 'website'
  | 'high_priority'
  | 'late_pickup';

export type PlatformConnection = {
  platformId: OnlinePlatformId;
  connected: boolean;
  lastSyncAt?: string | null;
};

export type OnlineOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: string[];
  notes?: string;
};

export type DeliveryPartner = {
  name: string;
  phone?: string;
  vehicle?: string;
  etaMinutes?: number;
  status: 'assigned' | 'arrived' | 'picked' | 'completed' | 'unassigned';
};

export type OnlineCustomer = {
  name: string;
  phone?: string;
  address?: string;
  landmark?: string;
  instructions?: string;
  orderCount?: number;
};

export type OnlineOrderMoney = {
  subtotal: number;
  discount: number;
  tax: number;
  packing: number;
  delivery: number;
  platformCommission: number;
  total: number;
  /** Restaurant net after commission */
  earnings: number;
};

export type OnlineOrder = {
  id: string;
  externalId: string;
  platformId: OnlinePlatformId;
  status: OnlineOrderStatus;
  payment: OnlinePaymentKind;
  customer: OnlineCustomer;
  items: OnlineOrderItem[];
  money: OnlineOrderMoney;
  kitchenMinutes: number;
  acceptWithinSec?: number;
  createdAt: string;
  acceptedAt?: string | null;
  readyAt?: string | null;
  pickupEtaAt?: string | null;
  prepStartedAt?: string | null;
  partner?: DeliveryPartner | null;
  priority?: 'normal' | 'high';
  notes?: string;
};

export type OnlineAlert = {
  id: string;
  kind: OnlineAlertKind;
  title: string;
  body: string;
  orderId?: string;
  platformId?: OnlinePlatformId;
  createdAt: string;
  read: boolean;
};

export type OnlineOrderToast = {
  id: string;
  orderId: string;
  createdAt: string;
};

export type OnlineHubFilters = {
  platform: OnlinePlatformId | 'all';
  payment: OnlinePaymentKind | 'all';
  status: OnlineOrderStatus | 'all' | 'pending' | 'late';
  query: string;
};

export type OnlineHubSettings = {
  autoAccept: boolean;
  autoRejectSeconds: number;
  defaultKitchenMinutes: number;
  pickupDelayMinutes: number;
  autoPrintKot: boolean;
  autoPrintBill: boolean;
  soundsEnabled: boolean;
  mutedPlatforms: OnlinePlatformId[];
};

export type PlatformDefinition = {
  id: OnlinePlatformId;
  label: string;
  /** Tailwind-friendly accent */
  color: string;
  bg: string;
  text: string;
  ring: string;
  /** Short glyph when logo asset unavailable */
  glyph: string;
  sound: OnlineSoundKind;
  enabled: boolean;
};
