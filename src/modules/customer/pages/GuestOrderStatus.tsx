import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Clock, Loader2, RefreshCw, CheckCircle2, ChefHat, Utensils } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import type { Table } from '@/types';
import { useGuestAuthStore } from '../store/useGuestAuthStore';
import dayjs from 'dayjs';

type KitchenStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

type GuestOrder = {
  id: string;
  created_at: string;
  kitchen_status: KitchenStatus;
  status: string;
  table_number: string | null;
  items: { id: string; product_name: string; quantity: number }[];
};

const STATUS_META: Record<
  KitchenStatus,
  { label: string; hint: string; color: string; bg: string }
> = {
  pending: { label: 'Received', hint: 'Kitchen got your order', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  preparing: { label: 'Preparing', hint: 'Being cooked now', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
  ready: { label: 'Ready', hint: 'On the way to your table', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  delivered: { label: 'Served', hint: 'Enjoy your meal', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
};

type Props = {
  table: Table;
  onBack: () => void;
};

export function GuestOrderStatus({ table, onBack }: Props) {
  const guest = useGuestAuthStore((s) => s.guest);
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setError(null);
    try {
      const since = dayjs().subtract(6, 'hour').toISOString();
      let query = supabase
        .from('pos_orders')
        .select(
          `
          id, created_at, kitchen_status, status, table_number, customer_name, notes, order_source,
          items:pos_order_items ( id, product_name, quantity )
        `
        )
        .eq('table_id', table.id)
        .gte('created_at', since)
        .in('status', ['sent', 'completed'])
        .order('created_at', { ascending: false });

      let { data, error: qErr } = await query;

      if (qErr) {
        // Legacy fallback — match notes / customer_name
        const fb = await supabase
          .from('pos_orders')
          .select(
            `
            id, created_at, kitchen_status, status, customer_name, notes,
            items:pos_order_items ( id, product_name, quantity )
          `
          )
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(40);
        if (fb.error) throw fb.error;
        data = (fb.data || []).filter((row: any) => {
          const blob = `${row.customer_name || ''} ${row.notes || ''}`.toLowerCase();
          return (
            blob.includes(table.tableNumber.toLowerCase()) ||
            blob.includes(table.id.toLowerCase()) ||
            (guest?.email && blob.includes(guest.email.toLowerCase()))
          );
        });
      }

      // Prefer guest's own tickets when email is present
      let rows = (data || []) as any[];
      if (guest?.email) {
        const mine = rows.filter((r) =>
          `${r.customer_name || ''} ${r.notes || ''}`.toLowerCase().includes(guest.email.toLowerCase())
        );
        if (mine.length) rows = mine;
      }

      setOrders(
        rows.map((r) => ({
          id: r.id,
          created_at: r.created_at,
          kitchen_status: (r.kitchen_status || 'pending') as KitchenStatus,
          status: r.status,
          table_number: r.table_number || table.tableNumber,
          items: r.items || [],
        }))
      );
    } catch (e: any) {
      setError(e?.message || 'Could not load order status');
    } finally {
      setLoading(false);
    }
  }, [table.id, table.tableNumber, guest?.email]);

  useEffect(() => {
    setLoading(true);
    void fetchOrders();
    const id = window.setInterval(() => void fetchOrders(), 8000);
    return () => window.clearInterval(id);
  }, [fetchOrders]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: BRAND.gray }}>
      <div className="bg-white px-4 pt-10 pb-4 border-b border-black/5 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600"
            aria-label="Back to menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold" style={{ color: BRAND.navy }}>
              Order status
            </h1>
            <p className="text-xs text-slate-500 truncate">
              Table {table.tableNumber}
              {guest?.email ? ` · ${guest.email}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void fetchOrders();
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600"
            aria-label="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-8">
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: BRAND.orange }} />
            <p className="text-sm font-semibold">Checking kitchen…</p>
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-3">{error}</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Clock className="w-10 h-10 mb-3 opacity-30" style={{ color: BRAND.navy }} />
            <p className="font-bold" style={{ color: BRAND.navy }}>
              No orders yet
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Add items from the menu and send to kitchen — status will show up here.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-6 h-11 px-5 rounded-xl text-white font-bold"
              style={{ backgroundColor: BRAND.orange }}
            >
              Browse menu
            </button>
          </div>
        ) : (
          orders.map((order) => {
            const meta = STATUS_META[order.kitchen_status] || STATUS_META.pending;
            return (
              <div
                key={order.id}
                className={cn('rounded-2xl border bg-white p-4 shadow-sm', meta.bg)}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className={cn('text-sm font-black uppercase tracking-wide', meta.color)}>
                      {meta.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{meta.hint}</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                    {dayjs(order.created_at).format('h:mm A')}
                  </span>
                </div>

                <StatusRail status={order.kitchen_status} />

                <div className="mt-3 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: BRAND.navy }}
                      >
                        {item.quantity}x
                      </span>
                      <span className="font-semibold" style={{ color: BRAND.navy }}>
                        {item.product_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatusRail({ status }: { status: KitchenStatus }) {
  const steps: { key: KitchenStatus; icon: React.ReactNode; label: string }[] = [
    { key: 'pending', icon: <Clock className="w-3.5 h-3.5" />, label: 'In' },
    { key: 'preparing', icon: <ChefHat className="w-3.5 h-3.5" />, label: 'Cook' },
    { key: 'ready', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Ready' },
    { key: 'delivered', icon: <Utensils className="w-3.5 h-3.5" />, label: 'Served' },
  ];
  const order = ['pending', 'preparing', 'ready', 'delivered'];
  const activeIdx = Math.max(0, order.indexOf(status));

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const done = i <= activeIdx;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={cn('h-0.5 flex-1 rounded', done ? 'bg-[#FF6A00]' : 'bg-slate-200')} />
            )}
            <div
              className={cn(
                'flex flex-col items-center gap-0.5 min-w-[2.5rem]',
                done ? 'text-[#FF6A00]' : 'text-slate-300'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center border-2',
                  done ? 'border-[#FF6A00] bg-orange-50' : 'border-slate-200 bg-white'
                )}
              >
                {step.icon}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wide">{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
