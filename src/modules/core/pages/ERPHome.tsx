import { lazy, Suspense, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  ChefHat,
  CircleCheckBig,
  Clock3,
  ClipboardList,
  Flame,
  Globe2,
  LayoutGrid,
  Map as MapIcon,
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

const SalesPulseChart = lazy(async () => {
  const { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } = await import('recharts');

  function Chart({ data }: { data: Array<{ hour: string; revenue: number; orders: number }> }) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="salesPulse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#FF6A00" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="hour"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tick={{ fontSize: 10, fill: '#64748B' }}
          />
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
            dot={{ r: 2.5, strokeWidth: 2, fill: '#fff' }}
            isAnimationActive
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return { default: Chart };
});

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
  poDraft: number;
  poPending: number;
  poReceived: number;
  wasteToday: number;
  averageOrderValue: number;
  highestTableBill: number;
  peakHour: string;
  topSellingItem: string;
  slowSellingItem: string;
  hourlySales: Array<{ hour: string; revenue: number; orders: number }>;
  recentActivity: Array<{
    id: string;
    label: string;
    detail: string;
    amount: number;
    time: string;
    kind: 'sale' | 'kitchen' | 'table' | 'purchase' | 'other';
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
  poDraft: 0,
  poPending: 0,
  poReceived: 0,
  wasteToday: 0,
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
        title: 'Online Orders',
        description: 'Swiggy, Zomato, ONDC, QR, website & phone orders',
        icon: Globe2,
        path: '/erp/online-orders',
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
        icon: MapIcon,
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
    hour: 'numeric',
    hour12: true,
  }).format(new Date(dateIso));
}

function buildHourlyBuckets() {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (let h = 8; h <= 23; h++) {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    const label = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: true }).format(d);
    map.set(label, { revenue: 0, orders: 0 });
  }
  return map;
}

function activityKind(status: string, source: string): DashboardMetrics['recentActivity'][number]['kind'] {
  if (status === 'sent' || status === 'preparing' || status === 'ready') return 'kitchen';
  if (status === 'open') return 'table';
  if (status === 'completed') return 'sale';
  if (source === 'qr') return 'table';
  return 'other';
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
    const hourly = buildHourlyBuckets();

    for (const order of data || []) {
      const status = String((order as any).status || '');
      const createdAt = String((order as any).created_at || '');
      const total = Number((order as any).total_amount) || 0;
      if (status === 'completed') {
        if (createdAt >= today) {
          metrics.completedOrders += 1;
          metrics.todayRevenue += total;
          metrics.highestTableBill = Math.max(metrics.highestTableBill, total);
          const bucket = hourLabel(createdAt);
          const current = hourly.get(bucket) || { revenue: 0, orders: 0 };
          hourly.set(bucket, {
            revenue: current.revenue + total,
            orders: current.orders + 1,
          });

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

    const hourRanks = [...hourly.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
    metrics.peakHour = hourRanks[0]?.[1].revenue
      ? `${hourRanks[0][0]} (${formatCurrency(hourRanks[0][1].revenue)})`
      : metrics.peakHour;
    metrics.hourlySales = [...hourly.entries()].map(([hour, stats]) => ({
      hour,
      revenue: stats.revenue,
      orders: stats.orders,
    }));
    metrics.recentActivity = (data || [])
      .slice(0, 8)
      .map((order: any) => {
        const status = String(order.status || 'order');
        const source = String(order.order_source || 'pos');
        const table = order.table_number ? `Table ${order.table_number}` : null;
        const label =
          status === 'completed'
            ? table
              ? `Invoice settled · ${table}`
              : 'Invoice created'
            : status === 'sent'
              ? `Kitchen ticket · ${table || 'Counter'}`
              : status === 'open'
                ? `Open bill · ${table || 'Walk-in'}`
                : status === 'held'
                  ? 'Order held'
                  : table || order.customer_name || 'Walk-in order';
        return {
          id: String(order.id),
          label,
          detail: `${status}${source === 'qr' ? ' · QR' : ' · POS'} · ${String(order.payment_method || 'pending')}`,
          amount: Number(order.total_amount) || 0,
          time: shortTimeLabel(order.created_at),
          kind: activityKind(status, source),
        };
      });
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

    const rows = data || [];
    metrics.poDraft = rows.filter((po: any) => String(po.status || '').toLowerCase() === 'draft').length;
    metrics.poPending = rows.filter((po: any) =>
      ['pending', 'ordered', 'approved'].includes(String(po.status || '').toLowerCase())
    ).length;
    metrics.poReceived = rows.filter((po: any) => String(po.status || '').toLowerCase() === 'received').length;
    metrics.draftPurchaseOrders = metrics.poDraft + metrics.poPending;
  } catch {
    metrics.hadError = true;
  }

  try {
    const todayDate = new Date().toISOString().slice(0, 10);
    let wasteQuery = supabase
      .from('waste_logs')
      .select('id', { count: 'exact', head: true })
      .eq('date', todayDate);
    if (outletFilter) wasteQuery = wasteQuery.eq('franchise_id', outletFilter);
    const { count, error } = await wasteQuery;
    if (!error && typeof count === 'number') metrics.wasteToday = count;
  } catch {
    // waste optional
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
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: number;
  comparison?: string;
  status?: 'good' | 'watch' | 'danger' | 'neutral';
  icon: LucideIcon;
  tone: 'orange' | 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
  actionLabel?: string;
  onAction?: () => void;
}) {
  const toneClass = {
    orange: 'bg-orange-50 text-orange-700 ring-orange-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-50 text-slate-700 ring-slate-100',
  }[tone];
  const TrendIcon = trend === undefined || trend >= 0 ? TrendingUp : TrendingDown;
  const statusClass = {
    good: 'bg-emerald-500',
    watch: 'bg-amber-500',
    danger: 'bg-rose-500',
    neutral: 'bg-slate-300',
  }[status || 'neutral'];
  const Comp = onAction ? 'button' : 'div';

  return (
    <Comp
      type={onAction ? 'button' : undefined}
      onClick={onAction}
      className={cn(
        'group flex h-full min-h-[132px] flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200',
        onAction &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1', toneClass)}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <span className={cn('h-2 w-2 shrink-0 rounded-full', statusClass)} aria-hidden />
          </div>
          <p className="mt-1 text-2xl font-black leading-none tabular-nums text-slate-950">{value}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs leading-snug">
            {trend !== undefined ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold',
                  trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                )}
              >
                <TrendIcon className="h-3 w-3" />
                {trend >= 0 ? '▲' : '▼'}
                {Math.abs(trend)}%
              </span>
            ) : null}
            <span className="text-slate-500">{detail}</span>
          </div>
          {comparison ? <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{comparison}</p> : null}
        </div>
      </div>
      {actionLabel && onAction ? (
        <span className="mt-auto pt-3 text-xs font-bold text-[#FF6A00] transition group-hover:underline">
          {actionLabel} →
        </span>
      ) : null}
    </Comp>
  );
}

function PriorityItem({
  title,
  value,
  detail,
  meta,
  path,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  meta?: string;
  path: string;
  icon: LucideIcon;
  tone: string;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40"
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
        <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-600">{detail}</p>
        {meta ? <p className="mt-1 text-xs text-slate-400">{meta}</p> : null}
      </div>
      <span className="shrink-0 pt-1 text-xs font-bold text-[#FF6A00]">Open →</span>
    </button>
  );
}

function QuickInsightsPanel({
  metrics,
  openBills,
  kitchenQueue,
  showTables,
  showKitchen,
  showInventory,
  showPurchase,
}: {
  metrics: DashboardMetrics;
  openBills: number;
  kitchenQueue: number;
  showTables: boolean;
  showKitchen: boolean;
  showInventory: boolean;
  showPurchase: boolean;
}) {
  const groups = [
    {
      title: 'Sales',
      items: [
        { label: 'Top Selling', value: metrics.topSellingItem, icon: Flame },
        { label: 'Slow Selling', value: metrics.slowSellingItem, icon: TrendingDown },
        { label: 'Peak Hour', value: metrics.peakHour, icon: Clock3 },
      ],
    },
    {
      title: 'Operations',
      items: [
        showKitchen
          ? { label: 'Kitchen Delay', value: kitchenQueue > 0 ? `${kitchenQueue} active` : 'Clear', icon: TimerReset }
          : null,
        showTables ? { label: 'Running Tables', value: String(openBills), icon: LayoutGrid } : null,
        { label: 'Average Order', value: formatCurrency(metrics.averageOrderValue), icon: ReceiptText },
      ].filter(Boolean) as Array<{ label: string; value: string; icon: LucideIcon }>,
    },
    {
      title: 'Inventory',
      items: [
        showInventory ? { label: 'Low Stock', value: String(metrics.lowStockItems), icon: AlertTriangle } : null,
        showInventory ? { label: 'Waste Today', value: String(metrics.wasteToday), icon: Trash2 } : null,
        showPurchase ? { label: 'Pending Purchase', value: String(metrics.draftPurchaseOrders), icon: Truck } : null,
      ].filter(Boolean) as Array<{ label: string; value: string; icon: LucideIcon }>,
    },
  ].filter((g) => g.items.length > 0);

  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Sparkles className="h-4 w-4 text-[#FF6A00]" />
          Quick insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-2">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{group.title}</p>
            <div className="grid grid-cols-1 gap-2">
              {group.items.map((insight) => (
                <div
                  key={`${group.title}-${insight.label}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#FF6A00] shadow-sm ring-1 ring-slate-100">
                    <insight.icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {insight.label}
                    </p>
                    <p className="truncate text-sm font-bold text-slate-900">{insight.value}</p>
                  </div>
                </div>
              ))}
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
  onNavigate,
}: {
  metrics: DashboardMetrics;
  kitchenQueue: number;
  openBills: number;
  showInventory: boolean;
  showKitchen: boolean;
  showTables: boolean;
  showPurchase: boolean;
  onNavigate: (path: string) => void;
}) {
  const alerts = [
    showInventory && metrics.lowStockItems > 0
      ? {
          severity: 'critical' as const,
          title: 'Critical · Low stock',
          detail: `${metrics.lowStockItems} items are below minimum. Restock before peak service.`,
          action: 'View inventory',
          path: '/erp/inventory',
          icon: AlertTriangle,
        }
      : null,
    showKitchen && kitchenQueue > 6
      ? {
          severity: 'warning' as const,
          title: 'Warning · Kitchen delay',
          detail: `${kitchenQueue} tickets in queue. Prioritize ready tickets.`,
          action: 'Open kitchen',
          path: '/erp/kitchen',
          icon: ChefHat,
        }
      : null,
    showTables && openBills > 8
      ? {
          severity: 'warning' as const,
          title: 'Warning · Running bills',
          detail: `${openBills} open checks need settlement attention.`,
          action: 'View tables',
          path: '/erp/tables',
          icon: ReceiptText,
        }
      : null,
    showPurchase && metrics.draftPurchaseOrders > 0
      ? {
          severity: 'info' as const,
          title: 'Info · Purchase follow-up',
          detail: `${metrics.draftPurchaseOrders} purchase orders are still open.`,
          action: 'View POs',
          path: '/erp/purchase',
          icon: Truck,
        }
      : null,
    metrics.pendingPayments > 0 && !(showTables && openBills > 8)
      ? {
          severity: 'info' as const,
          title: 'Info · Pending payments',
          detail: `${metrics.pendingPayments} unpaid or pending orders.`,
          action: 'Open POS',
          path: '/erp/pos',
          icon: Ticket,
        }
      : null,
  ].filter(Boolean) as Array<{
    severity: 'critical' | 'warning' | 'info';
    title: string;
    detail: string;
    action: string;
    path: string;
    icon: LucideIcon;
  }>;

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const toneClasses = {
    critical: 'border-rose-200 bg-rose-50 text-rose-800',
    warning: 'border-orange-200 bg-orange-50 text-orange-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    resolved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };

  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <AlertTriangle className="h-4 w-4 text-[#FF6A00]" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-2">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div key={alert.title} className={cn('rounded-xl border p-3', toneClasses[alert.severity])}>
              <div className="flex items-start gap-2">
                <alert.icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{alert.title}</p>
                  <p className="mt-0.5 text-xs font-medium opacity-90">{alert.detail}</p>
                  <button
                    type="button"
                    onClick={() => onNavigate(alert.path)}
                    className="mt-2 text-xs font-bold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40"
                  >
                    {alert.action} →
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={cn('flex items-start gap-3 rounded-xl border p-3', toneClasses.resolved)}>
            <CircleCheckBig className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-bold">Resolved · No critical alerts</p>
              <p className="mt-0.5 text-xs font-medium text-emerald-700">
                Service, stock, and payments look stable right now.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SalesPulsePanel({
  metrics,
  onNewBill,
}: {
  metrics: DashboardMetrics;
  onNewBill?: () => void;
}) {
  const hasSales = metrics.completedOrders > 0 || metrics.todayRevenue > 0;
  const chartData = metrics.hourlySales.length > 0 ? metrics.hourlySales : buildHourlyBucketsArray();
  const trend = trendPercent(metrics.todayRevenue, metrics.yesterdayRevenue);

  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-3 p-4 pb-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="text-base font-bold">Sales pulse</CardTitle>
          <p className="mt-1 text-xs font-semibold text-slate-500">Hourly revenue for today&apos;s service</p>
        </div>
        {hasSales ? (
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Today&apos;s Revenue</p>
            <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-950">
              {formatCurrency(metrics.todayRevenue)}
            </p>
            <p
              className={cn(
                'mt-1 text-xs font-bold',
                trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {trend >= 0 ? '▲' : '▼'}
              {Math.abs(trend)}% vs Yesterday
            </p>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {hasSales ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Orders</p>
                <p className="mt-1 text-xl font-black tabular-nums text-slate-950">{metrics.completedOrders}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Avg Order</p>
                <p className="mt-1 text-xl font-black tabular-nums text-slate-950">
                  {formatCurrency(metrics.averageOrderValue)}
                </p>
              </div>
              <div className="col-span-2 rounded-xl bg-orange-50 p-3 sm:col-span-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-orange-600/80">Total Revenue</p>
                <p className="mt-1 text-xl font-black tabular-nums text-orange-700">
                  {formatCurrency(metrics.todayRevenue)}
                </p>
              </div>
            </div>
            <div className="h-52">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center rounded-xl bg-slate-50">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" aria-hidden />
                    <span className="sr-only">Loading chart</span>
                  </div>
                }
              >
                <SalesPulseChart data={chartData} />
              </Suspense>
            </div>
          </>
        ) : (
          <div className="flex h-56 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 text-center">
            <BarChart3 className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
            <p className="text-base font-bold text-slate-800">No sales yet today</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Create your first bill to start the hourly sales pulse.
            </p>
            {onNewBill ? (
              <Button
                type="button"
                className="mt-4 h-11 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
                onClick={onNewBill}
              >
                <ShoppingCart className="h-4 w-4" />
                New Bill
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function buildHourlyBucketsArray() {
  return [...buildHourlyBuckets().entries()].map(([hour, stats]) => ({
    hour,
    revenue: stats.revenue,
    orders: stats.orders,
  }));
}

function RecentActivityPanel({
  metrics,
  onNewBill,
}: {
  metrics: DashboardMetrics;
  onNewBill?: () => void;
}) {
  const kindIcon: Record<DashboardMetrics['recentActivity'][number]['kind'], LucideIcon> = {
    sale: ReceiptText,
    kitchen: ChefHat,
    table: LayoutGrid,
    purchase: Truck,
    other: Activity,
  };
  const kindTone: Record<DashboardMetrics['recentActivity'][number]['kind'], string> = {
    sale: 'bg-emerald-50 text-emerald-700',
    kitchen: 'bg-amber-50 text-amber-700',
    table: 'bg-sky-50 text-sky-700',
    purchase: 'bg-orange-50 text-orange-700',
    other: 'bg-slate-100 text-slate-600',
  };

  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-bold">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {metrics.recentActivity.length > 0 ? (
          <ol className="relative space-y-0 border-l border-slate-200 pl-4">
            {metrics.recentActivity.map((item) => {
              const Icon = kindIcon[item.kind] || Activity;
              return (
                <li key={item.id} className="relative pb-4 last:pb-0">
                  <span
                    className={cn(
                      'absolute -left-[1.4rem] flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white',
                      kindTone[item.kind]
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="ml-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{item.time}</p>
                      <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{item.label}</p>
                      <p className="truncate text-xs text-slate-500">{item.detail}</p>
                    </div>
                    {item.amount > 0 ? (
                      <p className="shrink-0 text-sm font-black tabular-nums text-slate-900">
                        {formatCurrency(item.amount)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <Activity className="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden />
            <p className="text-sm font-bold text-slate-800">No service activity yet today</p>
            <p className="mt-1 text-xs text-slate-500">Orders, kitchen tickets, and settlements will appear here.</p>
            {onNewBill ? (
              <Button
                type="button"
                className="mt-4 h-10 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
                onClick={onNewBill}
              >
                New Bill
              </Button>
            ) : null}
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

  useEffect(() => {
    if (!activeOutletId || activeOutletId === 'current-outlet' || activeOutletId.startsWith('local')) {
      return;
    }
    if (!metricsQuery.data || metricsQuery.data.lowStockItems <= 0) return;
    const key = `cp-lowstock-notified-${activeOutletId}`;
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < 60 * 60 * 1000) return;
    sessionStorage.setItem(key, String(Date.now()));
    void import('@/modules/ops/services/inventoryAutomationService').then(({ notifyLowStock }) =>
      notifyLowStock(activeOutletId)
    );
  }, [activeOutletId, metricsQuery.data]);

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
              ? `Invoice · Table ${lastOrder.tableLabel}`
              : lastOrder?.customer?.name || 'Invoice created',
            detail: `Completed · ${String(lastOrder?.paymentMethod || 'paid')}`,
            amount: lastOrderTotal,
            time: shortTimeLabel(lastOrderTimestamp),
            kind: 'sale' as const,
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
      label: 'New Bill',
      path: '/erp/pos',
      icon: ShoppingCart,
      permission: PERMISSIONS.POS_ACCESS,
      planModule: 'pos' as const,
      variant: 'primary' as const,
    },
    {
      label: 'Online Orders',
      path: '/erp/online-orders',
      icon: Globe2,
      permission: PERMISSIONS.POS_ACCESS,
      planModule: 'pos' as const,
      variant: 'secondary' as const,
    },
    {
      label: 'Kitchen',
      path: '/erp/kitchen',
      icon: ChefHat,
      permission: PERMISSIONS.KITCHEN_ACCESS,
      planModule: 'kitchen' as const,
      variant: 'secondary' as const,
    },
    {
      label: 'Tables',
      path: '/erp/tables',
      icon: LayoutGrid,
      permission: PERMISSIONS.TABLES_MANAGE,
      planModule: 'tables' as const,
      variant: 'secondary' as const,
    },
    {
      label: 'Daily Stock',
      path: '/erp/inventory/daily',
      icon: ClipboardList,
      permission: PERMISSIONS.INVENTORY_DAILY,
      planModule: 'inventory' as const,
      variant: 'secondary' as const,
    },
    {
      label: 'Purchase Order',
      path: '/erp/purchase',
      icon: Truck,
      permission: PERMISSIONS.PURCHASE_MANAGE,
      planModule: 'purchase' as const,
      variant: 'secondary' as const,
    },
  ].filter((action) => canAccess(action.permission, action.planModule));

  const primaryAction = quickActions.find((a) => a.variant === 'primary') || quickActions[0];

  const visibleMetrics = [
    {
      label: 'Today sales',
      value: formatCurrency(displayMetrics.todayRevenue),
      detail: `${displayMetrics.completedOrders} paid orders`,
      trend: trendPercent(displayMetrics.todayRevenue, displayMetrics.yesterdayRevenue),
      comparison: `Yesterday ${formatCurrency(displayMetrics.yesterdayRevenue)}`,
      icon: BarChart3,
      tone: 'emerald' as const,
      status: (displayMetrics.todayRevenue >= displayMetrics.yesterdayRevenue ? 'good' : 'watch') as const,
      actionLabel: 'View POS',
      onAction: () => navigate('/erp/pos'),
      permissions: [PERMISSIONS.POS_ACCESS, PERMISSIONS.REPORTS_VIEW],
      planModule: 'pos' as const,
    },
    {
      label: 'Kitchen Queue',
      value: `${kitchenQueue} Orders`,
      detail: `${pendingKitchen} Pending · ${preparingKitchen} Preparing · ${readyKitchen} Ready`,
      comparison: kitchenQueue > 0 ? 'Tickets need attention' : 'Kitchen is clear',
      icon: ChefHat,
      tone: (kitchenQueue > 0 ? 'amber' : 'slate') as const,
      status: (kitchenQueue > 6 ? 'danger' : kitchenQueue > 0 ? 'watch' : 'good') as const,
      actionLabel: 'Open Kitchen',
      onAction: () => navigate('/erp/kitchen'),
      permissions: [PERMISSIONS.KITCHEN_ACCESS],
      planModule: 'kitchen' as const,
    },
    {
      label: 'Running Bills',
      value: String(liveOpenChecks),
      detail: `${formatCurrency(liveOpenBillTotal)} pending`,
      comparison: `${liveOpenItemCount} items across open checks`,
      icon: ReceiptText,
      tone: (liveOpenChecks > 0 ? 'orange' : 'slate') as const,
      status: (liveOpenChecks > 8 ? 'danger' : liveOpenChecks > 0 ? 'watch' : 'good') as const,
      actionLabel: 'Open Tables',
      onAction: () => navigate('/erp/tables'),
      permissions: [PERMISSIONS.POS_ACCESS, PERMISSIONS.TABLES_MANAGE],
      planModule: 'pos' as const,
    },
    {
      label: 'Table load',
      value: `${tableStats.active}/${Math.max(tableStats.total, 1)}`,
      detail: `${tableStats.available} available now`,
      comparison: `${tableStats.occupied} occupied · ${tableStats.cleaning} cleaning`,
      icon: Store,
      tone: 'sky' as const,
      status: (tableStats.available > 0 ? 'good' : 'danger') as const,
      actionLabel: 'View floor',
      onAction: () => navigate('/erp/tables'),
      permissions: [PERMISSIONS.TABLES_MANAGE],
      planModule: 'tables' as const,
    },
    {
      label: 'Stock watch',
      value: String(metrics.lowStockItems),
      detail: 'items below minimum',
      comparison: metrics.wasteToday > 0 ? `${metrics.wasteToday} waste logs today` : 'Waste clear today',
      icon: AlertTriangle,
      tone: (metrics.lowStockItems > 0 ? 'rose' : 'slate') as const,
      status: (metrics.lowStockItems > 0 ? 'danger' : 'good') as const,
      actionLabel: 'View inventory',
      onAction: () => navigate('/erp/inventory'),
      permissions: [PERMISSIONS.INVENTORY_VIEW],
      planModule: 'inventory' as const,
    },
    {
      label: 'Purchase follow-up',
      value: String(metrics.draftPurchaseOrders),
      detail: `${metrics.poDraft} draft · ${metrics.poPending} pending`,
      comparison: `${metrics.poReceived} received recently`,
      icon: Truck,
      tone: (metrics.draftPurchaseOrders > 0 ? 'amber' : 'slate') as const,
      status: (metrics.draftPurchaseOrders > 0 ? 'watch' : 'good') as const,
      actionLabel: 'View POs',
      onAction: () => navigate('/erp/purchase'),
      permissions: [PERMISSIONS.PURCHASE_MANAGE],
      planModule: 'purchase' as const,
    },
  ].filter((metric) => canAccessAny(metric.permissions, metric.planModule));

  const priorityItems = [
    liveOpenChecks > 0
      ? {
          title: 'Running Bills',
          value: `${liveOpenChecks} Bills Active`,
          detail: `${formatCurrency(liveOpenBillTotal)} Pending`,
          meta: `${liveOpenItemCount} items still open`,
          path: '/erp/tables',
          icon: ReceiptText,
          tone: 'bg-sky-50 text-sky-700',
          permission: PERMISSIONS.TABLES_MANAGE,
          planModule: 'tables' as const,
        }
      : null,
    kitchenQueue > 0
      ? {
          title: 'Kitchen',
          value: `${kitchenQueue} tickets active`,
          detail: `${pendingKitchen} Pending · ${preparingKitchen} Preparing · ${readyKitchen} Ready`,
          meta: readyKitchen > 0 ? 'Serve ready tickets first' : 'Longest wait in pending queue',
          path: '/erp/kitchen',
          icon: ChefHat,
          tone: 'bg-amber-50 text-amber-700',
          permission: PERMISSIONS.KITCHEN_ACCESS,
          planModule: 'kitchen' as const,
        }
      : null,
    metrics.draftPurchaseOrders > 0 || metrics.poReceived > 0
      ? {
          title: 'Purchase Orders',
          value: `${metrics.draftPurchaseOrders} open`,
          detail: `${metrics.poDraft} Draft · ${metrics.poPending} Pending Approval · ${metrics.poReceived} Received`,
          meta: 'Keep replenishment moving',
          path: '/erp/purchase',
          icon: Truck,
          tone: 'bg-orange-50 text-orange-700',
          permission: PERMISSIONS.PURCHASE_MANAGE,
          planModule: 'purchase' as const,
        }
      : null,
    metrics.lowStockItems > 0
      ? {
          title: 'Inventory',
          value: `${metrics.lowStockItems} low-stock items`,
          detail: 'Restock before peak service',
          meta: metrics.wasteToday > 0 ? `${metrics.wasteToday} waste entries today` : undefined,
          path: '/erp/inventory',
          icon: AlertTriangle,
          tone: 'bg-rose-50 text-rose-700',
          permission: PERMISSIONS.INVENTORY_VIEW,
          planModule: 'inventory' as const,
        }
      : null,
  ].filter((item) => item && canAccess(item.permission, item.planModule)) as Array<{
    title: string;
    value: string;
    detail: string;
    meta?: string;
    path: string;
    icon: LucideIcon;
    tone: string;
    permission: PermissionId;
    planModule: PlanModuleId;
  }>;

  const moduleLiveCounts: Record<string, { count: string; badge: string; tone: string }> = {
    'POS Billing': {
      count: `${displayMetrics.completedOrders} paid today`,
      badge: liveOpenChecks > 0 ? `${liveOpenChecks} open` : 'Ready',
      tone: liveOpenChecks > 0 ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700',
    },
    Tables: {
      count: `${tableStats.occupied}/${Math.max(tableStats.total, 1)} occupied`,
      badge: `${tableStats.available} free`,
      tone: 'bg-sky-50 text-sky-700',
    },
    'Kitchen KDS': {
      count: `${pendingKitchen} Pending · ${readyKitchen} Ready`,
      badge: kitchenQueue > 0 ? `${kitchenQueue} live` : 'Clear',
      tone: kitchenQueue > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
    },
    'Stock on Hand': {
      count: `${metrics.lowStockItems} below minimum`,
      badge: metrics.lowStockItems > 0 ? 'Watch' : 'Healthy',
      tone: metrics.lowStockItems > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
    },
    'Daily Stock': {
      count: 'Opening · closing checklist',
      badge: 'Today',
      tone: 'bg-slate-100 text-slate-700',
    },
    'Purchase Orders': {
      count: `${metrics.poDraft} Draft · ${metrics.poPending} Pending`,
      badge: metrics.draftPurchaseOrders > 0 ? 'Follow-up' : 'Clear',
      tone: metrics.draftPurchaseOrders > 0 ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700',
    },
    'Waste Log': {
      count: `${metrics.wasteToday} logged today`,
      badge: metrics.wasteToday > 0 ? 'Review' : 'Clear',
      tone: metrics.wasteToday > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
    },
  };

  const currentTimeLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const secondaryActions = quickActions.filter((a) => a.variant !== 'primary');

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 pb-24 sm:pb-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <span>{companyName || 'CafePilots'}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
              <span>{activeOutlet?.name || 'All active branches'}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Operations command center
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {user?.name ? `${user.name}, ` : ''}today's service health is ready at a glance.
            </p>
          </div>
          <div className="hidden flex-wrap gap-2 sm:flex">
            <Button
              variant="outline"
              className="h-11 gap-2 rounded-xl"
              aria-label="Refresh dashboard metrics"
              onClick={() => void metricsQuery.refetch()}
            >
              <RefreshCw className={cn('h-4 w-4', metricsQuery.isFetching && 'animate-spin')} />
              Refresh
            </Button>
            {primaryAction && (
              <Button
                className="h-11 gap-2 rounded-xl bg-[#FF6A00] text-white shadow-sm hover:bg-[#e85f00]"
                aria-label={primaryAction.label}
                onClick={() => navigate(primaryAction.path)}
              >
                <primaryAction.icon className="h-4 w-4" />
                {primaryAction.label}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metricsQuery.isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`kpi-skeleton-${index}`}
                  className="min-h-[132px] animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  aria-hidden
                >
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-16 rounded bg-slate-100" />
                      <div className="h-7 w-24 rounded bg-slate-100" />
                      <div className="h-3 w-28 rounded bg-slate-100" />
                    </div>
                  </div>
                </div>
              ))
            : visibleMetrics.map((metric) => <MetricTile key={metric.label} {...metric} />)}
        </div>

        {(metrics.hadError || metricsQuery.isError) && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            Some live metrics could not refresh. Local tables and running bills are still shown.
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-6 lg:col-span-2">
          {canAccessAny([PERMISSIONS.POS_ACCESS, PERMISSIONS.REPORTS_VIEW]) && (
            <SalesPulsePanel metrics={displayMetrics} onNewBill={() => navigate('/erp/pos')} />
          )}

          {quickActions.length > 0 && (
            <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-5">
              {primaryAction && (
                <Button
                  className="col-span-2 h-14 justify-start gap-3 rounded-xl bg-[#FF6A00] px-4 text-base font-bold text-white shadow-md hover:bg-[#e85f00] lg:col-span-1"
                  aria-label={primaryAction.label}
                  onClick={() => navigate(primaryAction.path)}
                >
                  <primaryAction.icon className="h-5 w-5" />
                  {primaryAction.label}
                </Button>
              )}
              {secondaryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="h-14 justify-start gap-3 rounded-xl border-slate-200 bg-white px-4 font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    aria-label={action.label}
                    onClick={() => navigate(action.path)}
                  >
                    <Icon className="h-5 w-5 text-[#FF6A00]" />
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
              <div key={section.id} className="space-y-3">
                <h3 className="px-0.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {section.label}
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {section.items.map((mod) => {
                    const live = moduleLiveCounts[mod.title];
                    return (
                      <button
                        type="button"
                        key={mod.title}
                        aria-label={`Open ${mod.title}`}
                        className="group flex min-h-[104px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40"
                        onClick={() => navigate(mod.path)}
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${BRAND.navy}0F` }}
                        >
                          <mod.icon className="h-5 w-5" style={{ color: BRAND.orange }} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-bold text-slate-950">{mod.title}</p>
                            {live ? (
                              <span
                                className={cn(
                                  'rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                  live.tone
                                )}
                              >
                                {live.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{mod.description}</p>
                          {live ? (
                            <p className="mt-1.5 text-xs font-semibold text-slate-700">{live.count}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-xs font-bold text-[#FF6A00] opacity-80 transition group-hover:opacity-100">
                          Open →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </section>

        <aside className="flex flex-col gap-6 lg:col-span-1">
          <QuickInsightsPanel
            metrics={displayMetrics}
            openBills={liveOpenChecks}
            kitchenQueue={kitchenQueue}
            showTables={canAccess(PERMISSIONS.TABLES_MANAGE, 'tables')}
            showKitchen={canAccess(PERMISSIONS.KITCHEN_ACCESS, 'kitchen')}
            showInventory={canAccess(PERMISSIONS.INVENTORY_VIEW, 'inventory')}
            showPurchase={canAccess(PERMISSIONS.PURCHASE_MANAGE, 'purchase')}
          />

          <OpsAlertsPanel
            metrics={displayMetrics}
            kitchenQueue={kitchenQueue}
            openBills={liveOpenChecks}
            showInventory={canAccess(PERMISSIONS.INVENTORY_VIEW, 'inventory')}
            showKitchen={canAccess(PERMISSIONS.KITCHEN_ACCESS, 'kitchen')}
            showTables={canAccess(PERMISSIONS.TABLES_MANAGE, 'tables')}
            showPurchase={canAccess(PERMISSIONS.PURCHASE_MANAGE, 'purchase')}
            onNavigate={navigate}
          />

          <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Activity className="h-4 w-4 text-[#FF6A00]" aria-hidden />
                Priority queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">
              {priorityItems.length > 0 ? (
                priorityItems.map((item) => <PriorityItem key={item.title} {...item} />)
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  <CircleCheckBig className="h-5 w-5 shrink-0" aria-hidden />
                  <div>
                    <p className="text-sm font-bold">No urgent follow-up</p>
                    <p className="text-xs text-emerald-700">Service looks calm right now.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {canAccess(PERMISSIONS.TABLES_MANAGE, 'tables') && (
            <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-bold">Service snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Occupied</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-slate-950">{tableStats.occupied}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Reserved</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-slate-950">{tableStats.reserved}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Cleaning</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-slate-950">{tableStats.cleaning}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Available</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-slate-950">{tableStats.available}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-500">
                  <div className="flex items-center justify-between gap-2">
                    <span>Last viewed</span>
                    <span className="font-semibold text-slate-700">{currentTimeLabel}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <RecentActivityPanel metrics={displayMetrics} onNewBill={() => navigate('/erp/pos')} />
        </aside>
      </div>

      {quickActions.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto">
            {primaryAction && (
              <Button
                className="h-12 shrink-0 gap-2 rounded-xl bg-[#FF6A00] px-4 font-bold text-white hover:bg-[#e85f00]"
                onClick={() => navigate(primaryAction.path)}
              >
                <primaryAction.icon className="h-4 w-4" />
                {primaryAction.label}
              </Button>
            )}
            {secondaryActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-12 shrink-0 gap-2 rounded-xl border-slate-200 bg-white px-3 font-semibold"
                  onClick={() => navigate(action.path)}
                >
                  <Icon className="h-4 w-4 text-[#FF6A00]" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
