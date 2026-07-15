export const Role = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  FRANCHISE_OWNER: 'Franchise Owner',
  STORE_MANAGER: 'Store Manager',
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

export const APP_NAME = 'Backbenchers Cafeteria';
export const APP_LOGO = 'https://backbencherscafeteria.in/images/logo.png';
