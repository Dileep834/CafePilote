import { Role, type RoleType } from '@/constants';

export const PERMISSIONS = {
  DASHBOARD_ACCESS: 'dashboard.access',
  BRANCH_SWITCH: 'branch.switch',

  POS_ACCESS: 'pos.access',
  POS_CHECKOUT: 'pos.checkout',
  POS_DISCOUNT: 'pos.discount',
  POS_REFUND: 'pos.refund',
  POS_SHIFT: 'pos.shift',
  POS_AUDIT: 'pos.audit',
  TABLES_MANAGE: 'tables.manage',
  FLOOR_MANAGE: 'floor.manage',

  KITCHEN_ACCESS: 'kitchen.access',
  MENU_PRODUCTS_MANAGE: 'menu.products.manage',
  MENU_CATEGORIES_MANAGE: 'menu.categories.manage',
  RECIPES_MANAGE: 'recipes.manage',

  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_DAILY: 'inventory.daily',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_WASTE: 'inventory.waste',

  PURCHASE_MANAGE: 'purchase.manage',
  SUPPLIERS_MANAGE: 'suppliers.manage',

  CRM_MANAGE: 'crm.manage',
  MARKETING_MANAGE: 'marketing.manage',

  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  SAAS_BI: 'saas.bi',
  SAAS_AI: 'saas.ai',
  SAAS_API: 'saas.api',
  SAAS_PLATFORM: 'saas.platform',

  FRANCHISE_MANAGE: 'franchise.manage',
  USERS_MANAGE: 'users.manage',
  USERS_LOGS: 'users.logs',
  SETTINGS_MANAGE: 'settings.manage',
  COMPANIES_MANAGE: 'companies.manage',
} as const;

export type PermissionId = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export type PermissionModule = {
  module: string;
  description: string;
  permissions: Array<{
    id: PermissionId;
    label: string;
  }>;
};

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    module: 'Application Shell',
    description: 'Home screen and branch context',
    permissions: [
      { id: PERMISSIONS.DASHBOARD_ACCESS, label: 'Open ERP Dashboard' },
      { id: PERMISSIONS.BRANCH_SWITCH, label: 'Switch Active Outlet / Branch' },
    ],
  },
  {
    module: 'Point of Sale & Tables',
    description: 'Billing counter, checks, and dining room operations',
    permissions: [
      { id: PERMISSIONS.POS_ACCESS, label: 'Access POS Module' },
      { id: PERMISSIONS.POS_CHECKOUT, label: 'Process Checkout & Orders' },
      { id: PERMISSIONS.POS_DISCOUNT, label: 'Apply Custom Discounts' },
      { id: PERMISSIONS.POS_REFUND, label: 'Process Refunds / Voids' },
      { id: PERMISSIONS.POS_SHIFT, label: 'Open / Close Cash Shifts' },
      { id: PERMISSIONS.POS_AUDIT, label: 'View Audit Logs' },
      { id: PERMISSIONS.TABLES_MANAGE, label: 'Manage Table Board & Checks' },
      { id: PERMISSIONS.FLOOR_MANAGE, label: 'Manage Floor Designer' },
    ],
  },
  {
    module: 'Kitchen & Menu',
    description: 'Preparation workflow and item catalog',
    permissions: [
      { id: PERMISSIONS.KITCHEN_ACCESS, label: 'Access Kitchen Display (KDS)' },
      { id: PERMISSIONS.MENU_PRODUCTS_MANAGE, label: 'Manage Products / Menu Items' },
      { id: PERMISSIONS.MENU_CATEGORIES_MANAGE, label: 'Manage Categories' },
      { id: PERMISSIONS.RECIPES_MANAGE, label: 'Manage Recipes & BOM' },
    ],
  },
  {
    module: 'Inventory & Stock',
    description: 'Stock count, adjustments, and wastage',
    permissions: [
      { id: PERMISSIONS.INVENTORY_VIEW, label: 'View Stock Levels' },
      { id: PERMISSIONS.INVENTORY_DAILY, label: 'Submit Daily Stock Update' },
      { id: PERMISSIONS.INVENTORY_ADJUST, label: 'Adjust Stock Manually' },
      { id: PERMISSIONS.INVENTORY_WASTE, label: 'Log Food Waste' },
    ],
  },
  {
    module: 'Purchasing & Suppliers',
    description: 'Purchase ordering and supplier directory',
    permissions: [
      { id: PERMISSIONS.PURCHASE_MANAGE, label: 'Manage Purchase Orders' },
      { id: PERMISSIONS.SUPPLIERS_MANAGE, label: 'Manage Suppliers Directory' },
    ],
  },
  {
    module: 'Customers & Marketing',
    description: 'Guest records, loyalty, offers, and vouchers',
    permissions: [
      { id: PERMISSIONS.CRM_MANAGE, label: 'Manage Customers & Loyalty' },
      { id: PERMISSIONS.MARKETING_MANAGE, label: 'Manage Vouchers & Promos' },
    ],
  },
  {
    module: 'Reports & Analytics',
    description: 'Sales history and exports',
    permissions: [
      { id: PERMISSIONS.REPORTS_VIEW, label: 'View Sales & Profit Reports' },
      { id: PERMISSIONS.REPORTS_EXPORT, label: 'Export Data (CSV / Excel)' },
    ],
  },
  {
    module: 'SaaS Platform',
    description: 'BI, AI copilot, API keys, and platform operations',
    permissions: [
      { id: PERMISSIONS.SAAS_BI, label: 'Executive Intelligence Dashboard' },
      { id: PERMISSIONS.SAAS_AI, label: 'AI Copilot' },
      { id: PERMISSIONS.SAAS_API, label: 'Manage API Keys & Webhooks' },
      { id: PERMISSIONS.SAAS_PLATFORM, label: 'Platform Ops (Transfers / Health)' },
    ],
  },
  {
    module: 'Administration',
    description: 'Tenant, user, and platform governance',
    permissions: [
      { id: PERMISSIONS.FRANCHISE_MANAGE, label: 'Manage Outlets / Branches' },
      { id: PERMISSIONS.USERS_MANAGE, label: 'Manage Staff & Roles' },
      { id: PERMISSIONS.USERS_LOGS, label: 'View Login Logs' },
      { id: PERMISSIONS.SETTINGS_MANAGE, label: 'Modify System Settings' },
      { id: PERMISSIONS.COMPANIES_MANAGE, label: 'Manage Companies / Tenants' },
    ],
  },
];

export const ALL_PERMISSION_IDS = PERMISSION_MODULES.flatMap((module) =>
  module.permissions.map((permission) => permission.id)
);

const ALL_EXCEPT_COMPANIES = ALL_PERMISSION_IDS.filter(
  (permission) => permission !== PERMISSIONS.COMPANIES_MANAGE
);

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, PermissionId[]> = {
  [Role.SUPER_ADMIN]: ALL_PERMISSION_IDS,
  [Role.ADMIN]: ALL_EXCEPT_COMPANIES,
  [Role.OUTLET_OWNER]: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.BRANCH_SWITCH,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_CHECKOUT,
    PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.POS_REFUND,
    PERMISSIONS.POS_SHIFT,
    PERMISSIONS.POS_AUDIT,
    PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.FLOOR_MANAGE,
    PERMISSIONS.KITCHEN_ACCESS,
    PERMISSIONS.MENU_PRODUCTS_MANAGE,
    PERMISSIONS.MENU_CATEGORIES_MANAGE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_DAILY,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_WASTE,
    PERMISSIONS.PURCHASE_MANAGE,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.CRM_MANAGE,
    PERMISSIONS.MARKETING_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SAAS_BI,
    PERMISSIONS.SAAS_AI,
    PERMISSIONS.SAAS_API,
    PERMISSIONS.SAAS_PLATFORM,
    PERMISSIONS.FRANCHISE_MANAGE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.USERS_LOGS,
    PERMISSIONS.SETTINGS_MANAGE,
  ],
  [Role.OUTLET_MANAGER]: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.BRANCH_SWITCH,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_CHECKOUT,
    PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.POS_REFUND,
    PERMISSIONS.POS_SHIFT,
    PERMISSIONS.POS_AUDIT,
    PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.FLOOR_MANAGE,
    PERMISSIONS.KITCHEN_ACCESS,
    PERMISSIONS.MENU_PRODUCTS_MANAGE,
    PERMISSIONS.MENU_CATEGORIES_MANAGE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_DAILY,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_WASTE,
    PERMISSIONS.PURCHASE_MANAGE,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.CRM_MANAGE,
    PERMISSIONS.MARKETING_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.SAAS_BI,
    PERMISSIONS.SAAS_AI,
    PERMISSIONS.SAAS_PLATFORM,
    PERMISSIONS.SETTINGS_MANAGE,
  ],
  [Role.CASHIER]: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_CHECKOUT,
    PERMISSIONS.POS_REFUND,
    PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.CRM_MANAGE,
  ],
  [Role.KITCHEN_STAFF]: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.KITCHEN_ACCESS,
  ],
  [Role.INVENTORY_STAFF]: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_DAILY,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_WASTE,
    PERMISSIONS.PURCHASE_MANAGE,
    PERMISSIONS.SUPPLIERS_MANAGE,
  ],
  [Role.ACCOUNTANT]: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.BRANCH_SWITCH,
    PERMISSIONS.PURCHASE_MANAGE,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SAAS_BI,
    PERMISSIONS.SAAS_PLATFORM,
  ],
  [Role.STAFF]: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_CHECKOUT,
    PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.KITCHEN_ACCESS,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_DAILY,
    PERMISSIONS.INVENTORY_WASTE,
  ],
};

export const ROLE_ACCESS_SUMMARIES: Record<RoleType, string> = {
  [Role.SUPER_ADMIN]: 'Platform owner with every company, branch, and system control.',
  [Role.ADMIN]: 'Tenant admin with full company controls except platform company management.',
  [Role.OUTLET_OWNER]: 'Owner view for branch operations, purchasing, reports, and outlet setup.',
  [Role.OUTLET_MANAGER]: 'Day-to-day operations lead for service, stock, purchasing, and reports.',
  [Role.CASHIER]: 'Counter billing, table checks, and customer lookup only.',
  [Role.KITCHEN_STAFF]: 'Kitchen display only, with a simple prep-focused workspace.',
  [Role.INVENTORY_STAFF]: 'Stock counts, wastage, adjustments, purchase orders, and suppliers.',
  [Role.ACCOUNTANT]: 'Purchasing and reports for financial review.',
  [Role.STAFF]: 'General operations fallback for sales, tables, kitchen, and daily stock.',
};
