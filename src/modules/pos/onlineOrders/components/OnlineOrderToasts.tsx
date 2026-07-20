import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useOnlineOrdersStore } from '../store';
import { PlatformLogo } from './PlatformLogo';
import { getPlatform } from '../platforms';
import {
  acceptSecondsLeft,
  formatMoney,
  paymentBadgeClass,
  paymentLabel,
} from '../lib';
import { Check, X } from 'lucide-react';

export function OnlineOrderToasts() {
  const toasts = useOnlineOrdersStore((s) => s.toasts);
  const orders = useOnlineOrdersStore((s) => s.orders);
  const acceptOrder = useOnlineOrdersStore((s) => s.acceptOrder);
  const rejectOrder = useOnlineOrdersStore((s) => s.rejectOrder);
  const dismissToast = useOnlineOrdersStore((s) => s.dismissToast);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-3 top-[4.5rem] z-[90] flex w-[min(100vw-1.5rem,340px)] flex-col gap-2 sm:right-4">
      {toasts.slice(0, 4).map((toast) => {
        const order = orders.find((o) => o.id === toast.orderId);
        if (!order || order.status !== 'new') return null;
        const platform = getPlatform(order.platformId);
        const left = acceptSecondsLeft(order);
        return (
          <div
            key={toast.id}
            className="pointer-events-auto animate-in fade-in slide-in-from-right-2 duration-150 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
          >
            <div className="h-1 w-full" style={{ backgroundColor: platform.color }} />
            <div className="p-3">
              <div className="flex items-start gap-2.5">
                <PlatformLogo platformId={order.platformId} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    New {platform.label} Order
                  </p>
                  <p className="text-xs font-semibold text-slate-500">#{order.externalId}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-black tabular-nums text-slate-900">
                      {formatMoney(order.money.total)}
                    </span>
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                        paymentBadgeClass(order.payment)
                      )}
                    >
                      {paymentLabel(order.payment)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      Kitchen {order.kitchenMinutes} min
                    </span>
                  </div>
                  {left !== null && (
                    <p
                      className={cn(
                        'mt-1 text-[11px] font-bold tabular-nums',
                        left <= 15 ? 'text-rose-600' : 'text-amber-600'
                      )}
                    >
                      Accept within {left}s
                    </p>
                  )}
                  {order.notes && (
                    <p className="mt-1 text-[11px] text-slate-500">{order.notes}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-lg p-1 text-slate-300 hover:bg-slate-50 hover:text-slate-500"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => rejectOrder(order.id)}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition active:scale-[0.98]"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => acceptOrder(order.id)}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-[#FF6A00] text-xs font-bold text-white shadow-sm transition active:scale-[0.98]"
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
