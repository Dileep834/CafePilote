import { CheckCircle2, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from './lib';

type Props = {
  updated: number;
  total: number;
  lastSavedAt: string | null;
  autoSaveEnabled: boolean;
};

export function DailyStockProgressCard({
  updated,
  total,
  lastSavedAt,
  autoSaveEnabled,
}: Props) {
  const pct = total > 0 ? Math.round((updated / total) * 100) : 0;

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Today&apos;s Progress
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {updated} / {total}{' '}
            <span className="text-base font-semibold text-slate-500 sm:text-lg">Products Updated</span>
          </p>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-[#FF6A00]">{pct}%</p>
          </div>
          <div className="hidden h-10 w-px bg-slate-100 sm:block" />
          <div className="space-y-1 text-sm">
            <p className="inline-flex items-center gap-1.5 font-medium text-slate-600">
              <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              Last Saved{' '}
              <span className="font-semibold text-slate-800">{formatRelativeTime(lastSavedAt)}</span>
            </p>
            <p className="inline-flex items-center gap-1.5 font-medium text-slate-600">
              <CheckCircle2
                className={cn('h-3.5 w-3.5', autoSaveEnabled ? 'text-emerald-500' : 'text-slate-300')}
                aria-hidden
              />
              Auto Saved{' '}
              <span className={cn('font-semibold', autoSaveEnabled ? 'text-emerald-700' : 'text-slate-500')}>
                {autoSaveEnabled ? 'Enabled' : 'Off'}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Daily stock progress"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-out',
            pct >= 100 ? 'bg-emerald-500' : 'bg-[#FF6A00]'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
