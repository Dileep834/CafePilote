import { useEffect, useState } from 'react';
import {
  Check,
  ChefHat,
  Phone,
  Printer,
  Truck,
  X,
  PackageCheck,
  Handshake,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnlineOrder } from '../types';
import { PlatformLogo } from './PlatformLogo';
import { getPlatform } from '../platforms';
import {
  acceptSecondsLeft,
  formatMoney,
  orderItemCount,
  paymentBadgeClass,
  paymentLabel,
  pickupMinutesLeft,
  pickupTone,
  statusBadgeClass,
  statusLabel,
} from '../lib';
import { useOnlineOrdersStore } from '../store';

type Props = {
  order: OnlineOrder;
  onOpen: () => void;
  compact?: boolean;
};

export function OnlineOrderCard({ order, onOpen, compact }: Props) {
  const acceptOrder = useOnlineOrdersStore((s) => s.acceptOrder);
  const rejectOrder = useOnlineOrdersStore((s) => s.rejectOrder);
  const setOrderStatus = useOnlineOrdersStore((s) => s.setOrderStatus);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const platform = getPlatform(order.platformId);
  const pickupLeft = pickupMinutesLeft(order);
  const tone = pickupTone(pickupLeft);
  const acceptLeft = acceptSecondsLeft(order);
  const items = orderItemCount(order);

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition duration-150 hover:shadow-md',
        tone === 'red' && order.status !== 'new' && 'ring-rose-200',
        tone === 'yellow' && order.status !== 'new' && 'ring-amber-200'
      )}
    >
      <div className="h-1 w-full" style={{ backgroundColor: platform.color }} />
      <div className={cn('p-3', compact && 'p-2.5')}>
        <div className="flex items-start gap-2.5">
          <PlatformLogo platformId={order.platformId} size={compact ? 'sm' : 'md'} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold" style={{ color: platform.color }}>
                {platform.label}
              </span>
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                  statusBadgeClass(order.status)
                )}
              >
                {statusLabel(order.status)}
              </span>
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                  paymentBadgeClass(order.payment)
                )}
              >
                {paymentLabel(order.payment)}
              </span>
            </div>
            <button type="button" onClick={onOpen} className="mt-0.5 text-left">
              <p className="text-sm font-black text-slate-900">#{order.externalId}</p>
              <p className="truncate text-xs font-medium text-slate-500">{order.customer.name}</p>
            </button>
          </div>
          <div className="text-right">
            <p className="text-sm font-black tabular-nums text-slate-900">
              {formatMoney(order.money.total)}
            </p>
            <p className="text-[10px] font-medium text-slate-400">{items} items</p>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
          {order.status === 'new' && acceptLeft !== null && (
            <span
              className={cn(
                'rounded-lg px-2 py-1 tabular-nums',
                acceptLeft <= 15 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'
              )}
            >
              Accept {acceptLeft}s
            </span>
          )}
          {pickupLeft !== null && order.status !== 'new' && (
            <span
              className={cn(
                'rounded-lg px-2 py-1 tabular-nums',
                tone === 'green' && 'bg-emerald-50 text-emerald-700',
                tone === 'yellow' && 'bg-amber-50 text-amber-700',
                tone === 'red' && 'bg-rose-50 text-rose-700',
                tone === 'neutral' && 'bg-slate-50 text-slate-500'
              )}
            >
              {pickupLeft >= 0 ? `Pickup in ${pickupLeft} min` : `Late ${Math.abs(pickupLeft)} min`}
            </span>
          )}
          <span className="rounded-lg bg-slate-50 px-2 py-1">
            Kitchen {order.kitchenMinutes} min
          </span>
          {order.partner && order.partner.status !== 'unassigned' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-blue-700">
              <Truck className="h-3 w-3" />
              {order.partner.name}
              {order.partner.etaMinutes != null ? ` · ${order.partner.etaMinutes}m` : ''}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {order.status === 'new' && (
            <>
              <ActionBtn variant="ghost" onClick={() => rejectOrder(order.id)} icon={X} label="Reject" />
              <ActionBtn variant="primary" onClick={() => acceptOrder(order.id)} icon={Check} label="Accept" />
            </>
          )}
          {order.status === 'accepted' && (
            <ActionBtn
              variant="primary"
              onClick={() => setOrderStatus(order.id, 'preparing')}
              icon={ChefHat}
              label="Preparing"
            />
          )}
          {order.status === 'preparing' && (
            <ActionBtn
              variant="primary"
              onClick={() => setOrderStatus(order.id, 'ready')}
              icon={PackageCheck}
              label="Ready"
            />
          )}
          {order.status === 'ready' && (
            <ActionBtn
              variant="primary"
              onClick={() => setOrderStatus(order.id, 'picked_up')}
              icon={Handshake}
              label="Hand Over"
            />
          )}
          {order.status === 'picked_up' && (
            <ActionBtn
              variant="primary"
              onClick={() => setOrderStatus(order.id, 'delivered')}
              icon={Check}
              label="Delivered"
            />
          )}
          <ActionBtn variant="ghost" onClick={onOpen} icon={MoreHorizontal} label="Details" />
          {order.customer.phone && (
            <ActionBtn
              variant="ghost"
              onClick={() => window.open(`tel:${order.customer.phone?.replace(/\s/g, '')}`)}
              icon={Phone}
              label="Call"
            />
          )}
          <ActionBtn variant="ghost" onClick={() => window.print()} icon={Printer} label="KOT" />
        </div>
      </div>
    </article>
  );
}

function ActionBtn({
  variant,
  onClick,
  icon: Icon,
  label,
}: {
  variant: 'primary' | 'ghost';
  onClick: () => void;
  icon: typeof Check;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-[11px] font-bold transition active:scale-[0.98]',
        variant === 'primary'
          ? 'bg-[#FF6A00] text-white shadow-sm'
          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
