import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnlineOrdersStore } from '../store';
import { PlatformLogo } from './PlatformLogo';
import { getPlatform } from '../platforms';

const KIND_LABEL: Record<string, string> = {
  new_order: 'New Order',
  cancelled: 'Cancelled',
  driver_arrived: 'Driver Arrived',
  late_pickup: 'Late Pickup',
  payment_failed: 'Payment Failed',
  refund: 'Refund',
  kitchen_delay: 'Kitchen Delay',
  customer_call: 'Customer Call',
  store_offline: 'Store Offline',
};

type Props = {
  onOpenOrder: (orderId: string) => void;
};

export function OrderAlertCenter({ onOpenOrder }: Props) {
  const [open, setOpen] = useState(false);
  const alerts = useOnlineOrdersStore((s) => s.alerts);
  const unread = useOnlineOrdersStore((s) => s.unreadAlertCount());
  const markAlertRead = useOnlineOrdersStore((s) => s.markAlertRead);
  const markAllAlertsRead = useOnlineOrdersStore((s) => s.markAllAlertsRead);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-50"
        aria-label="Order alerts"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6A00] px-1 text-[9px] font-black text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80]"
            aria-label="Close alerts"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-11 z-[85] w-[min(100vw-1.5rem,360px)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.16)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
              <p className="text-sm font-bold text-slate-900">Alert Center</p>
              <button
                type="button"
                onClick={() => markAllAlertsRead()}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-slate-400">No alerts</p>
              ) : (
                alerts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      markAlertRead(a.id);
                      if (a.orderId) onOpenOrder(a.orderId);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-start gap-2.5 border-b border-slate-50 px-3 py-2.5 text-left transition hover:bg-slate-50',
                      !a.read && 'bg-orange-50/40'
                    )}
                  >
                    {a.platformId ? (
                      <PlatformLogo platformId={a.platformId} size="sm" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold text-slate-500">
                        !
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {KIND_LABEL[a.kind] || a.kind}
                        </span>
                        {!a.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#FF6A00]" />
                        )}
                      </div>
                      <p className="truncate text-xs font-bold text-slate-800">{a.title}</p>
                      <p className="truncate text-[11px] text-slate-500">{a.body}</p>
                      {a.platformId && (
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {getPlatform(a.platformId).label}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
