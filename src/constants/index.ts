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

export const APP_NAME = 'CafePilot ERP';
export const APP_LOGO = 'https://cafepilote.com/wp-content/uploads/2024/01/cafe-pilot-logo-1.png'; // Using a placeholder/real logo
// We will use a generic cafe logo or text if this URL is dead, but let's try a common logo or just use an icon in the UI.
// Actually, let's use a nice dynamic logo in the Login page directly instead of a broken URL.
