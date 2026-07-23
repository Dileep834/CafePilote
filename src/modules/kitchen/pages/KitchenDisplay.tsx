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
  const [mobileTab, setMobileTab] = useState<KitchenStatus>('pending');

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

  const advanceOrder = async (orderId: string, next: KitchenStatus) => {
    await updateOrderStatus(orderId, next);
    if (next !== 'delivered' && typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setMobileTab(next);
    }
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
                <GripVertical className="hidden h-4 w-4 shrink-0 text-slate-500 md:block" />
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
            <div className={cn('flex shrink-0 items-center gap-1.5 text-sm font-black', isLate ? 'animate-pulse text-red-400' : 'text-slate-400')}>
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
                <div className="text-base font-bold leading-tight text-slate-100 sm:text-lg">{item.product_name}</div>
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
            className="inline-flex h-12 min-w-[4.5rem] items-center justify-center gap-1 rounded-xl bg-slate-700 px-3 text-xs font-black text-white touch-manipulation hover:bg-slate-600"
            title="Bump"
          >
            <Zap className="h-4 w-4" />
            Bump
          </button>
          {column.next && (
            <button
              type="button"
              onClick={() => void advanceOrder(order.id, column.next!)}
              className={cn(
                'flex h-12 flex-1 items-center justify-center gap-2 rounded-xl py-3 font-black text-white touch-manipulation transition-colors',
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

  const renderColumn = (column: KitchenColumn, opts?: { fill?: boolean }) => {
    const Icon = column.icon;
    const columnOrders = grouped[column.status];
    return (
      <div
        key={column.status}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => void handleDrop(column.status)}
        className={cn(
          'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1220] shadow-sm',
          opts?.fill ? 'h-full' : 'min-h-[280px] md:min-h-0'
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 sm:px-5 sm:py-4">
          <h2
            className={cn(
              'flex items-center gap-2 text-base font-black sm:text-lg',
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
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#050B18] p-3 [-webkit-overflow-scrolling:touch] sm:space-y-4 sm:p-4">
          {columnOrders.length === 0 && !isLoading && (
            <div className="flex min-h-[180px] flex-col items-center justify-center text-slate-400 md:min-h-[240px]">
              {column.status === 'pending' ? (
                <ChefHat className="mb-3 h-12 w-12 text-slate-700" />
              ) : (
                <TimerReset className="mb-3 h-10 w-10 text-slate-700" />
              )}
              <p className="font-bold">No {column.title.toLowerCase()} tickets</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Use Start / Ready / Deliver to move tickets
              </p>
            </div>
          )}
          {columnOrders.map((order) => (
            <TicketCard key={order.id} order={order} column={column} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#020617] font-sans text-slate-200">
      <div className="shrink-0 space-y-3 border-b border-slate-800/80 px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-white sm:gap-3 sm:text-3xl">
              <Utensils className="h-6 w-6 shrink-0 text-amber-500 sm:h-8 sm:w-8" />
              <span className="truncate">Kitchen Display</span>
            </h1>
            <p className="mt-0.5 text-sm font-semibold text-slate-400">Real-time order fulfillment</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 sm:px-4">
              <p className="text-[10px] font-black uppercase text-slate-500">Delayed</p>
              <p className={cn('text-lg font-black', delayedCount > 0 ? 'text-red-400' : 'text-emerald-400')}>
                {delayedCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 sm:px-4">
              <p className="text-[10px] font-black uppercase text-slate-500">Items</p>
              <p className="text-lg font-black text-white">{activeQty}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 sm:px-4">
              <p className="text-[10px] font-black uppercase text-slate-500">All day</p>
              <p className="text-lg font-black text-amber-300">{allDayCount}</p>
            </div>
            <div className="col-span-2 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 sm:col-span-1 sm:px-4">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400 sm:text-sm">Live</span>
            </div>
            <div className="rounded-xl bg-slate-800 px-3 py-2 text-center font-mono text-base font-black text-white shadow-inner sm:px-4 sm:text-xl">
              {nowLabel}
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 touch-pan-x [-webkit-overflow-scrolling:touch]">
          {DEFAULT_KITCHEN_STATIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStation(s.id)}
              className={cn(
                'h-10 shrink-0 rounded-xl px-3 text-xs font-bold transition touch-manipulation',
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
              'ml-auto h-10 shrink-0 rounded-xl px-3 text-xs font-bold touch-manipulation',
              showCompleted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-400'
            )}
          >
            Done ({completedToday.length})
          </button>
        </div>

        {showCompleted && (
          <div className="max-h-36 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-3">
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
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-800 px-2.5 font-bold text-amber-300 touch-manipulation"
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

        {/* Mobile status tabs */}
        <div className="grid grid-cols-3 gap-1.5 md:hidden">
          {COLUMNS.map((column) => {
            const count = grouped[column.status].length;
            const active = mobileTab === column.status;
            return (
              <button
                key={column.status}
                type="button"
                onClick={() => setMobileTab(column.status)}
                className={cn(
                  'flex h-12 flex-col items-center justify-center rounded-xl text-xs font-black touch-manipulation',
                  active
                    ? column.color === 'amber'
                      ? 'bg-amber-500 text-slate-950'
                      : column.color === 'blue'
                        ? 'bg-blue-500 text-white'
                        : 'bg-emerald-500 text-white'
                    : 'bg-slate-900 text-slate-300 ring-1 ring-slate-800'
                )}
              >
                <span>{column.title}</span>
                <span className={cn('text-[10px]', active ? 'opacity-90' : 'text-slate-500')}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: one active lane */}
      <div className="min-h-0 flex-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        {renderColumn(COLUMNS.find((c) => c.status === mobileTab) || COLUMNS[0], { fill: true })}
      </div>

      {/* Tablet / desktop: three lanes */}
      <div className="hidden min-h-0 flex-1 grid-cols-3 gap-4 overflow-hidden p-4 md:grid lg:gap-6 lg:p-6">
        {COLUMNS.map((column) => renderColumn(column, { fill: true }))}
      </div>

      {draggingOrderId && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-amber-500/30 bg-slate-900 px-4 py-2 text-sm font-black text-amber-300 shadow-2xl">
          Drop ticket into a status lane
        </div>
      )}
    </div>
  );
}

