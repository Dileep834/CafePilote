import { cn } from '@/lib/utils';
import { STATUS_STYLES, stockFillRatio } from '../lib/status';
import type { InventoryItem } from '../types';

type Props = {
  item: InventoryItem;
  className?: string;
  compact?: boolean;
};

export function StockProgress({ item, className, compact }: Props) {
  const ratio = stockFillRatio(item);
  const pct = Math.round(ratio * 100);
  const barColor = STATUS_STYLES[item.status].bar;
  const target = item.maxStock > 0 ? item.maxStock : Math.max(item.minStock * 2, item.quantity, 1);

  return (
    <div className={cn(compact ? 'min-w-0 space-y-1.5' : 'min-w-[132px] space-y-2', className)}>
      <div className={cn('w-full overflow-hidden rounded-full bg-slate-100', compact ? 'h-1.5' : 'h-[6px]')}>
        <div
          className={cn('h-full rounded-full transition-all duration-200 ease-out', barColor)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={item.quantity}
          aria-valuemin={0}
          aria-valuemax={target}
          aria-label={`${item.productName} stock level`}
        />
      </div>
      <p
        className={cn(
          'font-semibold tabular-nums text-slate-800',
          compact ? 'text-sm' : 'text-base'
        )}
      >
        {item.quantity} {item.unit}
        <span className="font-medium text-slate-400">
          {' '}
          / {target} {item.unit}
        </span>
      </p>
    </div>
  );
}
