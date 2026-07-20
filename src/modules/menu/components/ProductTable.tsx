import React from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { productInitials } from '../lib/categoryIcon';
import { formatShortDate } from '../lib/fetchCatalog';
import type { CatalogProduct } from '../types';
import { CountBadge, StatusBadge, resolveProductStatus } from './StatusBadge';
import { ProductActionMenu, type ProductRowAction } from './ProductActionMenu';

type Props = {
  rows: CatalogProduct[];
  selectedIds: Set<string>;
  groupBy: 'flat' | 'category' | 'brand';
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onRowClick: (product: CatalogProduct) => void;
  onAction: (action: ProductRowAction, product: CatalogProduct) => void;
};

function isLowStock(p: CatalogProduct) {
  if (p.stockQty === null) return false;
  return p.stockQty <= p.minStock;
}

function isOutOfStock(p: CatalogProduct) {
  return p.stockQty !== null && p.stockQty <= 0;
}

export function ProductTable({
  rows,
  selectedIds,
  groupBy,
  onToggle,
  onToggleAll,
  onRowClick,
  onAction,
}: Props) {
  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const groups =
    groupBy === 'flat'
      ? [{ key: 'all', label: null as string | null, items: rows }]
      : Object.entries(
          rows.reduce(
            (acc, p) => {
              const key = groupBy === 'category' ? p.categoryName : p.brand || '—';
              if (!acc[key]) acc[key] = [];
              acc[key].push(p);
              return acc;
            },
            {} as Record<string, CatalogProduct[]>
          )
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, items]) => ({ key, label: key, items }));

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <th className="w-12 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleAll(allIds, e.target.checked)}
                    aria-label="Select all products"
                    className="h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]/40"
                  />
                </th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Brand</th>
                <th className="px-3 py-3">Unit</th>
                <th className="px-3 py-3 text-right">Purchase</th>
                <th className="px-3 py-3 text-right">Selling</th>
                <th className="px-3 py-3 text-right">Stock</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Updated</th>
                <th className="w-14 px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <React.Fragment key={group.key}>
                  {group.label ? (
                    <tr className="bg-slate-50/80">
                      <td colSpan={12} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                        {group.label}
                        <span className="ml-2 font-semibold normal-case text-slate-400">
                          {group.items.length} items
                        </span>
                      </td>
                    </tr>
                  ) : null}
                  {group.items.map((p) => {
                    const status = resolveProductStatus(p);
                    const low = isLowStock(p);
                    const out = isOutOfStock(p);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => onRowClick(p)}
                        className={cn(
                          'group h-14 cursor-pointer border-b border-slate-50 transition-colors duration-150 hover:bg-orange-50/40',
                          selectedIds.has(p.id) && 'bg-orange-50/60'
                        )}
                      >
                        <td className="px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => onToggle(p.id)}
                            aria-label={`Select ${p.name}`}
                            className="h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]/40"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                productInitials(p.name)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{p.name}</p>
                              <p className="truncate text-[11px] font-medium text-slate-400">{p.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 font-mono text-xs text-slate-500">{p.code}</td>
                        <td className="px-3">
                          <CountBadge value={p.categoryName} />
                        </td>
                        <td className="px-3 text-slate-600">{p.brand}</td>
                        <td className="px-3">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                            {p.unit}
                          </span>
                        </td>
                        <td className="px-3 text-right tabular-nums font-medium text-slate-700">
                          {formatCurrency(p.purchasePrice)}
                        </td>
                        <td className="px-3 text-right tabular-nums font-semibold text-slate-900">
                          {formatCurrency(p.sellingPrice)}
                        </td>
                        <td className="px-3 text-right">
                          {p.stockQty === null ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <span
                              className={cn(
                                'font-bold tabular-nums',
                                out ? 'text-rose-600' : low ? 'text-amber-600' : 'text-slate-800'
                              )}
                            >
                              {p.stockQty}
                              {out ? (
                                <span className="ml-1 text-[10px] font-bold uppercase">Out</span>
                              ) : low ? (
                                <span className="ml-1 text-[10px] font-bold uppercase">Low</span>
                              ) : null}
                            </span>
                          )}
                        </td>
                        <td className="px-3">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-3 text-xs text-slate-500">{formatShortDate(p.updatedAt)}</td>
                        <td className="px-3" onClick={(e) => e.stopPropagation()}>
                          <ProductActionMenu product={p} onAction={onAction} />
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((p) => {
          const status = resolveProductStatus(p);
          const low = isLowStock(p);
          const out = isOutOfStock(p);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onRowClick(p)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 transition duration-150 active:scale-[0.99]',
                selectedIds.has(p.id) && 'ring-[#FF6A00]/40 bg-orange-50/50'
              )}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(p.id)}
                onChange={() => onToggle(p.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${p.name}`}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">
                {productInitials(p.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{p.name}</p>
                    <p className="text-[11px] text-slate-400">{p.code}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ProductActionMenu product={p} onAction={onAction} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <CountBadge value={p.categoryName} />
                  <StatusBadge status={status} />
                  <span className="text-xs font-bold tabular-nums text-slate-800">
                    {formatCurrency(p.sellingPrice)}
                  </span>
                  {p.stockQty !== null ? (
                    <span
                      className={cn(
                        'text-[11px] font-bold',
                        out ? 'text-rose-600' : low ? 'text-amber-600' : 'text-slate-500'
                      )}
                    >
                      Stock {p.stockQty}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
        {rows.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-10 text-center ring-1 ring-slate-100">
            <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No matching products</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
