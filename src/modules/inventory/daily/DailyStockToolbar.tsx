import { Download, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { DailyStockFilters, StatusFilter, StockTypeFilter } from './types';
import { DailyStockAutoSave } from './DailyStockAutoSave';
import type { AutoSaveStatus } from './types';

type OutletOption = { id: string; name: string };

type Props = {
  filters: DailyStockFilters;
  categories: string[];
  suppliers: string[];
  outlets: OutletOption[];
  canSwitchOutlet: boolean;
  filtersOpen: boolean;
  autoSaveStatus: AutoSaveStatus;
  lastSavedAt: string | null;
  typeCounts?: { raw_material: number; ready_product: number };
  onToggleFilters: () => void;
  onChange: (next: Partial<DailyStockFilters>) => void;
  onReset: () => void;
  onExport: () => void;
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All status' },
  { value: 'Healthy', label: 'Healthy' },
  { value: 'Low', label: 'Low' },
  { value: 'Critical', label: 'Critical' },
  { value: 'Out of Stock', label: 'Out of Stock' },
  { value: 'Not Counted', label: 'Not Counted' },
];

const selectClass =
  'h-10 rounded-xl border-0 bg-slate-100 px-3 text-base font-medium text-slate-700 outline-none transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 sm:h-11';

export function DailyStockToolbar({
  filters,
  categories,
  suppliers,
  outlets,
  canSwitchOutlet,
  filtersOpen,
  autoSaveStatus,
  lastSavedAt,
  typeCounts,
  onToggleFilters,
  onChange,
  onReset,
  onExport,
}: Props) {
  const rawCount = typeCounts?.raw_material ?? null;
  const readyCount = typeCounts?.ready_product ?? null;
  return (
    <div className="sticky top-0 z-20 -mx-1 space-y-2 rounded-b-xl rounded-t-none border-b border-slate-100 bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)] sm:mx-0 sm:space-y-3 sm:rounded-xl sm:border-0 sm:p-4 sm:shadow-sm sm:ring-1 sm:ring-slate-100">
      <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search product, SKU, barcode…"
            className="h-10 rounded-xl border-0 bg-slate-100 pl-9 pr-9 text-base shadow-none transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 sm:h-11 sm:pl-10 sm:pr-10"
            aria-label="Search products"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => onChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <DailyStockAutoSave status={autoSaveStatus} lastSavedAt={lastSavedAt} />
          <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 sm:h-11 lg:hidden"
              onClick={onToggleFilters}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 sm:h-11"
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 sm:h-11"
              onClick={onExport}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:flex xl:flex-wrap',
          filtersOpen ? 'grid' : 'hidden lg:grid xl:flex'
        )}
      >
        <select
          className={cn(selectClass, 'w-full xl:min-w-[140px] xl:w-auto')}
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value })}
          aria-label="Filter by category"
        >
          <option value="all">Category</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className={cn(selectClass, 'w-full xl:min-w-[140px] xl:w-auto')}
          value={filters.supplier}
          onChange={(e) => onChange({ supplier: e.target.value })}
          aria-label="Filter by supplier"
        >
          <option value="all">Supplier</option>
          {suppliers.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className={cn(selectClass, 'w-full xl:min-w-[140px] xl:w-auto')}
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as StatusFilter })}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className={cn(selectClass, 'w-full xl:min-w-[160px] xl:w-auto')}
          value={filters.stockType}
          onChange={(e) => onChange({ stockType: e.target.value as StockTypeFilter })}
          aria-label="Filter by product type"
        >
          <option value="all">All types</option>
          <option value="raw_material">
            Raw material{rawCount != null ? ` (${rawCount})` : ''}
          </option>
          <option value="ready_product">
            Ready product{readyCount != null ? ` (${readyCount})` : ''}
          </option>
        </select>

        <input
          type="date"
          className={cn(selectClass, 'w-full sm:col-span-2 md:col-span-1 xl:w-auto')}
          value={filters.dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value })}
          aria-label="Filter by date"
        />

        {canSwitchOutlet ? (
          <select
            className={cn(selectClass, 'w-full xl:min-w-[160px] xl:w-auto')}
            value={filters.outletId}
            onChange={(e) => onChange({ outletId: e.target.value })}
            aria-label="Select outlet"
          >
            <option value="">Outlet</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}
