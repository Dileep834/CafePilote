import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  Filter,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { RefundDialog } from '../components/RefundDialog';
import { listRefunds } from '../services/refundService';
import { REFUND_REASON_LABELS, type RefundReasonCode } from '../types';

type RefundRow = Record<string, unknown>;

type OrderMeta = {
  customer_name?: string | null;
  payment_method?: string | null;
  total_amount?: number;
  status?: string | null;
};

type Filters = {
  search: string;
  refundType: string;
  status: string;
  outlet: string;
  cashier: string;
  dateFrom: string;
  dateTo: string;
  paymentMethod: string;
};

const EMPTY_FILTERS: Filters = {
  search: '',
  refundType: '',
  status: '',
  outlet: '',
  cashier: '',
  dateFrom: '',
  dateTo: '',
  paymentMethod: '',
};

/** Display-only status derived from existing refund fields (no schema change). */
function deriveStatus(row: RefundRow): 'pending' | 'approved' | 'rejected' | 'completed' {
  if (row.rejected_at || row.status === 'rejected') return 'rejected';
  if (row.status === 'pending' || row.approval_status === 'pending') return 'pending';
  if (row.approved_by || row.status === 'approved') return 'approved';
  return 'completed';
}

function StatusChip({ status }: { status: ReturnType<typeof deriveStatus> }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-600/15',
    approved: 'bg-sky-50 text-sky-700 ring-sky-600/15',
    rejected: 'bg-red-50 text-red-700 ring-red-600/15',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        map[status]
      )}
    >
      {status}
    </span>
  );
}

function InventoryChip({ restored }: { restored: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        restored
          ? 'bg-violet-50 text-violet-700 ring-violet-600/15'
          : 'bg-slate-50 text-slate-500 ring-slate-600/10'
      )}
    >
      {restored ? (
        <>
          <PackageCheck className="h-3 w-3" />
          Restored
        </>
      ) : (
        'Not restored'
      )}
    </span>
  );
}

function shortId(id: unknown) {
  return String(id || '—').slice(0, 8).toUpperCase();
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function exportCsv(rows: RefundRow[], orderMeta: Record<string, OrderMeta>) {
  const header = [
    'Refund ID',
    'Order',
    'Customer',
    'Cashier',
    'Type',
    'Payment',
    'Amount',
    'Inventory Restored',
    'Status',
    'Approved By',
    'Created',
    'Reason',
  ];
  const lines = rows.map((r) => {
    const meta = orderMeta[String(r.order_id)] || {};
    return [
      r.id,
      r.order_id,
      meta.customer_name || '',
      r.created_by || '',
      r.refund_type,
      r.method,
      r.amount,
      r.inventory_restored ? 'Yes' : 'No',
      deriveStatus(r),
      r.approved_by || '',
      r.created_at,
      r.reason_code,
    ]
      .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
      .join(',');
  });
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `refunds-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RefundsPage() {
  const user = useAuthStore((s) => s.user);
  const outlets = useTenantStore((s) => s.outlets);
  const outletId = getTenantOutletId(user) || useTenantStore.getState().activeOutletId;
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [orderMeta, setOrderMeta] = useState<Record<string, OrderMeta>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<RefundRow | null>(null);

  const load = async () => {
    if (!outletId) return;
    setLoading(true);
    setError('');
    try {
      const data = await listRefunds(outletId, 200);
      setRows(data as RefundRow[]);

      const orderIds = [...new Set((data || []).map((r) => String(r.order_id)).filter(Boolean))];
      if (orderIds.length) {
        const { data: orders } = await supabase
          .from('pos_orders')
          .select('id, customer_name, payment_method, total_amount, status')
          .in('id', orderIds);
        const map: Record<string, OrderMeta> = {};
        for (const o of orders || []) {
          map[o.id] = {
            customer_name: o.customer_name,
            payment_method: o.payment_method,
            total_amount: Number(o.total_amount || 0),
            status: o.status,
          };
        }
        setOrderMeta(map);
      } else {
        setOrderMeta({});
      }
    } catch (err) {
      setError((err as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [outletId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const id = String(r.id || '');
      const orderId = String(r.order_id || '');
      const status = deriveStatus(r);
      const created = new Date(String(r.created_at || 0));
      const q = filters.search.trim().toLowerCase();

      if (q && !id.toLowerCase().includes(q) && !orderId.toLowerCase().includes(q)) return false;
      if (filters.refundType && String(r.refund_type) !== filters.refundType) return false;
      if (filters.status === 'inventory_restored') {
        if (!r.inventory_restored) return false;
      } else if (filters.status && status !== filters.status) {
        return false;
      }
      if (filters.outlet && String(r.outlet_id) !== filters.outlet) return false;
      if (filters.cashier) {
        const cash = String(r.created_by || '').toLowerCase();
        if (!cash.includes(filters.cashier.trim().toLowerCase())) return false;
      }
      if (filters.paymentMethod && String(r.method || '').toLowerCase() !== filters.paymentMethod) {
        return false;
      }
      if (filters.dateFrom) {
        const from = new Date(`${filters.dateFrom}T00:00:00`);
        if (created < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(`${filters.dateTo}T23:59:59`);
        if (created > to) return false;
      }
      return true;
    });
  }, [rows, filters]);

  const kpis = useMemo(() => {
    const today = startOfDay();
    const yesterday = startOfDay();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = startOfDay();

    const todayRows = rows.filter((r) => new Date(String(r.created_at)) >= today);
    const yRows = rows.filter((r) => {
      const d = new Date(String(r.created_at));
      return d >= yesterday && d < yesterdayEnd;
    });

    const todayCount = todayRows.length;
    const yCount = yRows.length;
    const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const todayAmount = todayRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const yAmount = yRows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const pending = rows.filter((r) => deriveStatus(r) === 'pending').length;
    const restored = rows.filter((r) => Boolean(r.inventory_restored)).length;

    const countTrend =
      yCount === 0
        ? todayCount > 0
          ? '+100%'
          : '—'
        : `${(((todayCount - yCount) / yCount) * 100).toFixed(0)}%`;
    const amountTrend =
      yAmount === 0
        ? todayAmount > 0
          ? '+100%'
          : '—'
        : `${(((todayAmount - yAmount) / yAmount) * 100).toFixed(0)}%`;

    return {
      todayCount,
      totalAmount,
      pending,
      restored,
      countTrend: countTrend.startsWith('-') || countTrend === '—' ? countTrend : `+${countTrend.replace(/^\+/, '')}`,
      amountTrend: amountTrend.startsWith('-') || amountTrend === '—' ? amountTrend : `+${amountTrend.replace(/^\+/, '')}`,
      restoredPct: rows.length ? `${Math.round((restored / rows.length) * 100)}% of refunds` : 'No data',
      pendingHint: pending ? 'Needs manager review' : 'All clear',
    };
  }, [rows]);

  const activeFilterCount = Object.entries(filters).filter(([, v]) => Boolean(v)).length;
  const outletName = outlets.find((o) => o.id === outletId)?.name || 'Current outlet';

  const selectedItems = useMemo(() => {
    if (!selected?.items_payload) return [];
    const payload = selected.items_payload;
    if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
    return [];
  }, [selected]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Refund Management</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Manage full, partial and item refunds with complete inventory and payment tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-black text-orange-700">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            disabled={!filtered.length}
            onClick={() => exportCsv(filtered, orderMeta)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-xl bg-[#FF6A00] px-4 font-bold text-white hover:bg-[#e55f00]"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Refund
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-[12px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard
          label="Today's Refunds"
          value={String(kpis.todayCount)}
          subtitle="vs yesterday"
          icon={ReceiptText}
          tone="orange"
          trend={kpis.countTrend}
        />
        <InventoryCard
          label="Total Refund Amount"
          value={formatCurrency(kpis.totalAmount)}
          subtitle="Loaded period"
          icon={Wallet}
          tone="red"
          trend={kpis.amountTrend}
        />
        <InventoryCard
          label="Pending Approvals"
          value={String(kpis.pending)}
          subtitle={kpis.pendingHint}
          icon={ShieldAlert}
          tone="amber"
          trend={kpis.pending ? 'Action needed' : '↑ Clear'}
        />
        <InventoryCard
          label="Inventory Restored"
          value={String(kpis.restored)}
          subtitle={kpis.restoredPct}
          icon={PackageCheck}
          tone="emerald"
          trend={kpis.restored ? '+Synced' : '—'}
        />
      </div>

      {/* Filter bar */}
      {filtersOpen && (
        <div className="rounded-[12px] bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <label className="relative xl:col-span-2">
              <span className="sr-only">Search order number</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search order / refund ID"
                className="h-9 w-full rounded-[12px] border-0 bg-slate-50 pl-8 pr-3 text-sm font-medium text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-orange-200"
              />
            </label>
            <select
              value={filters.refundType}
              onChange={(e) => setFilters((f) => ({ ...f, refundType: e.target.value }))}
              className="h-9 rounded-[12px] border-0 bg-slate-50 px-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
            >
              <option value="">Refund type</option>
              <option value="full">Full</option>
              <option value="partial">Partial</option>
              <option value="item">Item</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="h-9 rounded-[12px] border-0 bg-slate-50 px-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
            >
              <option value="">Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="inventory_restored">Inventory Restored</option>
            </select>
            <select
              value={filters.outlet}
              onChange={(e) => setFilters((f) => ({ ...f, outlet: e.target.value }))}
              className="h-9 rounded-[12px] border-0 bg-slate-50 px-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
            >
              <option value="">Outlet</option>
              {outletId && <option value={outletId}>{outletName}</option>}
              {outlets
                .filter((o) => o.id !== outletId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </select>
            <input
              value={filters.cashier}
              onChange={(e) => setFilters((f) => ({ ...f, cashier: e.target.value }))}
              placeholder="Cashier"
              className="h-9 rounded-[12px] border-0 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-orange-200"
            />
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="h-9 rounded-[12px] border-0 bg-slate-50 px-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
              title="From date"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="h-9 rounded-[12px] border-0 bg-slate-50 px-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
              title="To date"
            />
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: e.target.value }))}
              className="h-9 rounded-[12px] border-0 bg-slate-50 px-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 sm:col-span-2 lg:col-span-1 xl:col-span-1"
            >
              <option value="">Payment method</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="split">Split</option>
            </select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-[12px] text-slate-500 hover:text-slate-800 sm:col-span-2 lg:col-span-1"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Table / empty */}
      {!rows.length ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-100">
          <div className="relative mb-5 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-100 to-slate-100" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100">
              <RotateCcw className="h-9 w-9 text-[#FF6A00]" strokeWidth={1.75} />
            </div>
            <ClipboardList className="absolute -right-1 bottom-1 h-8 w-8 rounded-xl bg-[#0D1B2A] p-1.5 text-white shadow-md" />
          </div>
          <h2 className="text-lg font-black text-slate-900">No refunds have been processed yet.</h2>
          <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
            Refunds will appear here after processing.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              className="h-10 rounded-xl bg-[#FF6A00] px-4 font-bold text-white hover:bg-[#e55f00]"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create Refund
            </Button>
            <Link
              to="/erp/reports"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              View Order History
            </Link>
          </div>
        </div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
          <Filter className="mb-3 h-10 w-10 text-slate-300" />
          <h2 className="text-base font-black text-slate-900">No refunds match your filters</h2>
          <p className="mt-1 text-sm text-slate-500">Try adjusting search, dates, or clear filters.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-9 rounded-xl"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[12px] bg-white shadow-sm ring-1 ring-slate-100">
          <div className="max-h-[min(70vh,720px)] overflow-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400 backdrop-blur">
                <tr>
                  <th className="px-3 py-2.5">Refund ID</th>
                  <th className="px-3 py-2.5">Order</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Cashier</th>
                  <th className="px-3 py-2.5">Refund Type</th>
                  <th className="px-3 py-2.5">Payment Method</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-3 py-2.5">Inventory</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Approved By</th>
                  <th className="px-3 py-2.5">Created</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = orderMeta[String(r.order_id)] || {};
                  const status = deriveStatus(r);
                  return (
                    <tr
                      key={String(r.id)}
                      className="cursor-pointer border-t border-slate-50 transition hover:bg-orange-50/40"
                      onClick={() => setSelected(r)}
                    >
                      <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-slate-800">
                        {shortId(r.id)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">{shortId(r.order_id)}</td>
                      <td className="max-w-[120px] truncate px-3 py-2.5 font-semibold text-slate-800">
                        {meta.customer_name || 'Walk-in'}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">
                        {r.created_by ? shortId(r.created_by) : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                          {String(r.refund_type)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 capitalize font-semibold text-slate-700">
                        {String(r.method || meta.payment_method || '—')}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-black tabular-nums text-slate-900">
                        {formatCurrency(Number(r.amount || 0))}
                      </td>
                      <td className="px-3 py-2.5">
                        <InventoryChip restored={Boolean(r.inventory_restored)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusChip status={status} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">
                        {r.approved_by ? shortId(r.approved_by) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                        {new Date(String(r.created_at)).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-slate-600"
                          onClick={() => setSelected(r)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-400">
            <span>
              Showing {filtered.length} of {rows.length} refunds
            </span>
            <span>{outletName}</span>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg"
          showCloseButton
        >
          {selected && (
            <>
              <SheetHeader className="border-b border-slate-100 px-5 py-4 text-left">
                <SheetTitle className="text-lg font-black text-slate-900">
                  Refund {shortId(selected.id)}
                </SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-2 text-xs">
                  <StatusChip status={deriveStatus(selected)} />
                  <InventoryChip restored={Boolean(selected.inventory_restored)} />
                  <span className="font-semibold text-slate-500">
                    {new Date(String(selected.created_at)).toLocaleString()}
                  </span>
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 p-5">
                <section className="rounded-[12px] bg-slate-50 p-3 ring-1 ring-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Order Summary
                  </h3>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-400">Order</dt>
                      <dd className="font-mono font-bold text-slate-800">{shortId(selected.order_id)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Customer</dt>
                      <dd className="font-bold text-slate-800">
                        {orderMeta[String(selected.order_id)]?.customer_name || 'Walk-in'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Order total</dt>
                      <dd className="font-bold tabular-nums text-slate-800">
                        {formatCurrency(Number(orderMeta[String(selected.order_id)]?.total_amount || 0))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Refund type</dt>
                      <dd className="font-bold capitalize text-slate-800">{String(selected.refund_type)}</dd>
                    </div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Items Refunded
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {selectedItems.length ? (
                      selectedItems.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between rounded-[12px] bg-white px-3 py-2 text-xs shadow-sm ring-1 ring-slate-100"
                        >
                          <span className="font-semibold text-slate-800">
                            {String(item.productName || item.product_name || 'Item')} ×{' '}
                            {Number(item.quantity || 0)}
                          </span>
                          <span className="font-bold tabular-nums text-slate-700">
                            {formatCurrency(
                              Number(item.unitPrice || item.unit_price || 0) * Number(item.quantity || 0)
                            )}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="rounded-[12px] bg-slate-50 px-3 py-3 text-xs text-slate-500">
                        {String(selected.refund_type) === 'full'
                          ? 'Full order refund — all sale lines eligible for restore.'
                          : 'No line items captured on this refund.'}
                      </li>
                    )}
                  </ul>
                </section>

                <section className="rounded-[12px] bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Inventory Restored
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                    {selected.inventory_restored ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Stock returned to inventory ledger
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                        Inventory was not restored for this refund
                      </>
                    )}
                  </p>
                </section>

                <section className="rounded-[12px] bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Payment Details
                  </h3>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-400">Method</dt>
                      <dd className="font-bold capitalize text-slate-800">{String(selected.method)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Amount</dt>
                      <dd className="text-base font-black tabular-nums text-[#FF6A00]">
                        {formatCurrency(Number(selected.amount || 0))}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-[12px] bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Reason
                  </h3>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {REFUND_REASON_LABELS[selected.reason_code as RefundReasonCode] ||
                      String(selected.reason_code)}
                  </p>
                  {selected.reason_notes ? (
                    <p className="mt-1 text-xs font-medium text-slate-500">{String(selected.reason_notes)}</p>
                  ) : null}
                </section>

                <section className="rounded-[12px] bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Approvals
                  </h3>
                  <p className="mt-2 text-xs font-semibold text-slate-700">
                    Approved by:{' '}
                    <span className="font-mono">{selected.approved_by ? shortId(selected.approved_by) : '—'}</span>
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    Created by:{' '}
                    <span className="font-mono">{selected.created_by ? shortId(selected.created_by) : '—'}</span>
                  </p>
                </section>

                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Audit Timeline
                  </h3>
                  <ol className="relative mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
                    <li className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-orange-500 ring-4 ring-white" />
                      <p className="text-xs font-bold text-slate-800">Refund created</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(String(selected.created_at)).toLocaleString()}
                      </p>
                    </li>
                    {selected.inventory_restored ? (
                      <li className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                        <p className="text-xs font-bold text-slate-800">Inventory restored</p>
                        <p className="text-[11px] text-slate-500">Stock ledger updated for refunded lines</p>
                      </li>
                    ) : null}
                    <li className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-400 ring-4 ring-white" />
                      <p className="text-xs font-bold text-slate-800">Status · {deriveStatus(selected)}</p>
                      <p className="text-[11px] text-slate-500">Recorded on refund transaction</p>
                    </li>
                  </ol>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <RefundDialog
        open={dialogOpen}
        outletId={outletId || null}
        onClose={() => setDialogOpen(false)}
        onCompleted={() => void load()}
      />
    </div>
  );
}
