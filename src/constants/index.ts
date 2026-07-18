export const Role = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  OUTLET_OWNER: 'Outlet Owner',
  STAFF: 'Staff',
} as const;

export type RoleType = typeof Role[keyof typeof Role];

export const InventoryStatus = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  LOCKED: 'Locked',
  OVERDUE: 'Overdue',
} as const;

export type InventoryStatusType = typeof InventoryStatus[keyof typeof InventoryStatus];

/** Official product brand — always "CafePilots" (with an s). */
export const APP_NAME = 'CafePilots';
export const APP_TAGLINE = 'Run Every Café Smarter.';
export const APP_DOMAIN = 'cafepilots.com';

/**
 * Platform owner tenant (Super Admin / CafePilots HQ).
 * Separate from real customer companies — never reuse a customer UUID.
 */
export const HQ_COMPANY_ID = 'a1000000-0000-4000-8000-000000000001';
export const HQ_COMPANY_NAME = 'CafePilots HQ';
export const HQ_COMPANY_SUBDOMAIN = 'cafepilots-hq';
/** Default demo outlet under CafePilots HQ for orphan / placeholder rows */
export const HQ_OUTLET_ID = 'a1000000-0000-4000-8000-000000000010';

/**
 * Real customer tenant (Backbenchers). Historical seed id — do not rename or merge.
 */
export const BACKBENCHERS_COMPANY_ID = 'c1000000-0000-0000-0000-000000000001';
export const BACKBENCHERS_COMPANY_NAME = 'Backbenchers Cafeteria';

/** Brand board palette */
export const BRAND = {
  navy: '#0D1B2A',
  steel: '#1B263B',
  orange: '#FF6A00',
  orangeLight: '#FFB347',
  cream: '#F5E6D3',
  gray: '#F3F3F8',
} as const;
