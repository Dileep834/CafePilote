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

/** Brand board palette */
export const BRAND = {
  navy: '#0D1B2A',
  steel: '#1B263B',
  orange: '#FF6A00',
  orangeLight: '#FFB347',
  cream: '#F5E6D3',
  gray: '#F3F3F8',
} as const;
