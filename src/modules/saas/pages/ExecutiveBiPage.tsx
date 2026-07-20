import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChefHat,
  Download,
  LayoutGrid,
  Package,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { fetchExecutiveBi, persistBiSnapshot } from '../services/biService';
import type { ExecutiveBiSummary } from '../types';

const BRAND = { navy: '#0D1B2A', orange: '#FF6A00' };
const CHART_COLORS = ['#FF6A00', '#0D1B2A', '#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#64748B'];

type RangePreset = 'today' | '7d' | '30d';
type DrillKey = 'sales' | 'orders' | 'hourly' | 'branches' | 'products' | null;

type Enrichment = {
  payments: Array<{ name: string; value: number }>;
  sources: Array<{ name: string; value: number }>;
  categories: Array<{ name: string; value: number }>;
  kitchenQueue: number;
  tablesOccupied: number;
  tablesTotal: number;
  onlineOrders: number;
  customerCount: number;
  lowStock: Array<{ name: string; current: number }>;
  recentActivity: Array<{ label: string; at: string }>;
};

const EMPTY_ENRICH: Enrichment = {
  payments: [],
  sources: [],
  categories: [],
  kitchenQueue: 0,
  tablesOccupied: 0,
  tablesTotal: 0,
  onlineOrders: 0,
  customerCount: 0,
  lowStock: [],
  recentActivity: [],
};

function ChartCard({
  title,
  subtitle,
  children,
  className,
  onDrill,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  onDrill?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-[12px] bg-white p-3 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md sm:p-4',
        className
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-black text-slate-900">{title}</h2>
          {subtitle && <p className="text-[11px] font-medium text-slate-400">{subtitle}</p>}
        </div>
        {onDrill && (
          <button
            type="button"
            onClick={onDrill}
            className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide text-orange-600 hover:bg-orange-50"
          >
            Drill
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[12px] bg-slate-100', className)} />;
}

function tooltipStyle() {
  return {
    borderRadius: 12,
    borderColor: '#E2E8F0',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    fontSize: 12,
  };
}

async function loadEnrichment(outletId?: string | null): Promise<Enrichment> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const enrich: Enrichment = { ...EMPTY_ENRICH, payments: [], sources: [], categories: [], lowStock: [], recentActivity: [] };

  try {
    let oq = supabase
      .from('pos_orders')
      .select('id, payment_method, order_source, customer_phone, customer_name, total_amount, status, created_at')
      .gte('created_at', start.toISOString())
      .neq('status', 'held')
      .neq('status', 'open')
      .limit(500);
    if (outletId && outletId !== 'current-outlet' && !outletId.startsWith('local')) {
      oq = oq.eq('outlet_id', outletId);
    }
    const { data: orders } = await oq;
    const pay = new Map<string, number>();
    const src = new Map<string, number>();
    const phones = new Set<string>();
    let online = 0;
    for (const o of orders || []) {
      if (o.status === 'cancelled' || o.status === 'refunded') continue;
      const method = String(o.payment_method || 'other').toLowerCase();
      pay.set(method, (pay.get(method) || 0) + Number(o.total_amount || 0));
      const source = String(o.order_source || 'pos').toLowerCase();
      src.set(source, (src.get(source) || 0) + 1);
      if (['swiggy', 'zomato', 'ondc', 'website', 'qr', 'whatsapp', 'phone', 'online'].includes(source)) {
        online += 1;
      }
      if (o.customer_phone) phones.add(String(o.customer_phone));
      else if (o.customer_name) phones.add(String(o.customer_name));
    }
    enrich.payments = [...pay.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    enrich.sources = [...src.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    enrich.onlineOrders = online;
    enrich.customerCount = phones.size || (orders || []).filter((o) => o.status !== 'cancelled').length;
    enrich.recentActivity = (orders || []).slice(0, 6).map((o) => ({
      label: `Order ${String(o.id).slice(0, 6)} · ${formatCurrency(Number(o.total_amount || 0))}`,
      at: o.created_at,
    }));

    const ids = (orders || []).map((o) => o.id).filter(Boolean).slice(0, 200);
    if (ids.length) {
      const { data: items } = await supabase
        .from('pos_order_items')
        .select('product_name, total_price')
        .in('order_id', ids);
      const cat = new Map<string, number>();
      for (const it of items || []) {
        const name = String(it.product_name || 'Item');
        const bucket = name.split(/[\s(-]/)[0] || 'Other';
        cat.set(bucket, (cat.get(bucket) || 0) + Number(it.total_price || 0));
      }
      enrich.categories = [...cat.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    }
  } catch {
    /* presentation only */
  }

  try {
    let kq = supabase
      .from('pos_orders')
      .select('id', { count: 'exact', head: true })
      .neq('kitchen_status', 'delivered')
      .neq('status', 'held')
      .neq('status', 'open');
    if (outletId && outletId !== 'current-outlet' && !outletId.startsWith('local')) {
      kq = kq.eq('outlet_id', outletId);
    }
    const { count } = await kq;
    enrich.kitchenQueue = count || 0;
  } catch {
    /* optional */
  }

  try {
    let tq = supabase.from('dining_tables').select('id, status');
    if (outletId && outletId !== 'current-outlet' && !outletId.startsWith('local')) {
      tq = tq.eq('outlet_id', outletId);
    }
    const { data: tables } = await tq.limit(200);
    enrich.tablesTotal = tables?.length || 0;
    enrich.tablesOccupied = (tables || []).filter((t) =>
      ['occupied', 'reserved', 'dirty', 'cleaning'].includes(String(t.status || '').toLowerCase())
    ).length;
  } catch {
    /* optional */
  }

  try {
    if (outletId && outletId !== 'current-outlet' && !outletId.startsWith('local')) {
      const { data: inv } = await supabase
        .from('inventory')
        .select('current_quantity, product:products(name)')
        .eq('outlet_id', outletId)
        .lte('current_quantity', 5)
        .limit(5);
      enrich.lowStock = (inv || []).map((row) => {
        const product = row.product as { name?: string } | null;
        return { name: product?.name || 'Item', current: Number(row.current_quantity || 0) };
      });
    }
  } catch {
    /* optional */
  }

  return enrich;
}

function buildInsights(data: ExecutiveBiSummary | null, enrich: Enrichment) {
  if (!data) return [];
  const foodPct = data.todaySales > 0 ? (data.foodCostEstimate / data.todaySales) * 100 : 0;
  const peak = [...data.hourly].sort((a, b) => b.sales - a.sales)[0];
  const insights: Array<{ title: string; body: string; tone: 'info' | 'warn' | 'good' }> = [];

  if (data.refundsToday > data.todaySales * 0.08 && data.todaySales > 0) {
    insights.push({
      title: 'Sales anomaly · refunds elevated',
      body: `Refunds are ${formatCurrency(data.refundsToday)} today (${((data.refundsToday / Math.max(1, data.todaySales)) * 100).toFixed(1)}% of sales). Review void reasons.`,
      tone: 'warn',
    });
  } else {
    insights.push({
      title: 'Sales tracking normally',
      body: `Today ${formatCurrency(data.todaySales)} across ${data.orderCountToday} orders — no major refund spike.`,
      tone: 'good',
    });
  }

  if (enrich.lowStock.length) {
    insights.push({
      title: 'Inventory alerts',
      body: enrich.lowStock.map((i) => `${i.name} (${i.current})`).join(', '),
      tone: 'warn',
    });
  } else {
    insights.push({
      title: 'Inventory stable',
      body: 'No critical low-stock items in the current outlet snapshot.',
      tone: 'info',
    });
  }

  if (peak) {
    insights.push({
      title: 'Peak hour prediction',
      body: `Strongest hour today is ${String(peak.hour).padStart(2, '0')}:00 with ${formatCurrency(peak.sales)}. Staff the floor 30–45 min earlier tomorrow.`,
      tone: 'info',
    });
  }

  insights.push({
    title: 'Purchase recommendation',
    body: enrich.lowStock.length
      ? `Raise PO for: ${enrich.lowStock
          .slice(0, 3)
          .map((i) => i.name)
          .join(', ')}.`
      : 'No urgent purchase suggestions — review weekly top movers before weekend.',
    tone: enrich.lowStock.length ? 'warn' : 'good',
  });

  insights.push({
    title: 'Business recommendation',
    body:
      foodPct > 35
        ? `Food cost ~${foodPct.toFixed(1)}% is high. Audit recipes on top sellers and portion control.`
        : `Food cost ~${foodPct.toFixed(1)}%. Push high-margin combos during ${peak ? `${String(peak.hour).padStart(2, '0')}:00` : 'peak'} window.`,
    tone: foodPct > 35 ? 'warn' : 'good',
  });

  return insights;
}

export function ExecutiveBiPage() {
  const user = useAuthStore((s) => s.user);
  const outlets = useTenantStore((s) => s.outlets);
  const companyId = getScopedCompanyId(user) || useTenantStore.getState().companyId;
  const defaultOutlet = getTenantOutletId(user) || useTenantStore.getState().activeOutletId;
  const [outletFilter, setOutletFilter] = useState(defaultOutlet || '');
  const [compareOutlet, setCompareOutlet] = useState('');
  const [range, setRange] = useState<RangePreset>('today');
  const [data, setData] = useState<ExecutiveBiSummary | null>(null);
  const [enrich, setEnrich] = useState<Enrichment>(EMPTY_ENRICH);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [drill, setDrill] = useState<DrillKey>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const oid = outletFilter || defaultOutlet;
      const summary = await fetchExecutiveBi({ companyId, outletId: oid });
      setData(summary);
      void persistBiSnapshot({ companyId, outletId: oid, summary });
      setEnrich(await loadEnrichment(oid));
    } catch (err) {
      setError((err as Error).message || 'Failed to load BI');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOutletFilter(defaultOutlet || '');
  }, [defaultOutlet]);

  useEffect(() => {
    void load();
  }, [companyId, outletFilter]);

  const foodPct = data && data.todaySales > 0 ? (data.foodCostEstimate / data.todaySales) * 100 : 0;
  const profit = Math.max(0, (data?.todaySales || 0) - (data?.foodCostEstimate || 0) - (data?.refundsToday || 0));
  const occupancy =
    enrich.tablesTotal > 0 ? Math.round((enrich.tablesOccupied / enrich.tablesTotal) * 100) : 0;

  const primarySales =
    range === '30d' ? data?.monthSales || 0 : range === '7d' ? data?.weekSales || 0 : data?.todaySales || 0;

  const weekTrend = useMemo(() => {
    if (!data) return [];
    // Presentation: distribute week/month totals into a simple trend series for charts
    const days = range === '30d' ? 30 : 7;
    const total = range === '30d' ? data.monthSales : data.weekSales;
    const avg = total / days;
    return Array.from({ length: days }, (_, i) => {
      const wobble = 0.75 + ((i * 17) % 10) / 20;
      const sales = Math.round(avg * wobble);
      return {
        label: `D${i + 1}`,
        sales,
        profit: Math.max(0, Math.round(sales * (1 - foodPct / 100) * 0.9)),
      };
    });
  }, [data, range, foodPct]);

  const hourlyChart = useMemo(
    () =>
      (data?.hourly || [])
        .filter((h) => h.hour >= 8 && h.hour <= 23)
        .map((h) => ({
          label: `${String(h.hour).padStart(2, '0')}`,
          sales: h.sales,
          orders: h.orders,
        })),
    [data]
  );

  const branchChart = useMemo(
    () =>
      (data?.branches || []).slice(0, 8).map((b) => ({
        name: b.outletName.length > 12 ? `${b.outletName.slice(0, 11)}…` : b.outletName,
        full: b.outletName,
        sales: b.sales,
        orders: b.orders,
      })),
    [data]
  );

  const compareRow = useMemo(() => {
    if (!compareOutlet || !data?.branches) return null;
    return data.branches.find((b) => b.outletId === compareOutlet) || null;
  }, [compareOutlet, data]);

  const activeBranch = useMemo(() => {
    if (!data?.branches?.length) return null;
    const oid = outletFilter || defaultOutlet;
    return data.branches.find((b) => b.outletId === oid) || data.branches[0];
  }, [data, outletFilter, defaultOutlet]);

  const insights = useMemo(() => buildInsights(data, enrich), [data, enrich]);

  const exportCsv = () => {
    if (!data) return;
    const lines = [
      'metric,value',
      `today_sales,${data.todaySales}`,
      `orders,${data.orderCountToday}`,
      `avg_ticket,${data.avgTicketToday}`,
      `refunds,${data.refundsToday}`,
      `food_cost,${data.foodCostEstimate}`,
      `profit,${profit}`,
      ...data.topItems.map((i) => `item_${i.name.replace(/,/g, ' ')},${i.revenue}`),
      ...data.branches.map((b) => `branch_${b.outletName.replace(/,/g, ' ')},${b.sales}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive-bi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const salesTrend =
    data && data.weekSales > 0
      ? `${(((data.todaySales * 7) / data.weekSales - 1) * 100).toFixed(0)}%`
      : '—';
  const salesTrendLabel = salesTrend.startsWith('-') || salesTrend === '—' ? salesTrend : `+${salesTrend.replace(/^\+/, '')}`;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 pb-8">
      {/* Header + filters */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
            <BarChart3 className="h-6 w-6 text-[#FF6A00]" />
            Executive Business Intelligence
          </h1>
          <p className="mt-0.5 text-sm font-medium text-slate-500">
            Real-time restaurant performance · sales, cost, kitchen & multi-outlet view
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[12px] bg-white p-0.5 shadow-sm ring-1 ring-slate-100">
            {([
              ['today', 'Today'],
              ['7d', '7 Days'],
              ['30d', '30 Days'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRange(id)}
                className={cn(
                  'rounded-[10px] px-3 py-1.5 text-xs font-bold transition',
                  range === id ? 'bg-[#0D1B2A] text-white' : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            className="h-9 rounded-[12px] border-0 bg-white px-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-100"
          >
            <option value={defaultOutlet || ''}>Outlet · Active</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            value={compareOutlet}
            onChange={(e) => setCompareOutlet(e.target.value)}
            className="h-9 rounded-[12px] border-0 bg-white px-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-100"
          >
            <option value="">Compare outlet</option>
            {outlets
              .filter((o) => o.id !== outletFilter)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  vs {o.name}
                </option>
              ))}
          </select>
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-[12px]" onClick={exportCsv} disabled={!data}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-[12px]"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-[12px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
      )}

      {compareRow && activeBranch && (
        <div className="grid gap-2 rounded-[12px] bg-[#0D1B2A] p-3 text-white sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-white/50">{activeBranch.outletName}</p>
            <p className="text-xl font-black">{formatCurrency(activeBranch.sales)}</p>
            <p className="text-xs text-white/60">{activeBranch.orders} orders · avg {formatCurrency(activeBranch.avgTicket)}</p>
          </div>
          <div className="sm:border-l sm:border-white/10 sm:pl-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-orange-300/80">{compareRow.outletName}</p>
            <p className="text-xl font-black text-[#FF6A00]">{formatCurrency(compareRow.sales)}</p>
            <p className="text-xs text-white/60">
              Δ {formatCurrency(activeBranch.sales - compareRow.sales)} · {compareRow.orders} orders
            </p>
          </div>
        </div>
      )}

      {/* KPI strip */}
      {loading && !data ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-[120px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">
          <InventoryCard
            label="Today's Sales"
            value={formatCurrency(range === 'today' ? data?.todaySales || 0 : primarySales)}
            subtitle={range === 'today' ? 'Gross today' : `Range · ${range}`}
            icon={Wallet}
            tone="orange"
            trend={salesTrendLabel}
            className="min-h-[120px] sm:min-h-[128px]"
            onClick={() => setDrill('sales')}
          />
          <InventoryCard
            label="Orders"
            value={String(data?.orderCountToday || 0)}
            subtitle="Completed today"
            icon={ShoppingBag}
            tone="blue"
            trend={data?.orderCountToday ? '↑ Live' : '—'}
            className="min-h-[120px] sm:min-h-[128px]"
            onClick={() => setDrill('orders')}
          />
          <InventoryCard
            label="Avg Ticket"
            value={formatCurrency(data?.avgTicketToday || 0)}
            subtitle="Per check"
            icon={Activity}
            tone="slate"
            trend="—"
            className="min-h-[120px] sm:min-h-[128px]"
          />
          <InventoryCard
            label="Profit"
            value={formatCurrency(profit)}
            subtitle="Sales − food − refunds"
            icon={TrendingUp}
            tone="emerald"
            trend={profit > 0 ? '+Est.' : '—'}
            className="min-h-[120px] sm:min-h-[128px]"
          />
          <InventoryCard
            label="Refunds"
            value={formatCurrency(data?.refundsToday || 0)}
            subtitle="Today"
            icon={AlertTriangle}
            tone="red"
            trend={data && data.refundsToday > 0 ? 'Watch' : '↑ Clear'}
            className="min-h-[120px] sm:min-h-[128px]"
          />
          <InventoryCard
            label="Food Cost %"
            value={`${foodPct.toFixed(1)}%`}
            subtitle={formatCurrency(data?.foodCostEstimate || 0)}
            icon={Utensils}
            tone={foodPct > 35 ? 'amber' : 'emerald'}
            trend={foodPct > 35 ? '-High' : '+OK'}
            className="min-h-[120px] sm:min-h-[128px]"
          />
          <InventoryCard
            label="Customer Count"
            value={String(enrich.customerCount)}
            subtitle="Unique guests today"
            icon={Users}
            tone="blue"
            trend="—"
            className="min-h-[120px] sm:min-h-[128px]"
          />
          <InventoryCard
            label="Table Occupancy"
            value={enrich.tablesTotal ? `${occupancy}%` : '—'}
            subtitle={
              enrich.tablesTotal
                ? `${enrich.tablesOccupied}/${enrich.tablesTotal} tables`
                : 'No table data'
            }
            icon={LayoutGrid}
            tone="slate"
            trend={occupancy >= 70 ? '+Busy' : '—'}
            className="min-h-[120px] sm:min-h-[128px]"
          />
          <InventoryCard
            label="Online Orders"
            value={String(enrich.onlineOrders)}
            subtitle="Aggregator / web / QR"
            icon={Package}
            tone="orange"
            trend={enrich.onlineOrders ? '↑ Channel' : '—'}
            className="min-h-[120px] sm:min-h-[128px]"
          />
          <InventoryCard
            label="Kitchen Queue"
            value={String(enrich.kitchenQueue)}
            subtitle="Active tickets"
            icon={ChefHat}
            tone={enrich.kitchenQueue > 12 ? 'amber' : 'emerald'}
            trend={enrich.kitchenQueue > 12 ? 'Delayed?' : '↑ OK'}
            className="min-h-[120px] sm:min-h-[128px]"
            onClick={() => setDrill('hourly')}
          />
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Revenue Trend"
          subtitle={`${range === '30d' ? '30' : '7'}-day presentation series`}
          className="xl:col-span-1"
          onDrill={() => setDrill('sales')}
        >
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekTrend}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND.orange} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={BRAND.orange} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={tooltipStyle()} />
                <Area type="monotone" dataKey="sales" stroke={BRAND.orange} fill="url(#revFill)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Sales by Hour" subtitle="Today 08–23" onDrill={() => setDrill('hourly')}>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={48} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={tooltipStyle()} />
                <Bar dataKey="sales" fill={BRAND.navy} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Payment Breakdown" subtitle="Today mix">
          <div className="flex h-52 items-center gap-2">
            <div className="h-full min-w-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={enrich.payments.length ? enrich.payments : [{ name: 'None', value: 1 }]} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                    {(enrich.payments.length ? enrich.payments : [{ name: 'None', value: 1 }]).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={tooltipStyle()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-28 shrink-0 space-y-1 text-[10px]">
              {enrich.payments.slice(0, 5).map((p, i) => (
                <li key={p.name} className="flex items-center gap-1.5 font-bold capitalize text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {p.name}
                </li>
              ))}
              {!enrich.payments.length && <li className="text-slate-400">No payments</li>}
            </ul>
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Order Source Distribution" subtitle="Channel mix today">
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrich.sources} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Bar dataKey="value" fill="#0EA5E9" radius={[0, 4, 4, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Category Sales" subtitle="Name-prefix buckets">
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrich.categories}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={44} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={tooltipStyle()} />
                <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top Selling Products" subtitle="Revenue today" onDrill={() => setDrill('products')}>
          <ul className="max-h-52 space-y-1.5 overflow-y-auto">
            {(data?.topItems || []).map((item, idx) => {
              const max = data?.topItems[0]?.revenue || 1;
              return (
                <li key={item.name} className="rounded-lg px-1 py-1 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-bold text-slate-800">
                      <span className="mr-1.5 text-slate-400">{idx + 1}.</span>
                      {item.name}
                    </span>
                    <span className="shrink-0 font-black tabular-nums text-slate-700">{formatCurrency(item.revenue)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#FF6A00]"
                      style={{ width: `${Math.max(6, (item.revenue / max) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
            {!data?.topItems?.length && <li className="py-10 text-center text-xs text-slate-400">No item sales yet</li>}
          </ul>
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Branch Performance" subtitle="Today sales by outlet" onDrill={() => setDrill('branches')}>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v))}
                  labelFormatter={(_, payload) => String(payload?.[0]?.payload?.full || '')}
                  contentStyle={tooltipStyle()}
                />
                <Bar dataKey="sales" fill={BRAND.orange} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Profit Trend" subtitle="Estimated from food cost ratio">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={48} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={tooltipStyle()} />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke={BRAND.navy} strokeWidth={2} dot={false} name="Sales" />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2.5} dot={false} name="Profit est." />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* AI + Ops widgets */}
      <div className="grid gap-3 xl:grid-cols-12">
        <ChartCard title="AI Insights" subtitle="Rule-based executive coach" className="xl:col-span-5">
          <div className="space-y-2">
            {insights.map((ins) => (
              <div
                key={ins.title}
                className={cn(
                  'rounded-[12px] px-3 py-2.5 ring-1',
                  ins.tone === 'warn' && 'bg-amber-50 ring-amber-100',
                  ins.tone === 'good' && 'bg-emerald-50 ring-emerald-100',
                  ins.tone === 'info' && 'bg-sky-50 ring-sky-100'
                )}
              >
                <p className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                  <Sparkles className="h-3.5 w-3.5 text-[#FF6A00]" />
                  {ins.title}
                </p>
                <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-600">{ins.body}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <div className="grid gap-3 sm:grid-cols-2 xl:col-span-7 xl:grid-cols-2">
          <ChartCard title="Inventory Alerts" subtitle="Low stock watch">
            <ul className="space-y-1.5 text-xs">
              {enrich.lowStock.map((i) => (
                <li key={i.name} className="flex justify-between rounded-lg bg-red-50 px-2 py-1.5 font-semibold text-red-800">
                  <span className="truncate">{i.name}</span>
                  <span>{i.current}</span>
                </li>
              ))}
              {!enrich.lowStock.length && <li className="py-6 text-center text-slate-400">No low-stock alerts</li>}
            </ul>
          </ChartCard>

          <ChartCard title="Kitchen Status" subtitle="Live queue pressure">
            <div className="flex items-center gap-4 py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-black text-white">
                {enrich.kitchenQueue}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Active tickets</p>
                <p className="text-[11px] font-medium text-slate-500">
                  {enrich.kitchenQueue > 12 ? 'Above comfortable load — bump delayed tickets' : 'Within normal operating range'}
                </p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Staff Performance" subtitle="Proxy · orders / avg ticket">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-[12px] bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase text-slate-400">Orders / hr peak</p>
                <p className="text-xl font-black text-slate-900">
                  {Math.max(...(data?.hourly.map((h) => h.orders) || [0]), 0)}
                </p>
              </div>
              <div className="rounded-[12px] bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase text-slate-400">Avg ticket</p>
                <p className="text-xl font-black text-slate-900">{formatCurrency(data?.avgTicketToday || 0)}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Detailed employee sales unlocks with shift-linked cashier IDs.</p>
          </ChartCard>

          <ChartCard title="Recent Activities" subtitle="Latest paid orders">
            <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs">
              {enrich.recentActivity.map((a, i) => (
                <li key={`${a.at}-${i}`} className="flex justify-between gap-2 border-b border-slate-50 py-1.5 last:border-0">
                  <span className="truncate font-semibold text-slate-800">{a.label}</span>
                  <span className="shrink-0 text-slate-400">{new Date(a.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
              {!enrich.recentActivity.length && <li className="py-6 text-center text-slate-400">No activity yet</li>}
            </ul>
          </ChartCard>
        </div>
      </div>

      <ChartCard title="Executive Alerts" subtitle="Priority watchlist">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              ok: (data?.refundsToday || 0) < (data?.todaySales || 1) * 0.05,
              label: 'Refund ratio',
              detail: data ? `${(((data.refundsToday || 0) / Math.max(1, data.todaySales)) * 100).toFixed(1)}%` : '—',
            },
            {
              ok: foodPct <= 35,
              label: 'Food cost',
              detail: `${foodPct.toFixed(1)}%`,
            },
            {
              ok: enrich.kitchenQueue <= 12,
              label: 'Kitchen load',
              detail: `${enrich.kitchenQueue} tickets`,
            },
            {
              ok: enrich.lowStock.length === 0,
              label: 'Stock risk',
              detail: `${enrich.lowStock.length} SKUs`,
            },
          ].map((a) => (
            <div
              key={a.label}
              className={cn(
                'rounded-[12px] px-3 py-3 ring-1',
                a.ok ? 'bg-emerald-50 ring-emerald-100' : 'bg-amber-50 ring-amber-100'
              )}
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{a.label}</p>
              <p className="mt-1 text-lg font-black text-slate-900">{a.detail}</p>
              <p className={cn('text-[11px] font-bold', a.ok ? 'text-emerald-700' : 'text-amber-700')}>
                {a.ok ? 'Healthy' : 'Needs attention'}
              </p>
            </div>
          ))}
        </div>
      </ChartCard>

      {data?.generatedAt && (
        <p className="text-center text-[10px] font-semibold text-slate-400">
          Snapshot {new Date(data.generatedAt).toLocaleString()} · CafePilots BI
        </p>
      )}

      {/* Drill-down panel */}
      {drill && data && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-md sm:rounded-[12px] sm:border">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-600">Drill-down</p>
              <h3 className="text-sm font-black text-slate-900 capitalize">{drill.replace(/_/g, ' ')}</h3>
            </div>
            <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setDrill(null)}>
              Close
            </button>
          </div>
          <div className="mt-3 max-h-48 overflow-y-auto text-xs text-slate-700">
            {drill === 'sales' && (
              <ul className="space-y-1">
                <li>Today: {formatCurrency(data.todaySales)}</li>
                <li>7 days: {formatCurrency(data.weekSales)}</li>
                <li>30 days: {formatCurrency(data.monthSales)}</li>
              </ul>
            )}
            {drill === 'orders' && <p>{data.orderCountToday} completed orders today · avg {formatCurrency(data.avgTicketToday)}</p>}
            {drill === 'hourly' && (
              <ul className="space-y-1">
                {[...data.hourly]
                  .filter((h) => h.orders > 0)
                  .sort((a, b) => b.sales - a.sales)
                  .slice(0, 8)
                  .map((h) => (
                    <li key={h.hour}>
                      {String(h.hour).padStart(2, '0')}:00 — {formatCurrency(h.sales)} ({h.orders} orders)
                    </li>
                  ))}
              </ul>
            )}
            {drill === 'branches' && (
              <ul className="space-y-1">
                {data.branches.slice(0, 10).map((b) => (
                  <li key={b.outletId}>
                    {b.outletName}: {formatCurrency(b.sales)}
                  </li>
                ))}
              </ul>
            )}
            {drill === 'products' && (
              <ul className="space-y-1">
                {data.topItems.map((i) => (
                  <li key={i.name}>
                    {i.name}: {i.qty} · {formatCurrency(i.revenue)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
