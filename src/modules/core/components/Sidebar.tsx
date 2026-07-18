import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  ChefHat,
  Users,
  BarChart3,
  Store,
  Settings,
  Shield,
  Ticket,
  Map,
  LayoutGrid,
  UtensilsCrossed,
  Tags,
  BookOpen,
  Boxes,
  ClipboardList,
  Trash2,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { APP_NAME, BRAND } from '@/constants';
import { PERMISSIONS, type PermissionId } from '@/constants/permissions';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermissionsStore } from '@/store/usePermissionsStore';
import { isSuperAdmin } from '@/lib/access';

type NavLeaf = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  requiredPermission?: PermissionId;
  /** Only visible to Super Admin (platform owner) */
  superAdminOnly?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavLeaf[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'service',
    label: 'Front of house',
    items: [
      { name: 'Dashboard', href: '/erp', icon: LayoutDashboard, end: true, requiredPermission: PERMISSIONS.DASHBOARD_ACCESS },
      { name: 'POS (Billing)', href: '/erp/pos', icon: ShoppingCart, requiredPermission: PERMISSIONS.POS_ACCESS },
      { name: 'Tables', href: '/erp/tables', icon: LayoutGrid, end: true, requiredPermission: PERMISSIONS.TABLES_MANAGE },
      { name: 'Floor Designer', href: '/erp/floor', icon: Map, requiredPermission: PERMISSIONS.FLOOR_MANAGE },
      { name: 'Kitchen (KDS)', href: '/erp/kitchen', icon: ChefHat, end: true, requiredPermission: PERMISSIONS.KITCHEN_ACCESS },
    ],
  },
  {
    id: 'menu',
    label: 'Menu & catalog',
    items: [
      { name: 'Products', href: '/erp/menu/products', icon: UtensilsCrossed, requiredPermission: PERMISSIONS.MENU_PRODUCTS_MANAGE },
      { name: 'Categories', href: '/erp/menu/categories', icon: Tags, requiredPermission: PERMISSIONS.MENU_CATEGORIES_MANAGE },
      { name: 'Recipes', href: '/erp/menu/recipes', icon: BookOpen, requiredPermission: PERMISSIONS.RECIPES_MANAGE },
    ],
  },
  {
    id: 'stock',
    label: 'Inventory & purchase',
    items: [
      { name: 'Stock on hand', href: '/erp/inventory', icon: Boxes, end: true, requiredPermission: PERMISSIONS.INVENTORY_VIEW },
      { name: 'Daily stock update', href: '/erp/inventory/daily', icon: ClipboardList, requiredPermission: PERMISSIONS.INVENTORY_DAILY },
      { name: 'Adjustments', href: '/erp/inventory/adjustments', icon: Package, requiredPermission: PERMISSIONS.INVENTORY_ADJUST },
      { name: 'Waste log', href: '/erp/inventory/waste', icon: Trash2, requiredPermission: PERMISSIONS.INVENTORY_WASTE },
      { name: 'Purchase orders', href: '/erp/purchase', icon: Truck, end: true, requiredPermission: PERMISSIONS.PURCHASE_MANAGE },
      { name: 'Suppliers', href: '/erp/purchase/suppliers', icon: Store, requiredPermission: PERMISSIONS.SUPPLIERS_MANAGE },
    ],
  },
  {
    id: 'growth',
    label: 'Customers & offers',
    items: [
      { name: 'CRM / Guests', href: '/erp/crm', icon: Users, requiredPermission: PERMISSIONS.CRM_MANAGE },
      { name: 'Offers & vouchers', href: '/erp/vouchers', icon: Ticket, requiredPermission: PERMISSIONS.MARKETING_MANAGE },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    items: [
      { name: 'Reports', href: '/erp/reports', icon: BarChart3, requiredPermission: PERMISSIONS.REPORTS_VIEW },
      { name: 'Outlets / Branches', href: '/erp/franchise', icon: Building2, requiredPermission: PERMISSIONS.FRANCHISE_MANAGE },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { name: 'Staff & users', href: '/erp/users', icon: Shield, requiredPermission: PERMISSIONS.USERS_MANAGE },
      { name: 'Login logs', href: '/erp/users/logs', icon: ClipboardList, requiredPermission: PERMISSIONS.USERS_LOGS },
      { name: 'Companies', href: '/erp/companies', icon: Building2, requiredPermission: PERMISSIONS.COMPANIES_MANAGE, superAdminOnly: true },
      { name: 'Settings', href: '/erp/settings', icon: Settings, requiredPermission: PERMISSIONS.SETTINGS_MANAGE },
    ],
  },
];

function pathMatches(pathname: string, href: string, end?: boolean) {
  if (end) return pathname === href || pathname === `${href}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const sa = isSuperAdmin(user);
  const role = user?.role;

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.superAdminOnly && !sa) return false;
        if (!item.requiredPermission) return true;
        if (!role) return false;
        return hasPermission(role, item.requiredPermission);
      }),
    })).filter((g) => g.items.length > 0);
  }, [hasPermission, role, sa]);

  const activeGroupIds = useMemo(() => {
    return visibleGroups
      .filter((g) =>
        g.items.some((item) => pathMatches(location.pathname, item.href, item.end))
      )
      .map((g) => g.id);
  }, [location.pathname, visibleGroups]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) init[g.id] = true;
    return init;
  });

  useEffect(() => {
    if (!activeGroupIds.length) return;
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const id of activeGroupIds) next[id] = true;
      return next;
    });
  }, [activeGroupIds]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const displayName = user?.name || 'Staff';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'CP';

  return (
    <div className={cn('flex h-full flex-col text-slate-50', className)} style={{ backgroundColor: BRAND.navy }}>
      <div className="flex h-16 items-center px-5 border-b border-white/10 shrink-0">
        <CafePilotsLogo size={34} withWordmark withDivider onDark />
      </div>

      <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-3">
        {visibleGroups.map((group) => {
          const open = openGroups[group.id] !== false;
          const groupActive = activeGroupIds.includes(group.id);

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors',
                  groupActive ? 'text-orange-300' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn('w-3.5 h-3.5 transition-transform', open ? 'rotate-0' : '-rotate-90')}
                />
              </button>

              {open && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                          isActive
                            ? 'text-white shadow-sm'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        )
                      }
                      style={({ isActive }) =>
                        isActive ? { backgroundColor: BRAND.orange } : undefined
                      }
                    >
                      <item.icon className="mr-2.5 h-4 w-4 flex-shrink-0 opacity-90" aria-hidden />
                      {item.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: BRAND.orange }}
          >
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">{displayName}</span>
            <span className="text-xs text-slate-400 truncate">
              {sa ? 'Platform owner · CafePilots HQ' : user?.role || APP_NAME}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
