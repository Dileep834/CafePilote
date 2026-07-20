import { Download, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CategoryFilters } from '../types';

type Props = {
  filters: CategoryFilters;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onChange: (next: Partial<CategoryFilters>) => void;
  onReset: () => void;
  onExport: () => void;
};

const selectClass =
  'h-10 w-full rounded-xl border-0 bg-slate-100 px-3 text-sm font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 sm:h-11';

export function CategoryToolbar({
  filters,
  filtersOpen,
  onToggleFilters,
  onChange,
  onReset,
  onExport,
}: Props) {
  return (
    <div className="sticky top-0 z-20 -mx-1 space-y-2 border-b border-slate-100 bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)] sm:mx-0 sm:space-y-3 sm:rounded-xl sm:border-0 sm:p-4 sm:shadow-sm sm:ring-1 sm:ring-slate-100">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search categories…"
            className="h-10 rounded-xl border-0 bg-slate-100 pl-9 pr-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 sm:h-11"
            aria-label="Search categories"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => onChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200"
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

      <div className={filtersOpen ? 'grid gap-2 sm:grid-cols-3' : 'hidden lg:grid gap-2 lg:grid-cols-3'}>
        <select
          aria-label="Status"
          className={selectClass}
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as CategoryFilters['status'] })}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="hidden">Hidden</option>
        </select>
        <select
          aria-label="Products count"
          className={selectClass}
          value={filters.productCount}
          onChange={(e) => onChange({ productCount: e.target.value as CategoryFilters['productCount'] })}
        >
          <option value="all">Any product count</option>
          <option value="has_products">Has products</option>
          <option value="empty">Empty categories</option>
        </select>
        <select
          aria-label="Sort"
          className={selectClass}
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value as CategoryFilters['sort'] })}
        >
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="products_desc">Most products</option>
          <option value="updated_desc">Recently updated</option>
        </select>
      </div>
    </div>
  );
}
