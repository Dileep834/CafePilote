import {
  Phone,
  Printer,
  Truck,
  X,
  MapPin,
  MessageSquare,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnlineOrdersStore } from '../store';
import { PlatformLogo } from './PlatformLogo';
import { getPlatform } from '../platforms';
import {
  formatMoney,
  paymentBadgeClass,
  paymentLabel,
  statusBadgeClass,
  statusLabel,
} from '../lib';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OrderDetailsDrawer({ open, onClose }: Props) {
  const selectedOrderId = useOnlineOrdersStore((s) => s.selectedOrderId);
  const orders = useOnlineOrdersStore((s) => s.orders);
  const setOrderStatus = useOnlineOrdersStore((s) => s.setOrderStatus);
  const order = orders.find((o) => o.id === selectedOrderId);

  if (!open || !order) return null;

  const platform = getPlatform(order.platformId);
  const m = order.money;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[88] bg-slate-900/30 backdrop-blur-[2px] transition duration-150"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-[89] flex w-full max-w-[420px] flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-150">
        <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
          <PlatformLogo platformId={order.platformId} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold" style={{ color: platform.color }}>
              {platform.label}
            </p>
            <h2 className="text-lg font-black text-slate-900">#{order.externalId}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold', statusBadgeClass(order.status))}>
                {statusLabel(order.status)}
              </span>
              <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold', paymentBadgeClass(order.payment))}>
                {paymentLabel(order.payment)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {/* Customer */}
          <section className="mb-5">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Customer
            </h3>
            <p className="text-sm font-bold text-slate-900">{order.customer.name}</p>
            {order.customer.phone && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <Phone className="h-3 w-3" />
                {order.customer.phone}
              </p>
            )}
            {order.customer.address && (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  {order.customer.address}
                  {order.customer.landmark ? ` · ${order.customer.landmark}` : ''}
                </span>
              </p>
            )}
            {order.customer.instructions && (
              <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                {order.customer.instructions}
              </p>
            )}
            {order.customer.orderCount != null && (
              <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <History className="h-3 w-3" />
                {order.customer.orderCount} past orders
              </p>
            )}
          </section>

          {/* Rider */}
          {order.partner && (
            <section className="mb-5 rounded-2xl bg-slate-50 p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Truck className="h-3 w-3" />
                Delivery Partner
              </h3>
              <p className="text-sm font-bold text-slate-800">{order.partner.name}</p>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                {order.partner.phone && <span>{order.partner.phone}</span>}
                {order.partner.vehicle && <span>· {order.partner.vehicle}</span>}
                {order.partner.etaMinutes != null && <span>· ETA {order.partner.etaMinutes} min</span>}
                <span className="font-bold capitalize text-blue-600">{order.partner.status}</span>
              </div>
              {order.partner.phone && (
                <button
                  type="button"
                  onClick={() => window.open(`tel:${order.partner?.phone?.replace(/\s/g, '')}`)}
                  className="mt-2 inline-flex h-8 items-center gap-1 rounded-xl bg-white px-2.5 text-[11px] font-bold text-slate-700 shadow-sm"
                >
                  <Phone className="h-3 w-3" />
                  Call rider
                </button>
              )}
            </section>
          )}

          {/* Items */}
          <section className="mb-5">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Items
            </h3>
            <ul className="space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      <span className="tabular-nums text-slate-400">{item.quantity}×</span> {item.name}
                    </p>
                    {item.modifiers?.length ? (
                      <p className="text-[11px] text-slate-400">{item.modifiers.join(', ')}</p>
                    ) : null}
                    {item.notes && <p className="text-[11px] text-amber-600">{item.notes}</p>}
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-slate-700">
                    {formatMoney(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Money breakdown */}
          <section className="mb-5 rounded-2xl border border-slate-100 p-3">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Bill
            </h3>
            <MoneyRow label="Subtotal" value={m.subtotal} />
            {m.discount > 0 && <MoneyRow label="Discount" value={-m.discount} />}
            <MoneyRow label="Tax" value={m.tax} />
            <MoneyRow label="Packing" value={m.packing} />
            {m.delivery > 0 && <MoneyRow label="Delivery" value={m.delivery} />}
            <MoneyRow label="Platform commission" value={-m.platformCommission} muted />
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-sm font-bold text-slate-900">Customer total</span>
              <span className="text-sm font-black tabular-nums">{formatMoney(m.total)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">Restaurant earnings</span>
              <span className="text-xs font-black tabular-nums text-emerald-700">
                {formatMoney(m.earnings)}
              </span>
            </div>
          </section>

          {order.notes && (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">{order.notes}</p>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-xs font-bold text-white"
          >
            <Printer className="h-3.5 w-3.5" />
            Print bill
          </button>
          {order.status === 'preparing' && (
            <button
              type="button"
              onClick={() => setOrderStatus(order.id, 'ready')}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[#FF6A00] text-xs font-bold text-white"
            >
              Mark ready
            </button>
          )}
          {order.customer.phone && (
            <button
              type="button"
              onClick={() => window.open(`tel:${order.customer.phone?.replace(/\s/g, '')}`)}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700"
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}

function MoneyRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-xs">
      <span className={cn('text-slate-500', muted && 'text-slate-400')}>{label}</span>
      <span className={cn('font-semibold tabular-nums text-slate-700', muted && 'text-slate-400')}>
        {formatMoney(value)}
      </span>
    </div>
  );
}
