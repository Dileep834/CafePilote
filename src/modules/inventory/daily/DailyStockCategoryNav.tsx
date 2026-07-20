import { cn } from '@/lib/utils';

export type CategoryNavItem = {
  name: string;
  total: number;
  updated: number;
  pending: number;
};

type Props = {
  categories: CategoryNavItem[];
  active: string | null;
  onSelect: (name: string) => void;
};

export function DailyStockCategoryNav({ categories, active, onSelect }: Props) {
  if (categories.length === 0) return null;

  return (
    <nav
      className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100 lg:sticky lg:top-[7.5rem] lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto"
      aria-label="Category navigation"
    >
      <p className="px-2.5 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
        Categories
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {categories.map((cat) => {
          const selected = active === cat.name;
          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => onSelect(cat.name)}
              className={cn(
                'flex min-w-[9.5rem] shrink-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 lg:min-w-0 lg:w-full',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40',
                selected
                  ? 'bg-orange-50 text-[#FF6A00] ring-1 ring-orange-200'
                  : 'text-slate-700 hover:bg-slate-50'
              )}
              aria-current={selected ? 'true' : undefined}
            >
              <span className="truncate text-sm font-semibold">{cat.name}</span>
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                  selected ? 'bg-white text-[#FF6A00]' : 'bg-slate-100 text-slate-500'
                )}
              >
                {cat.total}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
