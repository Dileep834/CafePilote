import { cn } from '@/lib/utils';

type Props = {
  label: string;
  count: number;
  tone: 'healthy' | 'low' | 'critical' | 'expiring';
  active?: boolean;
  onClick?: () => void;
};

const TONE = {
  healthy: {
    tint: 'bg-emerald-50/80',
    border: 'border-l-emerald-500',
    active: 'ring-emerald-200 shadow-sm',
    count: 'text-emerald-700',
  },
  low: {
    tint: 'bg-orange-50/80',
    border: 'border-l-orange-500',
    active: 'ring-orange-200 shadow-sm',
    count: 'text-orange-700',
  },
  critical: {
    tint: 'bg-red-50/80',
    border: 'border-l-red-500',
    active: 'ring-red-200 shadow-sm',
    count: 'text-red-700',
  },
  expiring: {
    tint: 'bg-violet-50/80',
    border: 'border-l-violet-500',
    active: 'ring-violet-200 shadow-sm',
    count: 'text-violet-700',
  },
} as const;

export function InventoryHealthCard({ label, count, tone, active, onClick }: Props) {
  const styles = TONE[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex min-w-[148px] flex-1 snap-start items-center gap-3 rounded-xl border-l-4 px-4 py-3.5 text-left sm:min-w-0 sm:gap-4 sm:px-5 sm:py-4',
        'ring-1 ring-slate-100 transition-all duration-200 ease-out',
        styles.tint,
        styles.border,
        active && styles.active,
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40'
      )}
    >
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[13px]">
          {label}
        </p>
        <p
          className={cn(
            'mt-1 text-[24px] font-semibold leading-none tabular-nums sm:text-[28px]',
            styles.count
          )}
        >
          {count}
          <span className="ml-1.5 text-sm font-medium text-slate-400 sm:text-base">Items</span>
        </p>
      </div>
    </button>
  );
}
