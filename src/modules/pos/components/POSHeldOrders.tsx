import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowRightLeft,
  Clock,
  Merge,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSStore, type HeldOrder } from '../store/usePOSStore';
import { formatCurrency } from '@/utils/format';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

type Props = {
  onResumed?: () => void;
};

type HeldSort = 'newest' | 'oldest' | 'total' | 'items';

function tableOf(order: HeldOrder) {
  const fromNotes = String(order.notes || '').match(/table\s+([A-Za-z0-9-]+)/i);
  if (fromNotes?.[1]) return fromNotes[1];
  const name = String(order.customer_name || '');
  const fromName = name.match(/table\s+([A-Za-z0-9-]+)/i);
  if (fromName?.[1]) return fromName[1];
  return '—';
}

function holdDuration(createdAt: string) {
  return dayjs(createdAt).fromNow(true);
}

export function POSHeldOrders({ onResumed }: Props) {
  const heldOrders = usePOSStore((s) => s.heldOrders);
  const fetchHeldOrders = usePOSStore((s) => s.fetchHeldOrders);
  const resumeOrder = usePOSStore((s) => s.resumeOrder);
  const discardHeldOrder = usePOSStore((s) => s.discardHeldOrder);
  const mergeHeldOrders = usePOSStore((s) => s.mergeHeldOrders);
  const transferHeldTable = usePOSStore((s) => s.transferHeldTable);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<HeldSort>('newest');
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);

  useEffect(() => {
    void fetchHeldOrders();
  }, [fetchHeldOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...heldOrders];
    if (q) {
      list = list.filter((o) => {
        const hay = [o.notes, o.customer_name, o.customer_phone, tableOf(o), o.id]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    list.sort((a, b) => {
      if (sort === 'oldest') return +new Date(a.created_at) - +new Date(b.created_at);
      if (sort === 'total') return Number(b.total_amount) - Number(a.total_amount);
      if (sort === 'items') return b.items.length - a.items.length;
      return +new Date(b.created_at) - +new Date(a.created_at);
    });
    return list;
  }, [heldOrders, search, sort]);

  const handleTransfer = async (orderId: string) => {
    const label = window.prompt('Transfer to table number');
    if (!label?.trim()) return;
    await transferHeldTable(orderId, label.trim());
  };

  const handleMergePick = async (targetId: string) => {
    if (!mergeSourceId) {
      setMergeSourceId(targetId);
      return;
    }
    if (mergeSourceId === targetId) {
      setMergeSourceId(null);
      return;
    }
    await mergeHeldOrders(targetId, mergeSourceId);
    setMergeSourceId(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-t-2xl bg-white sm:rounded-none sm:bg-transparent">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2.5 sm:px-0">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: BRAND.navy }}
        >
          <Clock className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold" style={{ color: BRAND.navy }}>
            Held orders
          </h2>
          <p className="text-[11px] text-slate-500">
            {heldOrders.length} parked · {mergeSourceId ? 'Tap another card to merge' : 'Resume when ready'}
          </p>
        </div>
        <select
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600"
          value={sort}
          onChange={(e) => setSort(e.target.value as HeldSort)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="total">Highest total</option>
          <option value="items">Most items</option>
        </select>
      </div>

      <div className="relative mb-2 px-3 sm:px-0">
        <Search className="pointer-events-none absolute left-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:left-3" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search table, customer, phone…"
          className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1 px-1 pb-24 sm:px-0 md:pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <Clock className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm font-semibold text-slate-500">No held orders</p>
            <p className="mt-1 text-xs">Use Hold / Park on the cart to park a ticket</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 p-1">
            {filtered.map((order) => {
              const itemQty = order.items.reduce((s, i) => s + (i.quantity || 0), 0);
              const merging = mergeSourceId === order.id;
              return (
                <div
                  key={order.id}
                  className={cn(
                    'rounded-2xl border bg-white p-3.5 shadow-sm transition-all duration-200 hover:shadow-md',
                    merging ? 'border-brand-orange ring-2 ring-brand-orange/20' : 'border-slate-200'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-brand-navy px-2 py-0.5 text-[11px] font-black text-white">
                          T {tableOf(order)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          Held {dayjs(order.created_at).format('hh:mm A')}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-sm font-bold text-slate-800">
                        {order.customer_name || order.notes || 'Held order'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {itemQty} items
                        </span>
                        <span className="font-bold text-brand-orange">
                          {formatCurrency(order.total_amount)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Clock className="h-3 w-3" />
                          {holdDuration(order.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    <Button
                      type="button"
                      className="h-9 rounded-xl bg-brand-orange text-[11px] font-bold text-white hover:bg-[#e55f00]"
                      onClick={() => {
                        void resumeOrder(order.id);
                        onResumed?.();
                      }}
                    >
                      Resume <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl border-slate-200 bg-white text-[11px] font-bold text-slate-900"
                      onClick={() => void handleTransfer(order.id)}
                    >
                      <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
                      Transfer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'h-9 rounded-xl border-slate-200 bg-white text-[11px] font-bold text-slate-900',
                        merging && 'border-[#FF6A00] text-[#FF6A00]'
                      )}
                      onClick={() => void handleMergePick(order.id)}
                    >
                      <Merge className="mr-1 h-3.5 w-3.5" />
                      {merging ? 'Selected' : 'Merge'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl border-red-200 text-[11px] font-bold text-red-500 hover:bg-red-50"
                      onClick={() => void discardHeldOrder(order.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
