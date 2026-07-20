import { cn } from '@/lib/utils';
import type { AdjustmentQuickFilter } from './types';

const CHIPS: { id: AdjustmentQuickFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'increase', label: 'Increase' },
  { id: 'decrease', label: 'Decrease' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
];

type Props = {
  active: AdjustmentQuickFilter;
  counts: Partial<Record<AdjustmentQuickFilter, number>>;
  onChange: (next: AdjustmentQuickFilter) => void;
};

export function AdjustmentQuickChips({ active, counts, onChange }: Props) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="toolbar" aria-label="Quick adjustment filters">
      {CHIPS.map((chip) => {
        const selected = active === chip.id;
        const count = counts[chip.id];
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40',
              selected ? 'bg-[#FF6A00] text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            )}
            aria-pressed={selected}
          >
            {chip.label}
            {typeof count === 'number' ? (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-bold', selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
