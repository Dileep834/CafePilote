import { cn } from '@/lib/utils';
import type { POStatusFilter } from '../lib/poHelpers';

const CHIPS: { id: POStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Draft', label: 'Draft' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Ordered', label: 'Ordered' },
  { id: 'Received', label: 'Received' },
  { id: 'Cancelled', label: 'Cancelled' },
  { id: 'Overdue', label: 'Overdue' },
];

type Props = {
  active: POStatusFilter;
  counts: Partial<Record<POStatusFilter, number>>;
  onChange: (next: POStatusFilter) => void;
};

export function POQuickChips({ active, counts, onChange }: Props) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="toolbar" aria-label="PO status filters">
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
              <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-bold', selected ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
