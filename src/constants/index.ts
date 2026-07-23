export const Role = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  OUTLET_OWNER: 'Outlet Owner',
  OUTLET_MANAGER: 'Outlet Manager',
  CASHIER: 'Cashier',
  KITCHEN_STAFF: 'Kitchen Staff',
  INVENTORY_STAFF: 'Inventory Staff',
  ACCOUNTANT: 'Accountant',
  STAFF: 'Staff',
} as const;

export type RoleType = typeof Role[keyof typeof Role];

export const APP_ROLES = Object.values(Role) as RoleType[];

export const CONFIGURABLE_ROLES: RoleType[] = [
  Role.ADMIN,
  Role.OUTLET_OWNER,
  Role.OUTLET_MANAGER,
  Role.CASHIER,
  Role.KITCHEN_STAFF,
  Role.INVENTORY_STAFF,
  Role.ACCOUNTANT,
  Role.STAFF,
];

export const SUPER_ADMIN_ASSIGNABLE_ROLES: RoleType[] = APP_ROLES;

export const TENANT_ADMIN_ASSIGNABLE_ROLES: RoleType[] = [
  Role.OUTLET_OWNER,
  Role.OUTLET_MANAGER,
  Role.CASHIER,
  Role.KITCHEN_STAFF,
  Role.INVENTORY_STAFF,
  Role.ACCOUNTANT,
  Role.STAFF,
];

export const OUTLET_SCOPED_ROLES: RoleType[] = [
  Role.OUTLET_OWNER,
  Role.OUTLET_MANAGER,
  Role.CASHIER,
  Role.KITCHEN_STAFF,
  Role.INVENTORY_STAFF,
  Role.ACCOUNTANT,
  Role.STAFF,
];

export const BRANCH_SWITCH_ROLES: RoleType[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.OUTLET_OWNER,
  Role.OUTLET_MANAGER,
  Role.ACCOUNTANT,
];

export const InventoryStatus = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  LOCKED: 'Locked',
  OVERDUE: 'Overdue',
} as const;

export type InventoryStatusType = typeof InventoryStatus[keyof typeof InventoryStatus];

/** Official product brand: always "CafePilots" (with an s). */
export const APP_NAME = 'CafePilots';
export const APP_TAGLINE = 'Run Every Food Business Smarter.';
export const APP_DOMAIN = 'cafepilots.com';

/**
 * CafePilots HQ — demo + platform-owner tenant (Super Admin).
 * Use this for sandbox / demo data. Never reuse a customer UUID.
 */
export const HQ_COMPANY_ID = 'a1000000-0000-4000-8000-000000000001';
export const HQ_COMPANY_NAME = 'CafePilots HQ';
export const HQ_COMPANY_SUBDOMAIN = 'cafepilots-hq';
/** Default demo outlet under CafePilots HQ for orphan / placeholder rows */
export const HQ_OUTLET_ID = 'a1000000-0000-4000-8000-000000000010';

/**
 * Backbenchers — real customer tenant. Protect; do not rename, merge, or wipe.
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
