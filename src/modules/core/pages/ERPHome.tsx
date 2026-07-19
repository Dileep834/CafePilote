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
  Flame,
  LayoutGrid,
  Map,
  Package,
  ReceiptText,
  RefreshCw,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
  Tags,
  Ticket,
  TimerReset,
  TrendingDown,
  TrendingUp,
  Truck,
  Trash2,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND, type RoleType } from '@/constants';
import { PERMISSIONS, type PermissionId } from '@/constants/permissions';
import { supabase } from '@/lib/supabase';
import { hasPlanModule, type PlanModuleId } from '@/lib/planLimits';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermissionsStore } from '@/store/usePermissionsStore';
import { useTenantStore } from '@/store/useTenantStore';
import { useKitchenStore } from '@/modules/kitchen/store/useKitchenStore';
import { usePOSStore } from '@/modules/pos/store/usePOSStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import { formatCurrency } from '@/utils/format';

type ModuleCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  permission: PermissionId;
  planModule?: PlanModuleId;
};

type ModuleSection = {
  id: string;
  label: string;
  items: ModuleCard[];
};

type DashboardMetrics = {
  todayRevenue: number;
  yesterdayRevenue: number;
  completedOrders: number;
  yesterdayCompletedOrders: number;
  heldOrders: number;
  pendingPayments: number;
  lowStockItems: number;
  draftPurchaseOrders: number;
  averageOrderValue: number;
  highestTableBill: number;
  peakHour: string;
  topSellingItem: string;
  slowSellingItem: string;
  hourlySales: Array<{ hour: string; revenue: number }>;
  recentActivity: Array<{
    id: string;
    label: string;
    detail: string;
    amount: number;
    time: string;
  }>;
  hadError: boolean;
};

const EMPTY_METRICS: DashboardMetrics = {
  todayRevenue: 0,
  yesterdayRevenue: 0,
  completedOrders: 0,
  yesterdayCompletedOrders: 0,
  heldOrders: 0,
  pendingPayments: 0,
  lowStockItems: 0,
  draftPurchaseOrders: 0,
  averageOrderValue: 0,
  highestTableBill: 0,
  peakHour: 'No sales yet',
  topSellingItem: 'No item sold yet',
  slowSellingItem: 'No item sold yet',
  hourlySales: [],
  recentActivity: [],
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
        planModule: 'pos',
      },
      {
        title: 'Tables',
        description: 'Seat guests, move parties, print QR codes',
        icon: LayoutGrid,
        path: '/erp/tables',
        permission: PERMISSIONS.TABLES_MANAGE,
        planModule: 'tables',
      },
      {
        title: 'Floor Designer',
        description: 'Maintain table layout and floor-plan mapping',
        icon: Map,
        path: '/erp/floor',
        permission: PERMISSIONS.FLOOR_MANAGE,
        planModule: 'floorDesigner',
      },
      {
        title: 'Kitchen KDS',
        description: 'Move tickets from pending to ready',
        icon: ChefHat,
        path: '/erp/kitchen',
        permission: PERMISSIONS.KITCHEN_ACCESS,
        planModule: 'kitchen',
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
        planModule: 'products',
      },
      {
        title: 'Categories',
        description: 'POS and QR menu grouping',
        icon: Tags,
        path: '/erp/menu/categories',
        permission: PERMISSIONS.MENU_CATEGORIES_MANAGE,
        planModule: 'products',
      },
      {
        title: 'Recipes',
        description: 'BOM and recipe costing',
        icon: BookOpen,
        path: '/erp/menu/recipes',
        permission: PERMISSIONS.RECIPES_MANAGE,
        planModule: 'recipes',
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
        planModule: 'inventory',
      },
      {
        title: 'Daily Stock',
        description: 'Record opening, purchase, use, waste, and closing stock',
        icon: ClipboardList,
        path: '/erp/inventory/daily',
        permission: PERMISSIONS.INVENTORY_DAILY,
        planModule: 'inventory',
      },
      {
        title: 'Purchase Orders',
        description: 'Supplier ordering and receiving follow-up',
        icon: Truck,
        path: '/erp/purchase',
        permission: PERMISSIONS.PURCHASE_MANAGE,
        planModule: 'purchase',
      },
      {
        title: 'Adjustments',
        description: 'Corrections, transfers, and stock changes',
        icon: Package,
        path: '/erp/inventory/adjustments',
        permission: PERMISSIONS.INVENTORY_ADJUST,
        planModule: 'inventory',
      },
      {
        title: 'Waste Log',
        description: 'Track wastage and keep stock honest',
        icon: Trash2,
        path: '/erp/inventory/waste',
        permission: PERMISSIONS.INVENTORY_WASTE,
        planModule: 'inventory',
      },
      {
        title: 'Suppliers',
        description: 'Vendor contacts and purchase setup',
        icon: Store,
        path: '/erp/purchase/suppliers',
        permission: PERMISSIONS.SUPPLIERS_MANAGE,
        planModule: 'suppliers',
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
        planModule: 'crm',
      },
      {
        title: 'Offers',
        description: 'Vouchers and campaigns',
        icon: Ticket,
        path: '/erp/vouchers',
        permission: PERMISSIONS.MARKETING_MANAGE,
        planModule: 'crm',
      },
      {
        title: 'Reports',
        description: 'Sales, orders, and performance review',
        icon: BarChart3,
        path: '/erp/reports',
        permission: PERMISSIONS.REPORTS_VIEW,
        planModule: 'reports',
      },
      {
        title: 'Outlets',
        description: 'Branches, locations, and operating units',
        icon: Building2,
        path: '/erp/franchise',
        permission: PERMISSIONS.FRANCHISE_MANAGE,
        planModule: 'franchise',
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
        planModule: 'staff',
      },
      {
        title: 'Settings',
        description: 'Receipts, printers, roles, and system defaults',
        icon: Settings,
        path: '/erp/settings',
        permission: PERMISSIONS.SETTINGS_MANAGE,
        planModule: 'settings',
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

function startOfYesterdayIso() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function yesterdayEndIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function hourLabel(dateIso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    hour12: true,
  }).format(new Date(dateIso));
}

function shortTimeLabel(dateIso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateIso));
}

function trendPercent(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function canSeeModule(
  item: ModuleCard,
  role: RoleType | undefined,
  hasPermission: (role: RoleType, permissionId: PermissionId) => boolean,
  planId: string | null | undefined
) {
  if (!role) return false;
  return hasPlanModule(planId, item.planModule) && hasPermission(role, item.permission);
}

async function fetchDashboardMetrics(outletId?: string | null): Promise<DashboardMetrics> {
  const metrics: DashboardMetrics = { ...EMPTY_METRICS };
  const today = startOfTodayIso();
  const yesterday = startOfYesterdayIso();
  const yesterdayEnd = yesterdayEndIso();
  const outletFilter = isCloudOutletId(outletId) ? outletId : null;

  try {
    let ordersQuery = supabase
      .from('pos_orders')
      .select(
        `
        id,
        created_at,
        status,
        total_amount,
        payment_method,
        table_number,
        customer_name,
        kitchen_status,
        order_source,
        items:pos_order_items (
          product_name,
          quantity,
          total_price
        )
      `
      )
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(500);

    if (outletFilter) ordersQuery = ordersQuery.eq('outlet_id', outletFilter);

    let { data, error } = await ordersQuery;
    if (error) {
      let fallback = supabase
        .from('pos_orders')
        .select('id, created_at, status, total_amount, payment_method, table_number, customer_name, kitchen_status, order_source')
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false })
        .limit(500);
      if (outletFilter) fallback = fallback.eq('outlet_id', outletFilter);
      const fb = await fallback;
      if (fb.error) throw fb.error;
      data = fb.data as any[];
    }

    const itemQty = new Map<string, number>();
    const hourly = new Map<string, number>();

    for (const order of data || []) {
      const status = String((order as any).status || '');
      const createdAt = String((order as any).created_at || '');
      const total = Number((order as any).total_amount) || 0;
      if (status === 'completed') {
        if (createdAt >= today) {
          metrics.completedOrders += 1;
          metrics.todayRevenue += total;
          metrics.highestTableBill = Math.max(metrics.highestTableBill, total);
          hourly.set(hourLabel(createdAt), (hourly.get(hourLabel(createdAt)) || 0) + total);

          for (const item of ((order as any).items || []) as any[]) {
            const name = String(item.product_name || 'Item');
            itemQty.set(name, (itemQty.get(name) || 0) + (Number(item.quantity) || 0));
          }
        } else if (createdAt >= yesterday && createdAt < yesterdayEnd) {
          metrics.yesterdayCompletedOrders += 1;
          metrics.yesterdayRevenue += total;
        }
      }
      if (status === 'held') {
        metrics.heldOrders += 1;
      }
      if (['open', 'sent'].includes(status) || String((order as any).payment_method || '') === 'pending') {
        metrics.pendingPayments += 1;
      }
    }

    metrics.averageOrderValue =
      metrics.completedOrders > 0 ? metrics.todayRevenue / metrics.completedOrders : 0;

    const itemRanks = [...itemQty.entries()].sort((a, b) => b[1] - a[1]);
    metrics.topSellingItem = itemRanks[0]?.[0] || metrics.topSellingItem;
    metrics.slowSellingItem =
      itemRanks.length > 1 ? itemRanks[itemRanks.length - 1][0] : metrics.slowSellingItem;

    const hourRanks = [...hourly.entries()].sort((a, b) => b[1] - a[1]);
    metrics.peakHour = hourRanks[0] ? `${hourRanks[0][0]} (${formatCurrency(hourRanks[0][1])})` : metrics.peakHour;
    metrics.hourlySales = [...hourly.entries()]
      .reverse()
      .map(([hour, revenue]) => ({ hour, revenue }));
    metrics.recentActivity = (data || [])
      .slice(0, 6)
      .map((order: any) => ({
        id: String(order.id),
        label: order.table_number ? `Table ${order.table_number}` : order.customer_name || 'Walk-in order',
        detail: `${String(order.status || 'order')} - ${String(order.payment_method || 'pending')}`,
        amount: Number(order.total_amount) || 0,
        time: shortTimeLabel(order.created_at),
      }));
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
  trend,
  comparison,
  status,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: number;
  comparison?: string;
  status?: 'good' | 'watch' | 'danger' | 'neutral';
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
  const trendIcon = trend === undefined || trend >= 0 ? TrendingUp : TrendingDown;
  const TrendIcon = trendIcon;
  const statusClass = {
    good: 'bg-emerald-500',
    watch: 'bg-amber-500',
    danger: 'bg-rose-500',
    neutral: 'bg-slate-300',
  }[status || 'neutral'];

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex h-full items-start gap-3 p-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1', toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold uppercase text-slate-500">{label}</p>
            <span className={cn('h-2 w-2 shrink-0 rounded-full', statusClass)} />
          </div>
          <p className="mt-1 text-xl font-black leading-tight text-slate-950">{value}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs leading-snug">
            {trend !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-black',
                  trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                )}
              >
                <TrendIcon className="h-3 w-3" />
                {Math.abs(trend)}%
              </span>
            )}
            <span className="truncate text-slate-500">{detail}</span>
          </div>
          {comparison && <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{comparison}</p>}
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

function QuickInsightsPanel({
  metrics,
  openBills,
  kitchenQueue,
  showTables,
  showKitchen,
}: {
  metrics: DashboardMetrics;
  openBills: number;
  kitchenQueue: number;
  showTables: boolean;
  showKitchen: boolean;
}) {
  const insights = [
    { label: 'Top selling item', value: metrics.topSellingItem, icon: Flame },
    { label: 'Slow selling item', value: metrics.slowSellingItem, icon: TrendingDown },
    { label: 'Peak sales hour', value: metrics.peakHour, icon: Clock3 },
    { label: 'Average order value', value: formatCurrency(metrics.averageOrderValue), icon: ReceiptText },
    { label: 'Highest table bill', value: formatCurrency(metrics.highestTableBill), icon: Store },
    showTables ? { label: 'Running tables', value: String(openBills), icon: LayoutGrid } : null,
    showKitchen ? { label: 'Kitchen delay watch', value: kitchenQueue > 0 ? `${kitchenQueue} active tickets` : 'No active delay', icon: TimerReset } : null,
    { label: 'Pending payments', value: String(metrics.pendingPayments), icon: Ticket },
  ].filter(Boolean) as Array<{ label: string; value: string; icon: LucideIcon }>;

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-orange-600" />
          Quick insights
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 p-4 pt-2 sm:grid-cols-2">
        {insights.map((insight) => (
          <div key={insight.label} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm">
              <insight.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase text-slate-400">{insight.label}</p>
              <p className="truncate text-sm font-black text-slate-900">{insight.value}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OpsAlertsPanel({
  metrics,
  kitchenQueue,
  openBills,
  showInventory,
  showKitchen,
  showTables,
  showPurchase,
}: {
  metrics: DashboardMetrics;
  kitchenQueue: number;
  openBills: number;
  showInventory: boolean;
  showKitchen: boolean;
  showTables: boolean;
  showPurchase: boolean;
}) {
  const alerts = [
    showInventory && metrics.lowStockItems > 0
      ? { title: 'Low stock', detail: `${metrics.lowStockItems} items below minimum`, tone: 'rose', icon: AlertTriangle }
      : null,
    showKitchen && kitchenQueue > 6
      ? { title: 'Kitchen delay', detail: `${kitchenQueue} tickets in service`, tone: 'amber', icon: ChefHat }
      : null,
    showTables && openBills > 8
      ? { title: 'Pending payments', detail: `${openBills} running bills`, tone: 'orange', icon: ReceiptText }
      : null,
    showPurchase && metrics.draftPurchaseOrders > 0
      ? { title: 'Purchase follow-up', detail: `${metrics.draftPurchaseOrders} open purchase orders`, tone: 'sky', icon: Truck }
      : null,
    metrics.pendingPayments > 0
      ? { title: 'Payment mismatch watch', detail: `${metrics.pendingPayments} unpaid or pending orders`, tone: 'amber', icon: Ticket }
      : null,
  ].filter(Boolean) as Array<{
    title: string;
    detail: string;
    tone: 'rose' | 'amber' | 'orange' | 'sky';
    icon: LucideIcon;
  }>;

  const toneClasses = {
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
  };

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-2">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div key={alert.title} className={cn('flex items-start gap-2 rounded-lg border p-3', toneClasses[alert.tone])}>
              <alert.icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-black">{alert.title}</p>
                <p className="text-xs font-semibold opacity-80">{alert.detail}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
            <CircleCheckBig className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-bold">No critical alerts</p>
              <p className="text-xs text-emerald-700">Available modules and payments look stable.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SalesPulsePanel({ metrics }: { metrics: DashboardMetrics }) {
  const chartData = metrics.hourlySales.length > 0 ? metrics.hourlySales : [{ hour: 'Now', revenue: 0 }];

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
        <div>
          <CardTitle className="text-base">Sales pulse</CardTitle>
          <p className="mt-1 text-xs font-semibold text-slate-500">Hourly revenue for the current service day</p>
        </div>
        <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-black text-orange-700">
          {formatCurrency(metrics.todayRevenue)}
        </span>
      </CardHeader>
      <CardContent className="h-56 p-4 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="salesPulse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#FF6A00" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              labelClassName="font-bold text-slate-800"
              contentStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#FF6A00"
              strokeWidth={3}
              fill="url(#salesPulse)"
              dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function RecentActivityPanel({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-2">
        {metrics.recentActivity.length > 0 ? (
          metrics.recentActivity.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{item.label}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{item.detail}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black text-slate-900">{formatCurrency(item.amount)}</p>
                <p className="text-[11px] font-bold text-slate-400">{item.time}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-500">
            No service activity yet today.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ERPHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const planId = useTenantStore((s) => s.planId);
  const companyName = useTenantStore((s) => s.companyName);
  const outlets = useTenantStore((s) => s.outlets);
  const tables = useTableStore((s) => s.tables);
  const fetchTables = useTableStore((s) => s.fetchTables);
  const bills = useTableBillStore((s) => s.bills);
  const getBillTotal = useTableBillStore((s) => s.getBillTotal);
  const hydrateOpenBills = useTableBillStore((s) => s.hydrateOpenBills);
  const kitchenOrders = useKitchenStore((s) => s.orders);
  const fetchKitchenOrders = useKitchenStore((s) => s.fetchOrders);
  const posCart = usePOSStore((s) => s.cart);
  const activeTableId = usePOSStore((s) => s.activeTableId);
  const lastOrder = usePOSStore((s) => s.lastOrder);

  const activeOutlet = outlets.find((outlet) => outlet.id === activeOutletId);
  const canAccess = (permission: PermissionId, planModule?: PlanModuleId) =>
    Boolean(user?.role && hasPlanModule(planId, planModule) && hasPermission(user.role, permission));
  const canAccessAny = (permissions: PermissionId[], planModule?: PlanModuleId) =>
    Boolean(
      user?.role &&
      hasPlanModule(planId, planModule) &&
      permissions.some((permission) => hasPermission(user.role, permission))
    );

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            canSeeModule(item, user?.role, hasPermission, planId)
          ),
        }))
        .filter((section) => section.items.length > 0),
    [hasPermission, planId, user?.role]
  );

  useEffect(() => {
    void fetchTables(activeOutletId || undefined);
    void hydrateOpenBills(activeOutletId || undefined);
    void fetchKitchenOrders();
  }, [activeOutletId, fetchKitchenOrders, fetchTables, hydrateOpenBills]);

  const metricsQuery = useQuery({
    queryKey: ['erp-home-metrics', activeOutletId],
    queryFn: () => fetchDashboardMetrics(activeOutletId),
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const refetchMetrics = metricsQuery.refetch;

  useEffect(() => {
    const refreshAfterOrder = () => void refetchMetrics();
    window.addEventListener('cafepilots:orders-updated', refreshAfterOrder);
    return () => window.removeEventListener('cafepilots:orders-updated', refreshAfterOrder);
  }, [refetchMetrics]);

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
  const highestOpenBillTotal = openBills.reduce(
    (highest, bill) => Math.max(highest, getBillTotal(bill)),
    0
  );
  const activeTableBill = activeTableId
    ? openBills.find((bill) => bill.tableId === activeTableId)
    : undefined;
  const activeTableBillTotal = activeTableBill ? getBillTotal(activeTableBill) : 0;
  const activeTableBillItems =
    activeTableBill?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const openBillItemCount = openBills.reduce(
    (sum, bill) => sum + bill.items.reduce((qty, item) => qty + item.quantity, 0),
    0
  );
  const posCartTotal = posCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const posCartItems = posCart.reduce((sum, item) => sum + item.quantity, 0);
  const cartNeedsOwnCheck = posCart.length > 0 && !activeTableBill;
  const liveOpenChecks = openBills.length + (cartNeedsOwnCheck ? 1 : 0);
  const liveOpenBillTotal =
    activeTableId && activeTableBill
      ? openBillTotal - activeTableBillTotal + Math.max(activeTableBillTotal, posCartTotal)
      : openBillTotal + posCartTotal;
  const liveOpenItemCount =
    activeTableId && activeTableBill
      ? openBillItemCount - activeTableBillItems + Math.max(activeTableBillItems, posCartItems)
      : openBillItemCount + posCartItems;
  const lastOrderId = lastOrder?.id ? String(lastOrder.id) : '';
  const lastOrderTotal = Number(lastOrder?.totalAmount) || 0;
  const lastOrderTimestamp = String(lastOrder?.timestamp || '');
  const lastOrderAlreadySynced = Boolean(
    lastOrderId && metrics.recentActivity.some((activity) => activity.id === lastOrderId)
  );
  const lastOrderMatchesOutlet =
    !activeOutletId ||
    activeOutletId === 'current-outlet' ||
    !lastOrder?.outletId ||
    lastOrder.outletId === activeOutletId;
  const showSettledOrderPreview =
    lastOrderTotal > 0 &&
    lastOrderTimestamp >= startOfTodayIso() &&
    lastOrderMatchesOutlet &&
    !lastOrderAlreadySynced;
  const livePendingPayments = Math.max(metrics.pendingPayments, liveOpenChecks);
  const displayCompletedOrders = metrics.completedOrders + (showSettledOrderPreview ? 1 : 0);
  const displayTodayRevenue =
    metrics.todayRevenue + (showSettledOrderPreview ? lastOrderTotal : 0);
  const displayMetrics = {
    ...metrics,
    todayRevenue: displayTodayRevenue,
    completedOrders: displayCompletedOrders,
    pendingPayments: livePendingPayments,
    averageOrderValue:
      displayCompletedOrders > 0 ? displayTodayRevenue / displayCompletedOrders : 0,
    highestTableBill: Math.max(
      metrics.highestTableBill,
      highestOpenBillTotal,
      posCartTotal,
      showSettledOrderPreview ? lastOrderTotal : 0
    ),
    recentActivity: showSettledOrderPreview
      ? [
          {
            id: lastOrderId || `local-${lastOrderTimestamp}`,
            label: lastOrder?.tableLabel
              ? `Table ${lastOrder.tableLabel}`
              : lastOrder?.customer?.name || 'Walk-in order',
            detail: `completed - ${String(lastOrder?.paymentMethod || 'paid')}`,
            amount: lastOrderTotal,
            time: shortTimeLabel(lastOrderTimestamp),
          },
          ...metrics.recentActivity,
        ].slice(0, 6)
      : metrics.recentActivity,
  };
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
      planModule: 'pos' as const,
      variant: 'primary',
    },
    {
      label: 'Table board',
      path: '/erp/tables',
      icon: LayoutGrid,
      iconClassName: 'text-sky-600',
      permission: PERMISSIONS.TABLES_MANAGE,
      planModule: 'tables' as const,
      variant: 'outline',
    },
    {
      label: 'Kitchen display',
      path: '/erp/kitchen',
      icon: ChefHat,
      iconClassName: 'text-amber-600',
      permission: PERMISSIONS.KITCHEN_ACCESS,
      planModule: 'kitchen' as const,
      variant: 'outline',
    },
    {
      label: 'Daily report',
      path: '/erp/reports',
      icon: BarChart3,
      iconClassName: 'text-emerald-600',
      permission: PERMISSIONS.REPORTS_VIEW,
      planModule: 'reports' as const,
      variant: 'outline',
    },
    {
      label: 'Daily stock',
      path: '/erp/inventory/daily',
      icon: ClipboardList,
      iconClassName: 'text-rose-600',
      permission: PERMISSIONS.INVENTORY_DAILY,
      planModule: 'inventory' as const,
      variant: 'outline',
    },
  ].filter((action) => canAccess(action.permission, action.planModule));

  const primaryAction = quickActions[0];

  const visibleMetrics = [
    {
      label: 'Today sales',
      value: formatCurrency(displayMetrics.todayRevenue),
      detail: `${displayMetrics.completedOrders} paid, ${liveOpenChecks} running`,
      trend: trendPercent(displayMetrics.todayRevenue, displayMetrics.yesterdayRevenue),
      comparison: `Yesterday ${formatCurrency(displayMetrics.yesterdayRevenue)}`,
      icon: BarChart3,
      tone: 'emerald' as const,
      status: displayMetrics.todayRevenue >= displayMetrics.yesterdayRevenue ? 'good' as const : 'watch' as const,
      permissions: [PERMISSIONS.POS_ACCESS, PERMISSIONS.REPORTS_VIEW],
      planModule: 'pos' as const,
    },
    {
      label: 'Table load',
      value: `${tableStats.active}/${Math.max(tableStats.total, 1)}`,
      detail: `${tableStats.available} available now`,
      comparison: `${tableStats.occupied} occupied, ${tableStats.cleaning} cleaning`,
      icon: Store,
      tone: 'sky' as const,
      status: tableStats.available > 0 ? 'good' as const : 'danger' as const,
      permissions: [PERMISSIONS.TABLES_MANAGE],
      planModule: 'tables' as const,
    },
    {
      label: 'Kitchen queue',
      value: String(kitchenQueue),
      detail: `${readyKitchen} ready to serve`,
      comparison: `${pendingKitchen} pending, ${preparingKitchen} preparing`,
      icon: ChefHat,
      tone: (kitchenQueue > 0 ? 'amber' : 'slate') as const,
      status: kitchenQueue > 6 ? 'danger' as const : kitchenQueue > 0 ? 'watch' as const : 'good' as const,
      permissions: [PERMISSIONS.KITCHEN_ACCESS],
      planModule: 'kitchen' as const,
    },
    {
      label: 'Running bills',
      value: String(liveOpenChecks),
      detail: `${liveOpenItemCount} items - ${formatCurrency(liveOpenBillTotal)}`,
      comparison: `${livePendingPayments} payment follow-ups`,
      icon: ReceiptText,
      tone: (liveOpenChecks > 0 ? 'orange' : 'slate') as const,
      status: liveOpenChecks > 8 ? 'danger' as const : liveOpenChecks > 0 ? 'watch' as const : 'good' as const,
      permissions: [PERMISSIONS.POS_ACCESS, PERMISSIONS.TABLES_MANAGE],
      planModule: 'pos' as const,
    },
    {
      label: 'Stock watch',
      value: String(metrics.lowStockItems),
      detail: 'items below minimum',
      comparison: 'Auto recipe deduction ready',
      icon: AlertTriangle,
      tone: (metrics.lowStockItems > 0 ? 'rose' : 'slate') as const,
      status: metrics.lowStockItems > 0 ? 'danger' as const : 'good' as const,
      permissions: [PERMISSIONS.INVENTORY_VIEW],
      planModule: 'inventory' as const,
    },
    {
      label: 'Follow-up',
      value: String(metrics.heldOrders + metrics.draftPurchaseOrders),
      detail: `${metrics.heldOrders} held orders, ${metrics.draftPurchaseOrders} POs pending`,
      comparison: 'Resolve before closing shift',
      icon: Clock3,
      tone: (metrics.heldOrders + metrics.draftPurchaseOrders > 0 ? 'amber' : 'slate') as const,
      status: metrics.heldOrders + metrics.draftPurchaseOrders > 0 ? 'watch' as const : 'good' as const,
      permissions: [PERMISSIONS.POS_ACCESS, PERMISSIONS.PURCHASE_MANAGE],
      planModule: 'pos' as const,
    },
  ].filter((metric) => canAccessAny(metric.permissions, metric.planModule));

  const priorityItems = [
    kitchenQueue > 0
      ? {
          title: `${kitchenQueue} kitchen tickets in motion`,
          detail: `${pendingKitchen} pending, ${preparingKitchen} preparing, ${readyKitchen} ready`,
          path: '/erp/kitchen',
          icon: ChefHat,
          tone: 'bg-amber-50 text-amber-700',
          permission: PERMISSIONS.KITCHEN_ACCESS,
          planModule: 'kitchen' as const,
        }
      : null,
    liveOpenChecks > 0
      ? {
          title: `${liveOpenChecks} running bills in service`,
          detail: `${liveOpenItemCount} items - ${formatCurrency(liveOpenBillTotal)} unpaid`,
          path: '/erp/tables',
          icon: ReceiptText,
          tone: 'bg-sky-50 text-sky-700',
          permission: PERMISSIONS.TABLES_MANAGE,
          planModule: 'tables' as const,
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
          planModule: 'inventory' as const,
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
          planModule: 'purchase' as const,
        }
      : null,
  ].filter((item) => item && canAccess(item.permission, item.planModule)) as Array<{
    title: string;
    detail: string;
    path: string;
    icon: LucideIcon;
    tone: string;
    permission: PermissionId;
    planModule: PlanModuleId;
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
            Some live metrics could not refresh. Local tables and running bills are still shown.
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-6 lg:col-span-2">
          {canAccessAny([PERMISSIONS.POS_ACCESS, PERMISSIONS.REPORTS_VIEW]) && (
            <SalesPulsePanel metrics={displayMetrics} />
          )}

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
          <QuickInsightsPanel
            metrics={displayMetrics}
            openBills={liveOpenChecks}
            kitchenQueue={kitchenQueue}
            showTables={canAccess(PERMISSIONS.TABLES_MANAGE, 'tables')}
            showKitchen={canAccess(PERMISSIONS.KITCHEN_ACCESS, 'kitchen')}
          />

          <OpsAlertsPanel
            metrics={displayMetrics}
            kitchenQueue={kitchenQueue}
            openBills={liveOpenChecks}
            showInventory={canAccess(PERMISSIONS.INVENTORY_VIEW, 'inventory')}
            showKitchen={canAccess(PERMISSIONS.KITCHEN_ACCESS, 'kitchen')}
            showTables={canAccess(PERMISSIONS.TABLES_MANAGE, 'tables')}
            showPurchase={canAccess(PERMISSIONS.PURCHASE_MANAGE, 'purchase')}
          />

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

          {canAccess(PERMISSIONS.TABLES_MANAGE, 'tables') && (
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

          <RecentActivityPanel metrics={displayMetrics} />
        </aside>
      </div>
    </div>
  );
}
