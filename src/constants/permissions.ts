export const PERMISSION_MODULES = [
  {
    module: 'Point of Sale (POS)',
    permissions: [
      { id: 'pos.access', label: 'Access POS Module' },
      { id: 'pos.checkout', label: 'Process Checkout & Orders' },
      { id: 'pos.discount', label: 'Apply Custom Discounts' },
      { id: 'pos.refund', label: 'Process Refunds' }
    ]
  },
  {
    module: 'Inventory & Stock',
    permissions: [
      { id: 'inventory.view', label: 'View Stock Levels' },
      { id: 'inventory.adjust', label: 'Adjust Stock Manually' },
      { id: 'inventory.waste', label: 'Log Food Waste' }
    ]
  },
  {
    module: 'Purchasing & Suppliers',
    permissions: [
      { id: 'purchase.manage', label: 'Manage Purchase Orders' },
      { id: 'suppliers.manage', label: 'Manage Suppliers Directory' }
    ]
  },
  {
    module: 'Kitchen & Preparation',
    permissions: [
      { id: 'kitchen.access', label: 'Access Kitchen Display (KDS)' },
      { id: 'recipes.manage', label: 'Manage Recipes & BOM' }
    ]
  },
  {
    module: 'Customers & CRM',
    permissions: [
      { id: 'crm.manage', label: 'Manage Customers & Loyalty' }
    ]
  },
  {
    module: 'Offers & Marketing',
    permissions: [
      { id: 'marketing.manage', label: 'Manage Vouchers & Promos' }
    ]
  },
  {
    module: 'Reports & Analytics',
    permissions: [
      { id: 'reports.view', label: 'View Sales & Profit Reports' },
      { id: 'reports.export', label: 'Export Data (CSV/Excel)' }
    ]
  },
  {
    module: 'Administration',
    permissions: [
      { id: 'franchise.manage', label: 'Manage Franchise Outlets' },
      { id: 'users.manage', label: 'Manage Staff & Roles' },
      { id: 'settings.manage', label: 'Modify System Settings' }
    ]
  }
];
