import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { alertPriority, reorderQuantity, STATUS_STYLES } from '../lib/status';
import type { InventoryItem } from '../types';
import { StatusBadge } from './StatusBadge';

type Props = {
  item: InventoryItem;
  onReorder?: (item: InventoryItem) => void;
};

const PRIORITY_STYLE = {
  Critical: 'bg-red-50 text-red-700 ring-red-600/15',
  Low: 'bg-orange-50 text-orange-700 ring-orange-600/15',
  Expiring: 'bg-amber-50 text-amber-800 ring-amber-600/15',
} as const;

export function InventoryAlert({ item, onReorder }: Props) {
  const priority = alertPriority(item.status);
  const qty = reorderQuantity(item);
  const border = STATUS_STYLES[item.status].border;
  const tint = STATUS_STYLES[item.status].tint;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border-l-4 p-4 transition-shadow duration-200 hover:shadow-md sm:gap-4 sm:p-5',
        border,
        tint
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-900">{item.productName}</p>
          <p className="mt-0.5 text-[13px] text-slate-500">{item.productCode || 'No SKU'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {priority ? (
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset',
                PRIORITY_STYLE[priority]
              )}
            >
              {priority}
            </span>
          ) : (
            <StatusBadge status={item.status} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Current" value={`${item.quantity}${item.unit}`} />
        <Metric label="Minimum" value={`${item.minStock}${item.unit}`} />
        <Metric label="Supplier" value={item.supplier !== '—' ? item.supplier : 'Not set'} />
        <Metric label="Reorder Qty" value={`${qty}${item.unit}`} emphasize />
      </div>

      <Button
        type="button"
        className="h-11 w-full rounded-xl bg-[#FF6A00] text-white transition-colors duration-200 hover:bg-[#e85f00] md:h-10 md:w-auto md:self-start"
        onClick={() => onReorder?.(item)}
      >
        Create Purchase Order
      </Button>
    </div>
  );
}

function Metric({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p
        className={cn(
          'mt-0.5 truncate text-base font-semibold tabular-nums',
          emphasize ? 'text-slate-900' : 'text-slate-700'
        )}
      >
        {value}
      </p>
    </div>
  );
}
