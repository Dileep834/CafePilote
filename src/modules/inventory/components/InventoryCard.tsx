import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone?: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'orange';
  /** e.g. "+8%" — sign controls trend color */
  trend?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  emptyHint?: string;
  onClick?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
};

const TONE: Record<NonNullable<Props['tone']>, string> = {
  slate: 'bg-slate-100 text-slate-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-sky-50 text-sky-600',
  orange: 'bg-orange-50 text-orange-600',
};

function trendPositive(trend: string) {
  return trend.trim().startsWith('+') || trend.includes('↑');
}

export function InventoryCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = 'slate',
  trend,
  empty,
  emptyMessage,
  emptyHint,
  onClick,
  onAction,
  actionLabel,
  className,
}: Props) {
  const Comp = onClick ? 'button' : 'div';
  const up = trend ? trendPositive(trend) : true;

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group flex min-h-[140px] flex-col rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 sm:min-h-[156px] sm:p-5',
        'transition-all duration-200 ease-out',
        onClick &&
          'cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40',
        !onClick && 'hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 sm:h-11 sm:w-11',
            TONE[tone]
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        {trend && !empty ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-semibold sm:px-2.5 sm:text-[13px]',
              up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            )}
          >
            {up ? (
              <TrendingUp className="h-3 w-3" aria-hidden />
            ) : (
              <TrendingDown className="h-3 w-3" aria-hidden />
            )}
            {trend}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500 sm:mt-4 sm:text-[13px]">
        {label}
      </p>

      {empty ? (
        <div className="mt-2 flex flex-1 flex-col justify-between gap-3">
          <div>
            <p className="text-sm font-semibold leading-snug text-slate-800 sm:text-base">
              {emptyMessage || 'No data yet'}
            </p>
            {emptyHint ? (
              <p className="mt-1 hidden text-[13px] leading-snug text-slate-500 sm:block">{emptyHint}</p>
            ) : null}
          </div>
          {onAction && actionLabel ? (
            <span
              role={onClick ? undefined : 'button'}
              tabIndex={onClick ? undefined : 0}
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              onKeyDown={(e) => {
                if (!onClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onAction();
                }
              }}
              className="self-start rounded-lg bg-[#FF6A00] px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#e85f00]"
            >
              {actionLabel}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-1 flex flex-1 flex-col justify-between gap-2">
          <div>
            <p className="text-[28px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums sm:text-[32px]">
              {value}
            </p>
            <p className="mt-2 text-[12px] text-slate-500 sm:text-[13px]">{subtitle}</p>
          </div>
          {onAction && actionLabel ? (
            <span
              role={onClick ? undefined : 'button'}
              tabIndex={onClick ? undefined : 0}
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              onKeyDown={(e) => {
                if (!onClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onAction();
                }
              }}
              className="self-start text-sm font-semibold text-[#FF6A00] underline-offset-2 transition-colors hover:text-[#e85f00] hover:underline"
            >
              {actionLabel}
            </span>
          ) : null}
        </div>
      )}
    </Comp>
  );
}
