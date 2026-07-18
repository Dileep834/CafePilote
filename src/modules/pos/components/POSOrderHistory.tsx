import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { usePOSStore } from '../store/usePOSStore';
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
  ChevronUp,
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
  table_number?: string | null;
  order_source?: string | null;
  total_amount: number;
  payment_method: string;
  status?: string;
  items: HistoryItem[];
};

type DateRange = 'today' | '7days' | '30days' | 'all';

type Props = {
  /** panel = fill left workspace; drawer = slide-over (legacy) */
  variant?: 'panel' | 'drawer';
  /** Required for drawer; ignored for panel (always visible when mounted) */
  open?: boolean;
  onClose?: () => void;
};

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
    try {
      if (!branchOutletId) {
        setOrders([]);
        setError('Select a branch to view order history');
        return;
      }

      let query = supabase
        .from('pos_orders')
        .select(
          `
          id, created_at, customer_name, table_number, order_source, status,
          total_amount, payment_method, outlet_id,
          items:pos_order_items (
            id, product_id, product_name, quantity, unit_price, total_price
          )
        `
        )
        .eq('status', 'completed')
        .eq('outlet_id', branchOutletId)
        .order('created_at', { ascending: false })
        .limit(100);

      const today = dayjs().startOf('day').toISOString();
      if (range === 'today') query = query.gte('created_at', today);
      else if (range === '7days')
        query = query.gte('created_at', dayjs().subtract(7, 'day').startOf('day').toISOString());
      else if (range === '30days')
        query = query.gte('created_at', dayjs().subtract(30, 'day').startOf('day').toISOString());

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;
      setOrders((data || []) as unknown as HistoryOrder[]);
    } catch (e: any) {
      setError(e?.message || 'Could not load order history');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, branchOutletId]);

  const reorder = async (order: HistoryOrder) => {
    const { data: products } = await supabase.from('products').select('*').eq('is_active', true);

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

  const ranges: { id: DateRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: '7days', label: '7 days' },
    { id: '30days', label: '30 days' },
    { id: 'all', label: 'All' },
  ];

  return (
    <>
      <div
        className="px-3 sm:px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 shrink-0"
        style={{ backgroundColor: '#F3F3F8' }}
      >
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: BRAND.navy }}
        >
          <History className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm sm:text-base font-bold" style={{ color: BRAND.navy }}>
            Order history
          </h2>
          <p className="text-[11px] text-slate-500 truncate">
            Completed bills · {branchName}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
        {showClose && onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-b border-slate-100 shrink-0">
        {ranges.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-bold border shrink-0',
              range === r.id
                ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                : 'bg-white text-slate-600 border-slate-200'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className="px-4 py-2 text-xs font-medium bg-emerald-50 text-emerald-800 border-b border-emerald-100">
          {msg}
        </div>
      )}
      {error && (
        <div className="px-4 py-2 text-xs font-medium bg-rose-50 text-rose-700 border-b border-rose-100">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24 md:pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading orders…
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No completed orders in this range.
          </div>
        ) : (
          orders.map((order) => {
            const openRow = expanded === order.id;
            return (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full text-left px-3 py-3 flex items-start gap-2"
                  onClick={() => setExpanded(openRow ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">
                        {formatCurrency(Number(order.total_amount) || 0)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {order.payment_method || '—'}
                      </span>
                      {order.order_source === 'qr' && (
                        <span className="text-[10px] font-bold uppercase text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          QR
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {order.table_number
                        ? `Table ${order.table_number}`
                        : order.customer_name || 'Walk-in'}
                      {' · '}
                      {dayjs(order.created_at).format('DD MMM · hh:mm A')}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {(order.items || []).length} line
                      {(order.items || []).length === 1 ? '' : 's'}
                    </p>
                  </div>
                  {openRow ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  )}
                </button>

                {openRow && (
                  <div className="px-3 pb-3 border-t border-slate-100 pt-2 space-y-2">
                    {(order.items || []).map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between gap-2 text-xs text-slate-600"
                      >
                        <span className="font-medium truncate">
                          {item.quantity}× {item.product_name}
                        </span>
                        <span className="tabular-nums shrink-0">
                          {formatCurrency(Number(item.total_price) || 0)}
                        </span>
                      </div>
                    ))}
                    <Button
                      type="button"
                      className="w-full h-9 rounded-xl text-xs font-bold text-white mt-1"
                      style={{ backgroundColor: BRAND.orange }}
                      onClick={() => void reorder(order)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Add to cart again
                    </Button>
                  </div>
                )}
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
      <div className="flex flex-col h-full min-h-0 bg-white sm:bg-transparent rounded-t-2xl sm:rounded-none overflow-hidden border border-slate-200 sm:border-0 rounded-2xl sm:rounded-none">
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
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
        <HistoryBody showClose onClose={onClose} />
      </div>
    </div>
  );
}
