import { cn } from '@/lib/utils';
import { STATUS_STYLES } from '../lib/status';
import type { StockStatus } from '../types';

type Props = {
  status: StockStatus;
  className?: string;
};

export function StatusBadge({ status, className }: Props) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold',
        style.badge,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden />
      {style.label}
    </span>
  );
}
