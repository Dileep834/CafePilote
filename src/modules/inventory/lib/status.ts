import type { InventoryItem, StockStatus } from '../types';

export function getStockStatus(qty: number, min: number, hasStockRecord: boolean): StockStatus {
  if (!hasStockRecord) return 'Not Counted';
  if (qty <= 0) return 'Out of Stock';
  if (min > 0 && qty <= min * 0.35) return 'Critical';
  if (min > 0 && qty <= min) return 'Low';
  return 'Healthy';
}

/** Consistent badge / progress colors across Inventory */
export const STATUS_STYLES: Record<
  StockStatus,
  { badge: string; dot: string; bar: string; border: string; tint: string; label: string }
> = {
  Healthy: {
    label: 'Healthy',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    border: 'border-l-emerald-500',
    tint: 'bg-emerald-50/70',
  },
  Low: {
    label: 'Low',
    badge: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/15',
    dot: 'bg-orange-500',
    bar: 'bg-orange-500',
    border: 'border-l-orange-500',
    tint: 'bg-orange-50/70',
  },
  Critical: {
    label: 'Critical',
    badge: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    border: 'border-l-red-500',
    tint: 'bg-red-50/70',
  },
  'Out of Stock': {
    label: 'Out of Stock',
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-400/20',
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
    border: 'border-l-slate-400',
    tint: 'bg-slate-50',
  },
  Expiring: {
    label: 'Expiring',
    badge: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/15',
    dot: 'bg-violet-500',
    bar: 'bg-violet-500',
    border: 'border-l-violet-500',
    tint: 'bg-violet-50/70',
  },
  'Not Counted': {
    label: 'Not Counted',
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/15',
    dot: 'bg-sky-500',
    bar: 'bg-sky-500',
    border: 'border-l-sky-500',
    tint: 'bg-sky-50/70',
  },
};

export function isAttentionStatus(status: StockStatus) {
  return status === 'Low' || status === 'Critical' || status === 'Out of Stock' || status === 'Expiring';
}

export function stockFillRatio(item: InventoryItem) {
  const target = item.maxStock > 0 ? item.maxStock : Math.max(item.minStock * 2, item.quantity, 1);
  return Math.min(1, Math.max(0, item.quantity / target));
}

export function reorderQuantity(item: InventoryItem) {
  const target = Math.max(item.minStock, item.maxStock || item.minStock);
  return Math.max(0, Math.ceil(target - item.quantity));
}

export function alertPriority(status: StockStatus): 'Critical' | 'Low' | 'Expiring' | null {
  if (status === 'Critical' || status === 'Out of Stock') return 'Critical';
  if (status === 'Low') return 'Low';
  if (status === 'Expiring') return 'Expiring';
  return null;
}
