import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  ChefHat,
  CircleCheckBig,
  Clock3,
  ClipboardList,
  LayoutGrid,
  Map,
  Package,
  ReceiptText,
  RefreshCw,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Tags,
  Ticket,
  Truck,
  Trash2,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND, type RoleType } from '@/constants';
import { PERMISSIONS, type PermissionId } from '@/constants/permissions';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermissionsStore } from '@/store/usePermissionsStore';
import { useTenantStore } from '@/store/useTenantStore';
import { useKitchenStore } from '@/modules/kitchen/store/useKitchenStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import { formatCurrency } from '@/utils/format';

type ModuleCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  permission: PermissionId;
};

type ModuleSection = {
  id: string;
  label: string;
  items: ModuleCard[];
};

type DashboardMetrics = {
  todayRevenue: number;
  completedOrders: number;
  heldOrders: number;
  lowStockItems: number;
  draftPurchaseOrders: number;
  hadError: boolean;
};

const EMPTY_METRICS: DashboardMetrics = {
  todayRevenue: 0,
  completedOrders: 0,
  heldOrders: 0,
  lowStockItems: 0,
  draftPurchaseOrders: 0,
  hadError: false,
};

const sections: ModuleSection[] = [
  {
    id: 'service',
    label: 'Front of house',
    items: [
      {
        title: 'POS Billing',
        description: 'Open a counter sale or continue a table check',
        icon: ShoppingCart,
        path: '/erp/pos',
        permission: PERMISSIONS.POS_ACCESS,
      },
      {
        title: 'Tables',
        description: 'Seat guests, move parties, print QR codes',
        icon: LayoutGrid,
        path: '/erp/tables',
        permission: PERMISSIONS.TABLES_MANAGE,
      },
      {
        title: 'Floor Designer',
        description: 'Maintain table layout and floor-plan mapping',
        icon: Map,
        path: '/erp/floor',
        permission: PERMISSIONS.FLOOR_MANAGE,
      },
      {
        title: 'Kitchen KDS',
        description: 'Move tickets from pending to ready',
        icon: ChefHat,
        path: '/erp/kitchen',
        permission: PERMISSIONS.KITCHEN_ACCESS,
      },
    ],
  },
  {
    id: 'menu',
    label: 'Menu and catalog',
    items: [
      {
        title: 'Products',
        description: 'Prices, item types, stock thresholds',
        icon: UtensilsCrossed,
        path: '/erp/menu/products',
        permission: PERMISSIONS.MENU_PRODUCTS_MANAGE,
      },
      {
        title: 'Categories',
        description: 'POS and QR menu grouping',
        icon: Tags,
        path: '/erp/menu/categories',
        permission: PERMISSIONS.MENU_CATEGORIES_MANAGE,
      },
      {
        title: 'Recipes',
        description: 'BOM and recipe costing',
        icon: BookOpen,
        path: '/erp/menu/recipes',
        permission: PERMISSIONS.RECIPES_MANAGE,
      },
    ],
  },
  {
    id: 'stock',
    label: 'Inventory and purchase',
    items: [
      {
        title: 'Stock on Hand',
        description: 'Current inventory and low-stock watch',
        icon: Boxes,
        path: '/erp/inventory',
        permission: PERMISSIONS.INVENTORY_VIEW,
      },
      {
        title: 'Daily Stock',
        description: 'Record opening, purchase, use, waste, and closing stock',
        icon: ClipboardList,
        path: '/erp/inventory/daily',
        permission: PERMISSIONS.INVENTORY_DAILY,
      },
      {
        title: 'Purchase Orders',
        description: 'Supplier ordering and receiving follow-up',
        icon: Truck,
        path: '/erp/purchase',
        permission: PERMISSIONS.PURCHASE_MANAGE,
      },
      {
        title: 'Adjustments',
        description: 'Corrections, transfers, and stock changes',
        icon: Package,
        path: '/erp/inventory/adjustments',
        permission: PERMISSIONS.INVENTORY_ADJUST,
      },
      {
        title: 'Waste Log',
        description: 'Track wastage and keep stock honest',
        icon: Trash2,
        path: '/erp/inventory/waste',
        permission: PERMISSIONS.INVENTORY_WASTE,
      },
      {
        title: 'Suppliers',
        description: 'Vendor contacts and purchase setup',
        icon: Store,
        path: '/erp/purchase/suppliers',
        permission: PERMISSIONS.SUPPLIERS_MANAGE,
      },
    ],
  },
  {
    id: 'growth',
    label: 'Customers and business',
    items: [
      {
        title: 'CRM',
        description: 'Guests, loyalty, and feedback',
        icon: Users,
        path: '/erp/crm',
        permission: PERMISSIONS.CRM_MANAGE,
      },
      {
        title: 'Offers',
        description: 'Vouchers and campaigns',
        icon: Ticket,
        path: '/erp/vouchers',
        permission: PERMISSIONS.MARKETING_MANAGE,
      },
      {
        title: 'Reports',
        description: 'Sales, orders, and performance review',
        icon: BarChart3,
        path: '/erp/reports',
        permission: PERMISSIONS.REPORTS_VIEW,
      },
      {
        title: 'Outlets',
        description: 'Branches, locations, and operating units',
        icon: Building2,
        path: '/erp/franchise',
        permission: PERMISSIONS.FRANCHISE_MANAGE,
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      {
        title: 'Staff and Users',
        description: 'Accounts, sessions, and access',
        icon: Shield,
        path: '/erp/users',
        permission: PERMISSIONS.USERS_MANAGE,
      },
      {
        title: 'Settings',
        description: 'Receipts, printers, roles, and system defaults',
        icon: Settings,
        path: '/erp/settings',
        permission: PERMISSIONS.SETTINGS_MANAGE,
      },
    ],
  },
];

function isCloudOutletId(outletId?: string | null) {
  return Boolean(outletId && outletId !== 'current-outlet' && !outletId.startsWith('local'));
}

function startOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function canSeeModule(
  item: ModuleCard,
  role: RoleType | undefined,
  hasPermission: (role: RoleType, permissionId: PermissionId) => boolean
) {
  if (!role) return false;
  return hasPermission(role, item.permission);
}

async function fetchDashboardMetrics(outletId?: string | null): Promise<DashboardMetrics> {
  const metrics: DashboardMetrics = { ...EMPTY_METRICS };
  const today = startOfTodayIso();
  const outletFilter = isCloudOutletId(outletId) ? outletId : null;

  try {
    let ordersQuery = supabase
      .from('pos_orders')
      .select('id, status, total_amount')
      .gte('created_at', today)
      .limit(500);

    if (outletFilter) ordersQuery = ordersQuery.eq('outlet_id', outletFilter);

    const { data, error } = await ordersQuery;
    if (error) throw error;

    for (const order of data || []) {
      const status = String((order as any).status || '');
      if (status === 'completed') {
        metrics.completedOrders += 1;
        metrics.todayRevenue += Number((order as any).total_amount) || 0;
      }
      if (status === 'held') {
        metrics.heldOrders += 1;
      }
    }
  } catch {
    // Optional inventory setup can lag behind POS rollout; keep the dashboard usable.
  }

  try {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, min_stock, is_active')
      .eq('is_active', true)
      .limit(1000);

    if (productsError) throw productsError;

    let inventoryQuery = supabase
      .from('inventory')
      .select('product_id, current_quantity')
      .limit(3000);

    if (outletFilter) inventoryQuery = inventoryQuery.eq('outlet_id', outletFilter);

    const { data: inventoryRows, error: inventoryError } = await inventoryQuery;
    if (inventoryError) throw inventoryError;

    const quantityByProduct = new Map<string, number>();
    for (const row of inventoryRows || []) {
      const productId = String((row as any).product_id || '');
      quantityByProduct.set(
        productId,
        (quantityByProduct.get(productId) || 0) + (Number((row as any).current_quantity) || 0)
      );
    }

    metrics.lowStockItems = (products || []).filter((product: any) => {
      const minStock = Number(product.min_stock) || 0;
      if (minStock <= 0) return false;
      return (quantityByProduct.get(String(product.id)) || 0) < minStock;
    }).length;
  } catch {
    // Purchase order tracking is optional for smaller outlets.
  }

  try {
    let purchaseQuery = supabase
      .from('purchase_orders')
      .select('id, status')
      .limit(300);

    if (outletFilter) purchaseQuery = purchaseQuery.eq('outlet_id', outletFilter);

    const { data, error } = await purchaseQuery;
    if (error) throw error;

    metrics.draftPurchaseOrders = (data || []).filter((po: any) =>
      ['draft', 'pending', 'ordered'].includes(String(po.status || '').toLowerCase())
    ).length;
  } catch {
    metrics.hadError = true;
  }

  return metrics;
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: 'orange' | 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
}) {
  const toneClass = {
    orange: 'bg-orange-50 text-orange-700 ring-orange-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-50 text-slate-700 ring-slate-100',
  }[tone];

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardContent className="flex h-full items-start gap-3 p-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1', toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-black leading-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-snug text-slate-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityItem({
  title,
  detail,
  path,
  icon: Icon,
  tone,
}: {
  title: string;
  detail: string;
  path: string;
  icon: LucideIcon;
  tone: string;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-950">{title}</p>
        <p className="truncate text-xs text-slate-500">{detail}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}

export function ERPHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const companyName = useTenantStore((s) => s.companyName);
  const outlets = useTenantStore((s) => s.outlets);
  const tables = useTableStore((s) => s.tables);
  const fetchTables = useTableStore((s) => s.fetchTables);
  const bills = useTableBillStore((s) => s.bills);
  const getBillTotal = useTableBillStore((s) => s.getBillTotal);
  const hydrateOpenBills = useTableBillStore((s) => s.hydrateOpenBills);
  const kitchenOrders = useKitchenStore((s) => s.orders);
  const fetchKitchenOrders = useKitchenStore((s) => s.fetchOrders);

  const activeOutlet = outlets.find((outlet) => outlet.id === activeOutletId);
  const canAccess = (permission: PermissionId) =>
    Boolean(user?.role && hasPermission(user.role, permission));
  const canAccessAny = (permissions: PermissionId[]) =>
    Boolean(user?.role && permissions.some((permission) => hasPermission(user.role, permission)));

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            canSeeModule(item, user?.role, hasPermission)
          ),
        }))
        .filter((section) => section.items.length > 0),
    [hasPermission, user?.role]
  );

  useEffect(() => {
    void fetchTables(activeOutletId || undefined);
    void hydrateOpenBills(activeOutletId || undefined);
    void fetchKitchenOrders();
  }, [activeOutletId, fetchKitchenOrders, fetchTables, hydrateOpenBills]);

  const metricsQuery = useQuery({
    queryKey: ['erp-home-metrics', activeOutletId],
    queryFn: () => fetchDashboardMetrics(activeOutletId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const metrics = metricsQuery.data || EMPTY_METRICS;

  const scopedTables = useMemo(() => {
    if (!activeOutletId || activeOutletId === 'current-outlet') return tables;
    const filtered = tables.filter((table) => table.outletId === activeOutletId);
    return filtered.length > 0 ? filtered : tables;
  }, [activeOutletId, tables]);

  const tableStats = useMemo(() => {
    const occupied = scopedTables.filter((table) => table.status === 'occupied').length;
    const reserved = scopedTables.filter((table) => table.status === 'reserved').length;
    const cleaning = scopedTables.filter((table) => table.status === 'cleaning').length;
    return {
      occupied,
      reserved,
      cleaning,
      available: scopedTables.filter((table) => table.status === 'available').length,
      active: occupied + reserved + cleaning,
      total: scopedTables.length,
    };
  }, [scopedTables]);

  const openBills = useMemo(
    () =>
      bills.filter((bill) => {
        if (bill.status !== 'open') return false;
        if (!activeOutletId || activeOutletId === 'current-outlet') return true;
        return bill.outletId === activeOutletId;
      }),
    [activeOutletId, bills]
  );

  const openBillTotal = openBills.reduce((sum, bill) => sum + getBillTotal(bill), 0);
  const pendingKitchen = kitchenOrders.filter((order) => order.kitchen_status === 'pending').length;
  const preparingKitchen = kitchenOrders.filter((order) => order.kitchen_status === 'preparing').length;
  const readyKitchen = kitchenOrders.filter((order) => order.kitchen_status === 'ready').length;
  const kitchenQueue = pendingKitchen + preparingKitchen + readyKitchen;

  const quickActions = [
    {
      label: 'New bill',
      path: '/erp/pos',
      icon: ShoppingCart,
      iconClassName: 'text-orange-400',
      permission: PERMISSIONS.POS_ACCESS,
      variant: 'primary',
    },
    {
      label: 'Table board',
      path: '/erp/tables',
      icon: LayoutGrid,
      iconClassName: 'text-sky-600',
      permission: PERMISSIONS.TABLES_MANAGE,
      variant: 'outline',
    },
    {
      label: 'Kitchen display',
      path: '/erp/kitchen',
      icon: ChefHat,
      iconClassName: 'text-amber-600',
      permission: PERMISSIONS.KITCHEN_ACCESS,
      variant: 'outline',
    },
    {
      label: 'Daily report',
      path: '/erp/reports',
      icon: BarChart3,
      iconClassName: 'text-emerald-600',
      permission: PERMISSIONS.REPORTS_VIEW,
      variant: 'outline',
    },
    {
      label: 'Daily stock',
      path: '/erp/inventory/daily',
      icon: ClipboardList,
      iconClassName: 'text-rose-600',
      permission: PERMISSIONS.INVENTORY_DAILY,
      variant: 'outline',
    },
  ].filter((action) => canAccess(action.permission));

  const primaryAction = quickActions[0];

  const visibleMetrics = [
    {
      label: 'Today sales',
      value: formatCurrency(metrics.todayRevenue),
      detail: `${metrics.completedOrders} paid orders`,
      icon: BarChart3,
      tone: 'emerald' as const,
      permissions: [PERMISSIONS.POS_ACCESS, PERMISSIONS.REPORTS_VIEW],
    },
    {
      label: 'Table load',
      value: `${tableStats.active}/${Math.max(tableStats.total, 1)}`,
      detail: `${tableStats.available} available now`,
      icon: Store,
      tone: 'sky' as const,
      permissions: [PERMISSIONS.TABLES_MANAGE],
    },
    {
      label: 'Kitchen queue',
      value: String(kitchenQueue),
      detail: `${readyKitchen} ready to serve`,
      icon: ChefHat,
      tone: (kitchenQueue > 0 ? 'amber' : 'slate') as const,
      permissions: [PERMISSIONS.KITCHEN_ACCESS],
    },
    {
      label: 'Open checks',
      value: String(openBills.length),
      detail: formatCurrency(openBillTotal),
      icon: ReceiptText,
      tone: (openBills.length > 0 ? 'orange' : 'slate') as const,
      permissions: [PERMISSIONS.POS_ACCESS, PERMISSIONS.TABLES_MANAGE],
    },
    {
      label: 'Stock watch',
      value: String(metrics.lowStockItems),
      detail: 'items below minimum',
      icon: AlertTriangle,
      tone: (metrics.lowStockItems > 0 ? 'rose' : 'slate') as const,
      permissions: [PERMISSIONS.INVENTORY_VIEW],
    },
    {
      label: 'Follow-up',
      value: String(metrics.heldOrders + metrics.draftPurchaseOrders),
      detail: `${metrics.heldOrders} held orders, ${metrics.draftPurchaseOrders} POs pending`,
      icon: Clock3,
      tone: (metrics.heldOrders + metrics.draftPurchaseOrders > 0 ? 'amber' : 'slate') as const,
      permissions: [PERMISSIONS.POS_ACCESS, PERMISSIONS.PURCHASE_MANAGE],
    },
  ].filter((metric) => canAccessAny(metric.permissions));

  const priorityItems = [
    kitchenQueue > 0
      ? {
          title: `${kitchenQueue} kitchen tickets in motion`,
          detail: `${pendingKitchen} pending, ${preparingKitchen} preparing, ${readyKitchen} ready`,
          path: '/erp/kitchen',
          icon: ChefHat,
          tone: 'bg-amber-50 text-amber-700',
          permission: PERMISSIONS.KITCHEN_ACCESS,
        }
      : null,
    openBills.length > 0
      ? {
          title: `${openBills.length} open table checks`,
          detail: `${formatCurrency(openBillTotal)} currently unpaid`,
          path: '/erp/tables',
          icon: ReceiptText,
          tone: 'bg-sky-50 text-sky-700',
          permission: PERMISSIONS.TABLES_MANAGE,
        }
      : null,
    metrics.lowStockItems > 0
      ? {
          title: `${metrics.lowStockItems} items below minimum stock`,
          detail: 'Review stock before service gets busy',
          path: '/erp/inventory',
          icon: AlertTriangle,
          tone: 'bg-rose-50 text-rose-700',
          permission: PERMISSIONS.INVENTORY_VIEW,
        }
      : null,
    metrics.draftPurchaseOrders > 0
      ? {
          title: `${metrics.draftPurchaseOrders} purchase orders need follow-up`,
          detail: 'Draft, pending, or ordered POs are still open',
          path: '/erp/purchase',
          icon: Truck,
          tone: 'bg-orange-50 text-orange-700',
          permission: PERMISSIONS.PURCHASE_MANAGE,
        }
      : null,
  ].filter((item) => item && canAccess(item.permission)) as Array<{
    title: string;
    detail: string;
    path: string;
    icon: LucideIcon;
    tone: string;
    permission: PermissionId;
  }>;

  const currentTimeLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <span>{companyName || 'CafePilots'}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{activeOutlet?.name || 'All active branches'}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Operations command center
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {user?.name ? `${user.name}, ` : ''}today's service health is ready at a glance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void metricsQuery.refetch()}>
              <RefreshCw className={cn('h-4 w-4', metricsQuery.isFetching && 'animate-spin')} />
              Refresh
            </Button>
            {primaryAction && (
              <Button
                className="gap-2 bg-orange-600 text-white hover:bg-orange-700"
                onClick={() => navigate(primaryAction.path)}
              >
                <primaryAction.icon className="h-4 w-4" />
                {primaryAction.label}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {visibleMetrics.map((metric) => (
            <MetricTile key={metric.label} {...metric} />
          ))}
        </div>

        {(metrics.hadError || metricsQuery.isError) && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Some live metrics could not refresh. Local tables and open checks are still shown.
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-6 lg:col-span-2">
          {quickActions.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant={action.variant === 'primary' ? undefined : 'outline'}
                    className={cn(
                      'h-auto justify-start gap-3 p-4',
                      action.variant === 'primary' && 'bg-slate-950 text-white hover:bg-slate-800'
                    )}
                    onClick={() => navigate(action.path)}
                  >
                    <Icon className={cn('h-5 w-5', action.iconClassName)} />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}

          <section className="space-y-4">
            <div>
              <h2 className="text-base font-black text-slate-950">Work areas</h2>
              <p className="mt-1 text-sm text-slate-500">Role-aware modules for the current session.</p>
            </div>

            {visibleSections.map((section) => (
              <div key={section.id} className="space-y-2">
                <h3 className="px-0.5 text-xs font-bold uppercase text-slate-400">{section.label}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {section.items.map((mod) => (
                    <button
                      type="button"
                      key={mod.title}
                      className="group flex min-h-[92px] items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
                      onClick={() => navigate(mod.path)}
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${BRAND.navy}0F` }}
                      >
                        <mod.icon className="h-5 w-5" style={{ color: BRAND.orange }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-950">{mod.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{mod.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </section>

        <aside className="flex flex-col gap-4 lg:col-span-1">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-orange-600" />
                Priority queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-2">
              {priorityItems.length > 0 ? (
                priorityItems.map((item) => <PriorityItem key={item.title} {...item} />)
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  <CircleCheckBig className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">No urgent follow-up</p>
                    <p className="text-xs text-emerald-700">Service looks calm right now.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {canAccess(PERMISSIONS.TABLES_MANAGE) && (
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Service snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Occupied</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{tableStats.occupied}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Reserved</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{tableStats.reserved}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Cleaning</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{tableStats.cleaning}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Available</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{tableStats.available}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-500">
                  <div className="flex items-center justify-between gap-2">
                    <span>Last viewed</span>
                    <span className="font-semibold text-slate-700">{currentTimeLabel}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
