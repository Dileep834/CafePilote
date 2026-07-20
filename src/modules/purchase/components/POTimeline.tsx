import { cn } from '@/lib/utils';
import { TIMELINE_STEPS, timelineIndex } from '../lib/poHelpers';
import type { PurchaseOrder } from '../store/usePurchaseStore';

type Props = {
  status: PurchaseOrder['status'];
  className?: string;
};

export function POTimeline({ status, className }: Props) {
  const active = timelineIndex(status);
  const cancelled = status === 'Cancelled';

  return (
    <div className={cn('w-full', className)} aria-label="Purchase order status timeline">
      {cancelled ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Order cancelled</p>
      ) : (
        <ol className="flex flex-wrap gap-2">
          {TIMELINE_STEPS.map((step, idx) => {
            const done = active >= idx;
            const current = active === idx;
            return (
              <li
                key={step}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                  done ? 'bg-[#FF6A00]/10 text-[#FF6A00]' : 'bg-slate-100 text-slate-400',
                  current && 'ring-2 ring-[#FF6A00]/30'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', done ? 'bg-[#FF6A00]' : 'bg-slate-300')} />
                {step}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
