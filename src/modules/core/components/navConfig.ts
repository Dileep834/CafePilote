import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  Map,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Tags,
  Ticket,
  Trash2,
  Truck,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import type React from 'react';
import { PERMISSIONS, type PermissionId } from '@/constants/permissions';
import type { PlanModuleId } from '@/lib/planLimits';

export type NavLeaf = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  requiredPermission?: PermissionId;
  requiredPlanModule?: PlanModuleId;
  superAdminOnly?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavLeaf[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'service',
    label: 'Front of house',
    items: [
      { name: 'Dashboard', href: '/erp', icon: LayoutDashboard, end: true, requiredPermission: PERMISSIONS.DASHBOARD_ACCESS },
      { name: 'POS (Billing)', href: '/erp/pos', icon: ShoppingCart, requiredPermission: PERMISSIONS.POS_ACCESS, requiredPlanModule: 'pos' },
      { name: 'Tables', href: '/erp/tables', icon: LayoutGrid, end: true, requiredPermission: PERMISSIONS.TABLES_MANAGE, requiredPlanModule: 'tables' },
      { name: 'Floor Designer', href: '/erp/floor', icon: Map, requiredPermission: PERMISSIONS.FLOOR_MANAGE, requiredPlanModule: 'floorDesigner' },
      { name: 'Kitchen (KDS)', href: '/erp/kitchen', icon: ChefHat, end: true, requiredPermission: PERMISSIONS.KITCHEN_ACCESS, requiredPlanModule: 'kitchen' },
    ],
  },
  {
    id: 'menu',
    label: 'Menu & catalog',
    items: [
      { name: 'Products', href: '/erp/menu/products', icon: UtensilsCrossed, requiredPermission: PERMISSIONS.MENU_PRODUCTS_MANAGE, requiredPlanModule: 'products' },
      { name: 'Categories', href: '/erp/menu/categories', icon: Tags, requiredPermission: PERMISSIONS.MENU_CATEGORIES_MANAGE, requiredPlanModule: 'products' },
      { name: 'Recipes', href: '/erp/menu/recipes', icon: BookOpen, requiredPermission: PERMISSIONS.RECIPES_MANAGE, requiredPlanModule: 'recipes' },
    ],
  },
  {
    id: 'stock',
    label: 'Inventory & purchase',
    items: [
      { name: 'Stock on hand', href: '/erp/inventory', icon: Boxes, end: true, requiredPermission: PERMISSIONS.INVENTORY_VIEW, requiredPlanModule: 'inventory' },
      { name: 'Daily stock update', href: '/erp/inventory/daily', icon: ClipboardList, requiredPermission: PERMISSIONS.INVENTORY_DAILY, requiredPlanModule: 'inventory' },
      { name: 'Adjustments', href: '/erp/inventory/adjustments', icon: Package, requiredPermission: PERMISSIONS.INVENTORY_ADJUST, requiredPlanModule: 'inventory' },
      { name: 'Waste log', href: '/erp/inventory/waste', icon: Trash2, requiredPermission: PERMISSIONS.INVENTORY_WASTE, requiredPlanModule: 'inventory' },
      { name: 'Purchase orders', href: '/erp/purchase', icon: Truck, end: true, requiredPermission: PERMISSIONS.PURCHASE_MANAGE, requiredPlanModule: 'purchase' },
      { name: 'Suppliers', href: '/erp/purchase/suppliers', icon: Store, requiredPermission: PERMISSIONS.SUPPLIERS_MANAGE, requiredPlanModule: 'suppliers' },
    ],
  },
  {
    id: 'growth',
    label: 'Customers & offers',
    items: [
      { name: 'CRM / Guests', href: '/erp/crm', icon: Users, requiredPermission: PERMISSIONS.CRM_MANAGE, requiredPlanModule: 'crm' },
      { name: 'Offers & vouchers', href: '/erp/vouchers', icon: Ticket, requiredPermission: PERMISSIONS.MARKETING_MANAGE, requiredPlanModule: 'crm' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    items: [
      { name: 'Reports', href: '/erp/reports', icon: BarChart3, requiredPermission: PERMISSIONS.REPORTS_VIEW, requiredPlanModule: 'reports' },
      { name: 'Outlets / Branches', href: '/erp/franchise', icon: Building2, requiredPermission: PERMISSIONS.FRANCHISE_MANAGE, requiredPlanModule: 'franchise' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { name: 'Staff & users', href: '/erp/users', icon: Shield, requiredPermission: PERMISSIONS.USERS_MANAGE, requiredPlanModule: 'staff' },
      { name: 'Login logs', href: '/erp/users/logs', icon: ClipboardList, requiredPermission: PERMISSIONS.USERS_LOGS, requiredPlanModule: 'staff' },
      { name: 'Companies', href: '/erp/companies', icon: Building2, requiredPermission: PERMISSIONS.COMPANIES_MANAGE, superAdminOnly: true },
      { name: 'Settings', href: '/erp/settings', icon: Settings, requiredPermission: PERMISSIONS.SETTINGS_MANAGE, requiredPlanModule: 'settings' },
    ],
  },
];
