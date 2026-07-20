import { ArrowDown, ArrowUp, ArrowUpDown, Package } from 'lucide-react';
import { memo, useMemo, useState, useCallback } from 'react';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { InventoryItem } from '../types';
import { ActionMenu, type InventoryRowAction } from './ActionMenu';
import { StatusBadge } from './StatusBadge';
import { StockProgress } from './StockProgress';

type SortKey =
  | 'productName'
  | 'category'
  | 'supplier'
  | 'quantity'
  | 'minStock'
  | 'stockValue'
  | 'status'
  | 'updatedAt';

type Props = {
  items: InventoryItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onAction: (action: InventoryRowAction, item: InventoryItem) => void;
  onReorder: (item: InventoryItem) => void;
  onRowClick?: (item: InventoryItem) => void;
};

function formatUpdated(value: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

function ProductCell({ item, compact }: { item: InventoryItem; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100',
          compact ? 'h-9 w-9' : 'h-11 w-11'
        )}
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Package className={cn('text-slate-400', compact ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            'truncate font-semibold text-slate-900',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          {item.productName}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-slate-400 sm:text-[13px]">
          {item.productCode || 'No SKU'}
          <span className="mx-1 text-slate-300">·</span>
          {item.category}
        </p>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40',
        className
      )}
    >
      {label}
      <Icon className="h-3.5 w-3.5 opacity-60" aria-hidden />
    </button>
  );
}

export const InventoryTable = memo(function InventoryTable({
  items,
  selectedIds,
  onToggle,
  onToggleAll,
  onAction,
  onReorder,
  onRowClick,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('productName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    product: 280,
    available: 160,
  });

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));

  const sorted = useMemo(() => {
    const rows = [...items];
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
    return rows;
  }, [items, sortKey, sortDir]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const startResize = (key: string, startX: number, startW: number) => {
    const onMove = (e: MouseEvent) => {
      const next = Math.max(120, startW + (e.clientX - startX));
      setColWidths((prev) => ({ ...prev, [key]: next }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <>
      {/* Desktop / landscape tablet table */}
      <div className="hidden overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 lg:block">
        <div className="max-h-[min(72vh,780px)] overflow-auto overscroll-contain">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm xl:min-w-[1100px] xl:text-base">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur">
              <tr>
                <th className="sticky left-0 z-30 w-12 bg-slate-50/95 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    aria-label="Select all items"
                    className="h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
                  />
                </th>
                <th
                  className="sticky left-12 z-30 bg-slate-50/95 px-3 py-3.5"
                  style={{ minWidth: colWidths.product, width: colWidths.product }}
                >
                  <div className="relative flex items-center justify-between gap-2 pr-2">
                    <SortHeader
                      label="Product"
                      active={sortKey === 'productName'}
                      dir={sortDir}
                      onClick={() => toggleSort('productName')}
                    />
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="Resize product column"
                      className="absolute -right-1 top-0 h-full w-1 cursor-col-resize rounded bg-transparent hover:bg-slate-300"
                      onMouseDown={(e) => startResize('product', e.clientX, colWidths.product)}
                    />
                  </div>
                </th>
                <th className="px-3 py-3.5">
                  <SortHeader
                    label="Category"
                    active={sortKey === 'category'}
                    dir={sortDir}
                    onClick={() => toggleSort('category')}
                  />
                </th>
                <th className="px-3 py-3.5">
                  <SortHeader
                    label="Supplier"
                    active={sortKey === 'supplier'}
                    dir={sortDir}
                    onClick={() => toggleSort('supplier')}
                  />
                </th>
                <th
                  className="px-3 py-3.5"
                  style={{ minWidth: colWidths.available, width: colWidths.available }}
                >
                  <div className="relative pr-2">
                    <SortHeader
                      label="Available"
                      active={sortKey === 'quantity'}
                      dir={sortDir}
                      onClick={() => toggleSort('quantity')}
                    />
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="Resize available column"
                      className="absolute -right-1 top-0 h-full w-1 cursor-col-resize rounded bg-transparent hover:bg-slate-300"
                      onMouseDown={(e) => startResize('available', e.clientX, colWidths.available)}
                    />
                  </div>
                </th>
                <th className="px-3 py-3.5">
                  <SortHeader
                    label="Minimum"
                    active={sortKey === 'minStock'}
                    dir={sortDir}
                    onClick={() => toggleSort('minStock')}
                  />
                </th>
                <th className="px-3 py-3.5 text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                  Unit
                </th>
                <th className="px-3 py-3.5">
                  <SortHeader
                    label="Stock Value"
                    active={sortKey === 'stockValue'}
                    dir={sortDir}
                    onClick={() => toggleSort('stockValue')}
                  />
                </th>
                <th className="px-3 py-3.5">
                  <SortHeader
                    label="Status"
                    active={sortKey === 'status'}
                    dir={sortDir}
                    onClick={() => toggleSort('status')}
                  />
                </th>
                <th className="px-3 py-3.5">
                  <SortHeader
                    label="Updated"
                    active={sortKey === 'updatedAt'}
                    dir={sortDir}
                    onClick={() => toggleSort('updatedAt')}
                  />
                </th>
                <th className="px-3 py-3.5 text-right text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, index) => {
                const selected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      'cursor-pointer border-t border-slate-100 transition-colors duration-150',
                      index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white',
                      'hover:bg-orange-50/40',
                      selected && 'bg-orange-50/60'
                    )}
                  >
                    <td
                      className={cn(
                        'sticky left-0 z-10 px-4 py-3.5',
                        index % 2 === 1 ? 'bg-slate-50' : 'bg-white',
                        selected && 'bg-orange-50'
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggle(item.id)}
                        aria-label={`Select ${item.productName}`}
                        className="h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
                      />
                    </td>
                    <td
                      className={cn(
                        'sticky left-12 z-10 px-3 py-3.5 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.06)]',
                        index % 2 === 1 ? 'bg-slate-50' : 'bg-white',
                        selected && 'bg-orange-50'
                      )}
                      style={{ minWidth: colWidths.product, width: colWidths.product }}
                    >
                      <ProductCell item={item} />
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">{item.category}</td>
                    <td className="px-3 py-3.5 text-slate-500">{item.supplier}</td>
                    <td className="px-3 py-3.5" style={{ minWidth: colWidths.available }}>
                      <StockProgress item={item} />
                    </td>
                    <td className="px-3 py-3.5 tabular-nums text-slate-600">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="px-3 py-3.5 text-slate-500">{item.unit}</td>
                    <td className="px-3 py-3.5 font-semibold tabular-nums text-slate-800">
                      {item.stockValue > 0 ? formatCurrency(item.stockValue) : '—'}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-3.5 text-slate-500">{formatUpdated(item.updatedAt)}</td>
                    <td className="px-3 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu item={item} onAction={onAction} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phone + portrait tablet cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:hidden">
        {sorted.map((item) => {
          const selected = selectedIds.has(item.id);
          const needsReorder =
            item.status === 'Low' || item.status === 'Critical' || item.status === 'Out of Stock';
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onRowClick?.(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick?.(item);
                }
              }}
              className={cn(
                'rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition-shadow duration-200 hover:shadow-md sm:p-4',
                selected && 'ring-[#FF6A00]/40'
              )}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(item.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${item.productName}`}
                  className="mt-2 h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <ProductCell item={item} compact />
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionMenu item={item} onAction={onAction} />
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} />
                    <span className="text-[12px] text-slate-400">
                      Min {item.minStock} {item.unit}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <StockProgress item={item} compact />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold tabular-nums text-slate-800">
                      {item.stockValue > 0 ? formatCurrency(item.stockValue) : '—'}
                    </span>
                    {needsReorder ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorder(item);
                        }}
                        className="rounded-lg bg-[#FF6A00] px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#e85f00]"
                      >
                        Reorder
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
});
