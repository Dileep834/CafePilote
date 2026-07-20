import { Download, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ADJUSTMENT_REASONS, type AdjustmentFilters, type AdjustmentStatus, type AdjustmentType } from './types';

type Props = {
  filters: AdjustmentFilters;
  categories: string[];
  employees: string[];
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onChange: (next: Partial<AdjustmentFilters>) => void;
  onReset: () => void;
  onExport: () => void;
};

const selectClass =
  'h-10 rounded-xl border-0 bg-slate-100 px-3 text-base font-medium text-slate-700 outline-none transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 sm:h-11';

export function AdjustmentToolbar({
  filters,
  categories,
  employees,
  filtersOpen,
  onToggleFilters,
  onChange,
  onReset,
  onExport,
}: Props) {
  return (
    <div className="sticky top-0 z-20 -mx-1 space-y-2 rounded-b-xl rounded-t-none border-b border-slate-100 bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)] sm:mx-0 sm:space-y-3 sm:rounded-xl sm:border-0 sm:p-4 sm:shadow-sm sm:ring-1 sm:ring-slate-100">
      <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search product, reason, employee…"
            className="h-10 rounded-xl border-0 bg-slate-100 pl-9 pr-9 text-base shadow-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 sm:h-11 sm:pl-10 sm:pr-10"
            aria-label="Search adjustments"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => onChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2 md:flex">
          <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 sm:h-11 lg:hidden" onClick={onToggleFilters}>
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 sm:h-11" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200 sm:h-11" onClick={onExport}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:flex xl:flex-wrap', filtersOpen ? 'grid' : 'hidden lg:grid xl:flex')}>
        <select className={cn(selectClass, 'w-full xl:min-w-[140px] xl:w-auto')} value={filters.category} onChange={(e) => onChange({ category: e.target.value })} aria-label="Category">
          <option value="all">Category</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className={cn(selectClass, 'w-full xl:min-w-[140px] xl:w-auto')}
          value={filters.adjustmentType}
          onChange={(e) => onChange({ adjustmentType: e.target.value as 'all' | AdjustmentType })}
          aria-label="Adjustment type"
        >
          <option value="all">Adjustment Type</option>
          <option value="increase">Increase</option>
          <option value="decrease">Decrease</option>
        </select>
        <select className={cn(selectClass, 'w-full xl:min-w-[140px] xl:w-auto')} value={filters.reason} onChange={(e) => onChange({ reason: e.target.value })} aria-label="Reason">
          <option value="all">Reason</option>
          {ADJUSTMENT_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          className={cn(selectClass, 'w-full xl:min-w-[140px] xl:w-auto')}
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as 'all' | AdjustmentStatus })}
          aria-label="Status"
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className={cn(selectClass, 'w-full xl:min-w-[140px] xl:w-auto')} value={filters.employee} onChange={(e) => onChange({ employee: e.target.value })} aria-label="Employee">
          <option value="all">Employee</option>
          {employees.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <input type="date" className={cn(selectClass, 'w-full xl:w-auto')} value={filters.dateFrom} onChange={(e) => onChange({ dateFrom: e.target.value })} aria-label="From date" />
        <input type="date" className={cn(selectClass, 'w-full xl:w-auto')} value={filters.dateTo} onChange={(e) => onChange({ dateTo: e.target.value })} aria-label="To date" />
      </div>
    </div>
  );
}
