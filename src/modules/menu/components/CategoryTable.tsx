import { FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { categoryIcon } from '../lib/categoryIcon';
import { formatShortDate } from '../lib/fetchCatalog';
import type { CatalogCategory } from '../types';
import { CountBadge, StatusBadge, resolveCategoryStatus } from './StatusBadge';
import { CategoryActionMenu, type CategoryRowAction } from './CategoryActionMenu';

type Props = {
  rows: CatalogCategory[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onRowClick: (category: CatalogCategory) => void;
  onAction: (action: CategoryRowAction, category: CatalogCategory) => void;
};

export function CategoryTable({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  onRowClick,
  onAction,
}: Props) {
  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="bg-slate-50/95">
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <th className="w-12 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleAll(allIds, e.target.checked)}
                    aria-label="Select all categories"
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Products</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Updated</th>
                <th className="w-14 px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const Icon = categoryIcon(c.name);
                const status = resolveCategoryStatus(c);
                return (
                  <tr
                    key={c.id}
                    onClick={() => onRowClick(c)}
                    className={cn(
                      'h-14 cursor-pointer border-b border-slate-50 transition-colors duration-150 hover:bg-orange-50/40',
                      selectedIds.has(c.id) && 'bg-orange-50/60'
                    )}
                  >
                    <td className="px-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => onToggle(c.id)}
                        aria-label={`Select ${c.name}`}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00] ring-1 ring-orange-100">
                          <Icon className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{c.name}</p>
                          {c.description ? (
                            <p className="truncate text-[11px] text-slate-400">{c.description}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      <CountBadge value={c.productCount} />
                    </td>
                    <td className="px-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-3 text-xs text-slate-500">{formatShortDate(c.createdAt)}</td>
                    <td className="px-3 text-xs text-slate-500">{formatShortDate(c.updatedAt)}</td>
                    <td className="px-3" onClick={(e) => e.stopPropagation()}>
                      <CategoryActionMenu category={c} onAction={onAction} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {rows.map((c) => {
          const Icon = categoryIcon(c.name);
          const status = resolveCategoryStatus(c);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onRowClick(c)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[0.99]',
                selectedIds.has(c.id) && 'bg-orange-50/50 ring-[#FF6A00]/40'
              )}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(c.id)}
                onChange={() => onToggle(c.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 h-4 w-4 rounded border-slate-300"
                aria-label={`Select ${c.name}`}
              />
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{c.name}</p>
                    {c.description ? <p className="text-[11px] text-slate-400">{c.description}</p> : null}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <CategoryActionMenu category={c} onAction={onAction} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <CountBadge value={`${c.productCount} products`} />
                  <StatusBadge status={status} />
                </div>
              </div>
            </button>
          );
        })}
        {rows.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-10 text-center ring-1 ring-slate-100">
            <FolderOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No matching categories</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
