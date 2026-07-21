import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { usePOSStore } from '../store/usePOSStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { formatCurrency } from '@/utils/format';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  Printer,
  Receipt,
  Search,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';

type HistoryItem = {
  id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type HistoryOrder = {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_phone?: string | null;
  table_number?: string | null;
  order_source?: string | null;
  total_amount: number;
  payment_method: string;
  status?: string;
  cashier_name?: string | null;
  created_by_name?: string | null;
  staff_name?: string | null;
  bill_number?: string | null;
  items: HistoryItem[];
};

type DateRange = 'today' | '7days' | '30days' | 'custom';
type PayFilter = 'all' | 'cash' | 'card' | 'upi' | 'cancelled' | 'refunded';

type Props = {
  variant?: 'panel' | 'drawer';
  open?: boolean;
  onClose?: () => void;
};

function shortBillNo(order: HistoryOrder) {
  if (order.bill_number) return order.bill_number;
  return `#${String(order.id).slice(0, 8).toUpperCase()}`;
}

function cashierOf(order: HistoryOrder) {
  return order.cashier_name || order.created_by_name || order.staff_name || '—';
}

function itemCount(order: HistoryOrder) {
  return (order.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
}

function HistoryBody({
  showClose,
  onClose,
}: {
  showClose?: boolean;
  onClose?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const outlets = useTenantStore((s) => s.outlets);
  const addItem = usePOSStore((s) => s.addItem);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>('today');
  const [payFilter, setPayFilter] = useState<PayFilter>('all');
  const [customFrom, setCustomFrom] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [customTo, setCustomTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const branchOutletId = (() => {
    const fromTenant = getTenantOutletId(user);
    const candidate =
      (activeOutletId && activeOutletId !== 'current-outlet' ? activeOutletId : null) ||
      (fromTenant && fromTenant !== 'current-outlet' && !fromTenant.startsWith('local')
        ? fromTenant
        : null) ||
      (user?.outletId && user.outletId !== 'current-outlet' ? user.outletId : null);
    return candidate;
  })();

  const branchName =
    outlets.find((o) => o.id === branchOutletId)?.name ||
    (branchOutletId ? 'This branch' : 'No branch selected');

  const load = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      if (!branchOutletId) {
        setOrders([]);
        setError('Select a branch to view order history');
        return;
      }

      const { ConnectivityService } = await import('@/modules/offline/services/ConnectivityService');
      const online = ConnectivityService.isOnline();

      const loadLocalFallback = async (): Promise<HistoryOrder[]> => {
        const { OfflineOrderRepository } = await import(
          '@/modules/offline/repositories/OfflineOrderRepository'
        );
        const { getOfflineDB } = await import('@/modules/offline/db/CafePilotsOfflineDB');
        const localOrders = await OfflineOrderRepository.listPending();
        // Also include recently synced local history (keep local rows)
        const allLocal = await getOfflineDB()
          .orders.where('outlet_id')
          .equals(branchOutletId)
          .toArray();

        const byId = new Map<string, (typeof allLocal)[number]>();
        for (const o of [...allLocal, ...localOrders]) byId.set(o.local_id, o);

        const mapped: HistoryOrder[] = [];
        for (const order of byId.values()) {
          if (order.outlet_id && order.outlet_id !== branchOutletId) continue;
          if (payFilter === 'cancelled' || payFilter === 'refunded') continue;
          if (!['completed', 'paid', 'settled'].includes(String(order.status || 'completed'))) {
            continue;
          }

          const created = dayjs(order.created_at);
          if (range === 'today' && !created.isAfter(dayjs().startOf('day').subtract(1, 'ms'))) continue;
          if (range === '7days' && created.isBefore(dayjs().subtract(7, 'day').startOf('day'))) continue;
          if (range === '30days' && created.isBefore(dayjs().subtract(30, 'day').startOf('day'))) continue;
          if (range === 'custom') {
            if (created.isBefore(dayjs(customFrom).startOf('day'))) continue;
            if (created.isAfter(dayjs(customTo).endOf('day'))) continue;
          }

          const items = await getOfflineDB()
            .order_items.where('order_local_id')
            .equals(order.local_id)
            .toArray();

          mapped.push({
            id: order.server_id || order.local_id,
            created_at: order.created_at,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            table_number: order.table_number,
            order_source: order.order_source,
            total_amount: order.total_amount,
            payment_method: order.payment_method,
            status: order.status,
            bill_number: order.server_order_number || order.temp_order_number,
            items: items.map((it) => ({
              id: it.local_id,
              product_id: it.product_id,
              product_name: it.product_name,
              quantity: it.quantity,
              unit_price: it.unit_price,
              total_price: it.total_price,
            })),
          });
        }

        return mapped
          .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
          .slice(0, 150);
      };

      if (!online) {
        const local = await loadLocalFallback();
        setOrders(local);
        if (local.length) {
          setMsg('Offline — showing local orders (TMP bill numbers until sync).');
          setError(null);
        } else {
          setError('Offline — no local orders cached for this branch yet.');
        }
        return;
      }

      let query = supabase
        .from('pos_orders')
        .select(
          `
          id, created_at, customer_name, customer_phone, table_number, order_source, status,
          total_amount, payment_method, outlet_id, notes,
          items:pos_order_items (
            id, product_id, product_name, quantity, unit_price, total_price
          )
        `
        )
        .eq('outlet_id', branchOutletId)
        .order('created_at', { ascending: false })
        .limit(150);

      if (payFilter === 'cancelled') query = query.eq('status', 'cancelled');
      else if (payFilter === 'refunded') query = query.eq('status', 'refunded');
      else query = query.in('status', ['completed', 'paid', 'settled']);

      if (range === 'today') query = query.gte('created_at', dayjs().startOf('day').toISOString());
      else if (range === '7days')
        query = query.gte('created_at', dayjs().subtract(7, 'day').startOf('day').toISOString());
      else if (range === '30days')
        query = query.gte('created_at', dayjs().subtract(30, 'day').startOf('day').toISOString());
      else if (range === 'custom') {
        query = query
          .gte('created_at', dayjs(customFrom).startOf('day').toISOString())
          .lte('created_at', dayjs(customTo).endOf('day').toISOString());
      }

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;
      setOrders((data || []) as unknown as HistoryOrder[]);
    } catch (e: any) {
      const raw = String(e?.message || e || '');
      const isNetwork =
        /failed to fetch|networkerror|fetch|offline|timeout/i.test(raw) ||
        e?.name === 'TypeError';

      try {
        const { OfflineOrderRepository } = await import(
          '@/modules/offline/repositories/OfflineOrderRepository'
        );
        const { getOfflineDB } = await import('@/modules/offline/db/CafePilotsOfflineDB');
        const allLocal = branchOutletId
          ? await getOfflineDB().orders.where('outlet_id').equals(branchOutletId).toArray()
          : await OfflineOrderRepository.listPending();

        const mapped: HistoryOrder[] = [];
        for (const order of allLocal) {
          const items = await getOfflineDB()
            .order_items.where('order_local_id')
            .equals(order.local_id)
            .toArray();
          mapped.push({
            id: order.server_id || order.local_id,
            created_at: order.created_at,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            table_number: order.table_number,
            order_source: order.order_source,
            total_amount: order.total_amount,
            payment_method: order.payment_method,
            status: order.status,
            bill_number: order.server_order_number || order.temp_order_number,
            items: items.map((it) => ({
              id: it.local_id,
              product_id: it.product_id,
              product_name: it.product_name,
              quantity: it.quantity,
              unit_price: it.unit_price,
              total_price: it.total_price,
            })),
          });
        }

        mapped.sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
        setOrders(mapped.slice(0, 150));
        if (isNetwork && mapped.length) {
          setMsg('Server unreachable — showing local offline orders.');
          setError(null);
        } else {
          setError(
            isNetwork
              ? 'Server unreachable — no local orders found. Check internet and retry.'
              : raw || 'Could not load order history'
          );
        }
      } catch {
        setOrders([]);
        setError(
          isNetwork
            ? 'Server unreachable. Check internet connection and try Refresh.'
            : raw || 'Could not load order history'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, branchOutletId, payFilter, customFrom, customTo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const method = String(order.payment_method || '').toLowerCase();
      if (payFilter === 'cash' && !method.includes('cash')) return false;
      if (payFilter === 'card' && !method.includes('card')) return false;
      if (payFilter === 'upi' && !method.includes('upi')) return false;

      if (!q) return true;
      const hay = [
        shortBillNo(order),
        order.id,
        order.customer_name,
        order.customer_phone,
        order.table_number,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, search, payFilter]);

  const reorder = async (order: HistoryOrder) => {
    const { user } = useAuthStore.getState();
    const companyId = getScopedCompanyId(user);
    let pq = supabase.from('products').select('*').eq('is_active', true);
    if (companyId) pq = pq.eq('company_id', companyId);
    const { data: products } = await pq;

    const byId = new Map((products || []).map((p: any) => [p.id, p]));
    const byName = new Map(
      (products || []).map((p: any) => [String(p.name).toLowerCase(), p])
    );

    let added = 0;
    for (const line of order.items || []) {
      const product =
        (line.product_id && byId.get(line.product_id)) ||
        byName.get(String(line.product_name).toLowerCase());
      if (product) {
        for (let i = 0; i < (line.quantity || 1); i++) addItem(product);
        added += line.quantity || 1;
      } else {
        addItem({
          id: line.product_id || `hist-${line.id}`,
          name: line.product_name,
          selling_price: line.unit_price,
          sellingPrice: line.unit_price,
        });
        added += line.quantity || 1;
      }
    }
    setMsg(`Added ${added} item${added === 1 ? '' : 's'} to cart`);
    setTimeout(() => setMsg(null), 2000);
  };

  const printReceipt = (order: HistoryOrder) => {
    const lines = (order.items || [])
      .map(
        (i) =>
          `${i.quantity}× ${i.product_name} — ${formatCurrency(Number(i.total_price) || 0)}`
      )
      .join('\n');
    const win = window.open('', '_blank', 'width=360,height=640');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${shortBillNo(order)}</title>
      <style>
        body{font-family:ui-monospace,Menlo,monospace;padding:16px;color:#0D1B2A}
        h1{font-size:16px;margin:0 0 8px}
        .muted{color:#64748b;font-size:12px}
        hr{border:none;border-top:1px dashed #cbd5e1;margin:12px 0}
        pre{white-space:pre-wrap;font-size:12px}
        .total{font-size:18px;font-weight:800;color:#FF6A00}
      </style></head><body>
      <h1>CafePilots Receipt</h1>
      <div class="muted">${shortBillNo(order)} · ${dayjs(order.created_at).format('DD MMM YYYY · hh:mm A')}</div>
      <div class="muted">Table: ${order.table_number || '—'} · ${order.customer_name || 'Walk-in'}</div>
      <div class="muted">Paid via ${order.payment_method || '—'} · Cashier ${cashierOf(order)}</div>
      <hr/><pre>${lines}</pre><hr/>
      <div class="total">Total ${formatCurrency(Number(order.total_amount) || 0)}</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  const ranges: { id: DateRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: '7days', label: '7 Days' },
    { id: '30days', label: '30 Days' },
    { id: 'custom', label: 'Custom' },
  ];

  const payFilters: { id: PayFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'cash', label: 'Cash' },
    { id: 'card', label: 'Card' },
    { id: 'upi', label: 'UPI' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'refunded', label: 'Refunded' },
  ];

  return (
    <>
      <div
        className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4"
        style={{ backgroundColor: '#F3F3F8' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl sm:h-9 sm:w-9"
          style={{ backgroundColor: BRAND.navy }}
        >
          <History className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold sm:text-base" style={{ color: BRAND.navy }}>
            Order history
          </h2>
          <p className="truncate text-[11px] text-slate-500">Completed bills · {branchName}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
        {showClose && onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-b border-slate-100 px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Bill #, customer, phone, table…"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={cn(
                'h-8 shrink-0 rounded-full border px-3 text-xs font-bold',
                range === r.id
                  ? 'border-[#0D1B2A] bg-[#0D1B2A] text-white'
                  : 'border-slate-200 bg-white text-slate-600'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="flex gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 flex-1 rounded-lg border border-slate-200 px-2 text-xs font-semibold"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 flex-1 rounded-lg border border-slate-200 px-2 text-xs font-semibold"
            />
          </div>
        )}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {payFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setPayFilter(f.id)}
              className={cn(
                'h-7 shrink-0 rounded-full border px-2.5 text-[11px] font-bold',
                payFilter === f.id
                  ? 'border-brand-orange bg-orange-50 text-brand-orange'
                  : 'border-slate-200 bg-white text-slate-500'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800">
          {msg}
        </div>
      )}
      {error && (
        <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3 pb-24 md:pb-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No orders match these filters.
          </div>
        ) : (
          filtered.map((order) => {
            const openRow = expanded === order.id;
            const status = String(order.status || 'completed');
            return (
              <div
                key={order.id}
                className={cn(
                  'overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200',
                  openRow ? 'border-brand-orange/40 shadow-md' : 'border-slate-200'
                )}
              >
                <button
                  type="button"
                  className="w-full px-3.5 py-3 text-left"
                  onClick={() => setExpanded(openRow ? null : order.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-brand-navy">
                          {shortBillNo(order)}
                        </span>
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase',
                            status.includes('cancel')
                              ? 'bg-rose-50 text-rose-600'
                              : status.includes('refund')
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                          )}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {formatCurrency(Number(order.total_amount) || 0)}
                        <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          {order.payment_method || '—'}
                        </span>
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        'mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                        openRow && 'rotate-180'
                      )}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500 sm:grid-cols-3">
                    <span>
                      <span className="font-bold text-slate-400">Table </span>
                      {order.table_number || '—'}
                    </span>
                    <span className="truncate">
                      <span className="font-bold text-slate-400">Customer </span>
                      {order.customer_name || 'Walk-in'}
                    </span>
                    <span>
                      <span className="font-bold text-slate-400">Items </span>
                      {itemCount(order)}
                    </span>
                    <span>
                      <span className="font-bold text-slate-400">Cashier </span>
                      {cashierOf(order)}
                    </span>
                    <span className="col-span-2 sm:col-span-2">
                      <span className="font-bold text-slate-400">When </span>
                      {dayjs(order.created_at).format('DD MMM YYYY · hh:mm A')}
                    </span>
                  </div>
                </button>

                <div
                  className={cn(
                    'grid transition-all duration-300 ease-out',
                    openRow ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-2 border-t border-dashed border-slate-200 px-3.5 pb-3 pt-2">
                      {(order.items || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between gap-2 text-xs text-slate-600"
                        >
                          <span className="truncate font-medium">
                            {item.quantity}× {item.product_name}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatCurrency(Number(item.total_price) || 0)}
                          </span>
                        </div>
                      ))}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-xl px-2 text-[11px] font-bold"
                          onClick={() => setExpanded(order.id)}
                        >
                          <Receipt className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-xl px-2 text-[11px] font-bold"
                          onClick={() => printReceipt(order)}
                        >
                          <Printer className="mr-1 h-3.5 w-3.5" />
                          Print
                        </Button>
                        <Button
                          type="button"
                          className="h-9 rounded-xl px-2 text-[11px] font-bold text-white"
                          style={{ backgroundColor: BRAND.orange }}
                          onClick={() => void reorder(order)}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Repeat
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export function POSOrderHistory({ variant = 'drawer', open = true, onClose }: Props) {
  if (variant === 'panel') {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white sm:rounded-none sm:border-0 sm:bg-transparent">
        <HistoryBody />
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Close history"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md animate-in slide-in-from-right flex-col overflow-hidden bg-white shadow-2xl duration-200">
        <HistoryBody showClose onClose={onClose} />
      </div>
    </div>
  );
}
