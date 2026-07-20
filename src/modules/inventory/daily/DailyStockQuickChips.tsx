import { cn } from '@/lib/utils';
import type { DailyQuickFilter } from './types';

const CHIPS: { id: DailyQuickFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'updated', label: 'Updated' },
  { id: 'has_purchase', label: 'Has Purchase' },
  { id: 'has_consumption', label: 'Has Consumption' },
  { id: 'has_waste', label: 'Has Waste' },
  { id: 'low_stock', label: 'Low Stock' },
  { id: 'out_of_stock', label: 'Out Of Stock' },
  { id: 'recently_updated', label: 'Recently Updated' },
];

type Props = {
  active: DailyQuickFilter;
  counts: Partial<Record<DailyQuickFilter, number>>;
  onChange: (next: DailyQuickFilter) => void;
};

export function DailyStockQuickChips({ active, counts, onChange }: Props) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin" role="toolbar" aria-label="Quick filters">
      {CHIPS.map((chip) => {
        const selected = active === chip.id;
        const count = counts[chip.id];
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40',
              selected
                ? 'bg-[#FF6A00] text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900'
            )}
            aria-pressed={selected}
          >
            {chip.label}
            {typeof count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                  selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
