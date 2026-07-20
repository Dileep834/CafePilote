import { Download, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProductFilters, ProductGroupBy, ProductSort } from '../types';

type Props = {
  filters: ProductFilters;
  categories: string[];
  brands: string[];
  suppliers: string[];
  units: string[];
  types: string[];
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onChange: (next: Partial<ProductFilters>) => void;
  onReset: () => void;
  onExport: () => void;
};

const selectClass =
  'h-10 w-full rounded-xl border-0 bg-slate-100 px-3 text-sm font-medium text-slate-700 outline-none transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 sm:h-11';

export function ProductToolbar({
  filters,
  categories,
  brands,
  suppliers,
  units,
  types,
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
            placeholder="Search product, SKU…"
            className="h-10 rounded-xl border-0 bg-slate-100 pl-9 pr-9 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 sm:h-11"
            aria-label="Search products"
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

      <div className={filtersOpen ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8' : 'hidden lg:grid gap-2 lg:grid-cols-4 xl:grid-cols-8'}>
        <label className="sr-only" htmlFor="product-category">
          Category
        </label>
        <select
          id="product-category"
          className={selectClass}
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value })}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          aria-label="Brand"
          className={selectClass}
          value={filters.brand}
          onChange={(e) => onChange({ brand: e.target.value })}
        >
          <option value="all">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          aria-label="Supplier"
          className={selectClass}
          value={filters.supplier}
          onChange={(e) => onChange({ supplier: e.target.value })}
        >
          <option value="all">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          aria-label="Status"
          className={selectClass}
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as ProductFilters['status'] })}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="out_of_stock">Out of stock</option>
        </select>

        <select
          aria-label="Type"
          className={selectClass}
          value={filters.type}
          onChange={(e) => onChange({ type: e.target.value })}
        >
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t === 'raw_material' ? 'Raw material' : t === 'ready_product' ? 'Ready product' : t.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <select
          aria-label="Unit"
          className={selectClass}
          value={filters.unit}
          onChange={(e) => onChange({ unit: e.target.value })}
        >
          <option value="all">All units</option>
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort"
          className={selectClass}
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value as ProductSort })}
        >
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="updated_desc">Recently updated</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="stock_asc">Stock ↑</option>
        </select>

        <select
          aria-label="Group by"
          className={selectClass}
          value={filters.groupBy}
          onChange={(e) => onChange({ groupBy: e.target.value as ProductGroupBy })}
        >
          <option value="flat">Flat table</option>
          <option value="category">Group by category</option>
          <option value="brand">Group by brand</option>
        </select>
      </div>
    </div>
  );
}
