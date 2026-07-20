import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChefHat,
  CheckCircle,
  Clock,
  GripVertical,
  RotateCcw,
  TimerReset,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useKitchenStore } from '../store/useKitchenStore';
import type { KitchenOrder, KitchenStatus } from '../store/useKitchenStore';
import { DEFAULT_KITCHEN_STATIONS, orderMatchesStation } from '../lib/stations';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

type KitchenColumn = {
  status: KitchenStatus;
  title: string;
  color: string;
  icon: LucideIcon;
  next?: KitchenStatus;
  action: string;
};

const COLUMNS: KitchenColumn[] = [
  { status: 'pending', title: 'Pending', color: 'amber', icon: Clock, next: 'preparing', action: 'Start' },
  { status: 'preparing', title: 'Preparing', color: 'blue', icon: ChefHat, next: 'ready', action: 'Ready' },
  { status: 'ready', title: 'Ready', color: 'green', icon: CheckCircle, next: 'delivered', action: 'Deliver' },
];

function orderAgeMinutes(order: KitchenOrder) {
  return Math.max(0, dayjs().diff(dayjs(order.created_at), 'minute'));
}

function estimatePrepMinutes(order: KitchenOrder) {
  const qty = order.items?.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) || 1;
  return Math.min(35, Math.max(8, qty * 4));
}

function priorityLabel(age: number, status: KitchenStatus) {
  if (age >= 25 && status !== 'ready') return { label: 'Urgent', className: 'bg-red-500 text-white animate-pulse' };
  if (age >= 15 && status !== 'ready') return { label: 'Delayed', className: 'bg-amber-500 text-white' };
  return { label: 'Normal', className: 'bg-slate-700 text-slate-200' };
}

export function KitchenDisplay() {
  const {
    orders,
    completedToday,
    fetchOrders,
    fetchCompletedToday,
    subscribeToOrders,
    unsubscribeFromOrders,
    updateOrderStatus,
    bumpOrder,
    recallOrder,
    selectedStation,
    setSelectedStation,
    isLoading,
  } = useKitchenStore();
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [nowLabel, setNowLabel] = useState(() => dayjs().format('HH:mm:ss'));
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchCompletedToday();
    subscribeToOrders();

    const timer = window.setInterval(() => setNowLabel(dayjs().format('HH:mm:ss')), 1000);
    return () => {
      window.clearInterval(timer);
      unsubscribeFromOrders();
    };
  }, [fetchOrders, fetchCompletedToday, subscribeToOrders, unsubscribeFromOrders]);

  const stationFiltered = useMemo(() => {
    return orders.filter((order) =>
      orderMatchesStation(
        selectedStation,
        (order.items || []).map((i) => i.product_name)
      )
    );
  }, [orders, selectedStation]);

  const grouped = useMemo(
    () => ({
      pending: stationFiltered.filter((o) => o.kitchen_status === 'pending'),
      preparing: stationFiltered.filter((o) => o.kitchen_status === 'preparing'),
      ready: stationFiltered.filter((o) => o.kitchen_status === 'ready'),
    }),
    [stationFiltered]
  );

  const delayedCount = stationFiltered.filter(
    (order) => orderAgeMinutes(order) >= 15 && order.kitchen_status !== 'ready'
  ).length;
  const activeQty = stationFiltered.reduce(
    (sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0),
    0
  );
  const allDayCount = activeQty + completedToday.reduce(
    (sum, order) => sum + (order.items?.reduce((s, i) => s + i.quantity, 0) || 0),
    0
  );

  const handleDrop = async (status: KitchenStatus) => {
    if (!draggingOrderId) return;
    await updateOrderStatus(draggingOrderId, status);
    setDraggingOrderId(null);
  };

  const TicketCard = ({ order, column }: { order: KitchenOrder; column: KitchenColumn }) => {
    const age = orderAgeMinutes(order);
    const prep = estimatePrepMinutes(order);
    const eta = dayjs(order.created_at).add(prep, 'minute');
    const isLate = age > prep && order.kitchen_status !== 'ready';
    const priority = priorityLabel(age, order.kitchen_status);

    return (
      <div
        draggable
        onDragStart={() => setDraggingOrderId(order.id)}
        onDragEnd={() => setDraggingOrderId(null)}
        className={cn(
          'flex flex-col overflow-hidden rounded-xl border bg-slate-800 shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4',
          column.status === 'pending'
            ? 'border-amber-500/30'
            : column.status === 'preparing'
              ? 'border-blue-500/30'
              : 'border-green-500/30',
          isLate && 'ring-2 ring-red-500/60'
        )}
      >
        <div
          className={cn(
            'border-b px-4 py-3',
            column.status === 'pending'
              ? 'border-amber-500/20 bg-amber-500/10'
              : column.status === 'preparing'
                ? 'border-blue-500/20 bg-blue-500/10'
                : 'border-green-500/20 bg-green-500/10'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="shrink-0 text-lg font-black text-white">
                  #{order.id.substring(0, 5).toUpperCase()}
                </span>
                {(order.table_number || order.customer_name) && (
                  <span className="truncate rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-sm font-bold text-amber-100">
                    {order.table_number ? `Table ${order.table_number}` : order.customer_name}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-black uppercase', priority.className)}>
                  {priority.label}
                </span>
                <span className="rounded-md bg-slate-700 px-2 py-0.5 text-[10px] font-black uppercase text-slate-200">
                  ETA {eta.format('hh:mm A')}
                </span>
                {order.order_source && (
                  <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-sky-300">
                    {order.order_source}
                  </span>
                )}
              </div>
            </div>
            <div className={cn('flex shrink-0 items-center gap-1.5 text-sm font-black', isLate ? 'text-red-400 animate-pulse' : 'text-slate-400')}>
              <Clock className="h-4 w-4" />
              <span>{age}m</span>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 p-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-sm font-black text-white">
                {item.quantity}x
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold leading-tight text-slate-100">{item.product_name}</div>
                {item.notes && <div className="mt-1 text-xs font-semibold text-amber-200">{item.notes}</div>}
              </div>
            </div>
          ))}
          {order.notes && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-2 text-xs font-semibold text-slate-300">
              {order.notes}
            </div>
          )}
        </div>

        <div className="flex gap-2 bg-slate-900/50 p-3">
          <button
            type="button"
            onClick={() => void bumpOrder(order.id)}
            className="inline-flex h-11 items-center justify-center gap-1 rounded-lg bg-slate-700 px-3 text-xs font-black text-white hover:bg-slate-600"
            title="Bump"
          >
            <Zap className="h-4 w-4" />
            Bump
          </button>
          {column.next && (
            <button
              type="button"
              onClick={() => updateOrderStatus(order.id, column.next!)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-3 font-black text-white transition-colors',
                column.next === 'preparing'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : column.next === 'ready'
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-slate-700 hover:bg-slate-600'
              )}
            >
              {column.next === 'ready' ? <CheckCircle className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
              {column.action}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col bg-[#020617] p-4 font-sans text-slate-200 md:min-h-screen md:p-6 lg:p-8">
      <div className="mb-6 flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
            <Utensils className="h-8 w-8 text-amber-500" />
            Kitchen Display System
          </h1>
          <p className="mt-1 font-semibold text-slate-400">Real-time order fulfillment tracker</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Delayed</p>
            <p className={cn('text-lg font-black', delayedCount > 0 ? 'text-red-400' : 'text-emerald-400')}>{delayedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Items</p>
            <p className="text-lg font-black text-white">{activeQty}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">All day</p>
            <p className="text-lg font-black text-amber-300">{allDayCount}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm font-black uppercase tracking-widest text-emerald-400">Live</span>
          </div>
          <div className="rounded-xl bg-slate-800 px-4 py-2 font-mono text-xl font-black text-white shadow-inner">
            {nowLabel}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {DEFAULT_KITCHEN_STATIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedStation(s.id)}
            className={cn(
              'rounded-xl px-3 py-1.5 text-xs font-bold transition',
              selectedStation === s.id
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 ring-1 ring-slate-800 hover:bg-slate-800'
            )}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setShowCompleted((v) => !v);
            void fetchCompletedToday();
          }}
          className={cn(
            'ml-auto rounded-xl px-3 py-1.5 text-xs font-bold',
            showCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-400'
          )}
        >
          Completed queue ({completedToday.length})
        </button>
      </div>

      {showCompleted && (
        <div className="mb-4 max-h-40 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-3">
          <div className="space-y-2">
            {completedToday.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs"
              >
                <span className="font-black text-white">#{order.id.slice(0, 5).toUpperCase()}</span>
                <span className="truncate text-slate-400">
                  {order.table_number ? `T${order.table_number}` : order.customer_name || '—'}
                </span>
                <button
                  type="button"
                  onClick={() => void recallOrder(order.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 font-bold text-amber-300"
                >
                  <RotateCcw className="h-3 w-3" />
                  Recall
                </button>
              </div>
            ))}
            {!completedToday.length && (
              <p className="py-4 text-center text-slate-500">No completed tickets today</p>
            )}
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 min-h-0 md:grid-cols-3 lg:gap-6">
        {COLUMNS.map((column) => {
          const Icon = column.icon;
          const columnOrders = grouped[column.status];
          return (
            <div
              key={column.status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(column.status)}
              className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1220] shadow-sm md:min-h-[480px]"
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
                <h2
                  className={cn(
                    'flex items-center gap-2 text-lg font-black',
                    column.color === 'amber'
                      ? 'text-amber-500'
                      : column.color === 'blue'
                        ? 'text-blue-400'
                        : 'text-green-400'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {column.title}
                </h2>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-sm font-black',
                    column.color === 'amber'
                      ? 'bg-amber-500/20 text-amber-500'
                      : column.color === 'blue'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-green-500/20 text-green-400'
                  )}
                >
                  {columnOrders.length}
                </span>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto bg-[#050B18] p-4">
                {columnOrders.length === 0 && !isLoading && (
                  <div className="flex min-h-[240px] flex-col items-center justify-center text-slate-400 md:min-h-[360px]">
                    {column.status === 'pending' ? <ChefHat className="mb-3 h-12 w-12 text-slate-700" /> : <TimerReset className="mb-3 h-10 w-10 text-slate-700" />}
                    <p className="font-bold">No {column.title.toLowerCase()} tickets</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Drop tickets here to update status</p>
                  </div>
                )}
                {columnOrders.map((order) => (
                  <TicketCard key={order.id} order={order} column={column} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {draggingOrderId && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-500/30 bg-slate-900 px-4 py-2 text-sm font-black text-amber-300 shadow-2xl">
          Drop ticket into a status lane
        </div>
      )}
    </div>
  );
}
