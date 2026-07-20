import type {
  OnlineOrder,
  OnlineOrderStatus,
  OnlinePaymentKind,
  OnlinePlatformId,
} from './types';
import { getPlatform, PAYMENT_LABELS, STATUS_LABELS } from './platforms';
import { formatCurrency } from '@/utils/format';

export function orderItemCount(order: OnlineOrder) {
  return order.items.reduce((sum, i) => sum + i.quantity, 0);
}

export function statusLabel(status: OnlineOrderStatus) {
  return STATUS_LABELS[status] || status;
}

export function paymentLabel(payment: OnlinePaymentKind) {
  return PAYMENT_LABELS[payment] || payment;
}

export function paymentBadgeClass(payment: OnlinePaymentKind) {
  switch (payment) {
    case 'prepaid':
      return 'bg-emerald-50 text-emerald-700';
    case 'cod':
      return 'bg-amber-50 text-amber-700';
    case 'online':
      return 'bg-blue-50 text-blue-700';
    case 'card':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function statusBadgeClass(status: OnlineOrderStatus) {
  switch (status) {
    case 'new':
      return 'bg-orange-50 text-orange-700';
    case 'accepted':
    case 'preparing':
      return 'bg-blue-50 text-blue-700';
    case 'ready':
      return 'bg-emerald-50 text-emerald-700';
    case 'picked_up':
    case 'delivered':
      return 'bg-slate-100 text-slate-600';
    case 'cancelled':
    case 'rejected':
    case 'expired':
      return 'bg-rose-50 text-rose-700';
    case 'refunded':
      return 'bg-violet-50 text-violet-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

/** Seconds remaining to accept a new order */
export function acceptSecondsLeft(order: OnlineOrder, now = Date.now()) {
  if (order.status !== 'new' || !order.acceptWithinSec) return null;
  const deadline = new Date(order.createdAt).getTime() + order.acceptWithinSec * 1000;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** Prep progress 0–1 after accepted */
export function prepProgress(order: OnlineOrder, now = Date.now()) {
  const start = order.prepStartedAt || order.acceptedAt;
  if (!start || order.kitchenMinutes <= 0) return 0;
  const elapsed = (now - new Date(start).getTime()) / 60000;
  return Math.min(1, Math.max(0, elapsed / order.kitchenMinutes));
}

export function pickupMinutesLeft(order: OnlineOrder, now = Date.now()) {
  if (!order.pickupEtaAt) return null;
  return Math.ceil((new Date(order.pickupEtaAt).getTime() - now) / 60000);
}

export type TimerTone = 'green' | 'yellow' | 'red' | 'neutral';

export function pickupTone(minutesLeft: number | null): TimerTone {
  if (minutesLeft === null) return 'neutral';
  if (minutesLeft <= 3) return 'red';
  if (minutesLeft <= 8) return 'yellow';
  return 'green';
}

export function formatMoney(n: number) {
  return formatCurrency(n);
}

export function platformAccent(platformId: OnlinePlatformId) {
  return getPlatform(platformId);
}

export function isActivePipeline(status: OnlineOrderStatus) {
  return ['new', 'accepted', 'preparing', 'ready'].includes(status);
}

export function isLate(order: OnlineOrder, now = Date.now()) {
  const left = pickupMinutesLeft(order, now);
  if (left === null) return false;
  if (['picked_up', 'delivered', 'cancelled', 'rejected', 'expired', 'refunded'].includes(order.status))
    return false;
  return left < 0;
}
