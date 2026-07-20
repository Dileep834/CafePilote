import { memo, useCallback, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DailyStockRow, EditableField } from './types';

const FIELDS: EditableField[] = ['purchase', 'consumption', 'waste'];

type CategoryGroup = {
  name: string;
  items: DailyStockRow[];
  total: number;
  updated: number;
  pending: number;
};

type Props = {
  groups: CategoryGroup[];
  selectedIds: Set<string>;
  collapsed: Set<string>;
  compact?: boolean;
  onToggleCollapse: (name: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectCategory: (ids: string[], selected: boolean) => void;
  onChangeField: (id: string, field: EditableField, value: number) => void;
  registerCategoryEl: (name: string, el: HTMLElement | null) => void;
};

function cellKey(rowId: string, field: EditableField) {
  return `${rowId}:${field}`;
}

function focusCell(rowId: string, field: EditableField) {
  const el = document.querySelector<HTMLInputElement>(
    `input[data-stock-cell="${cellKey(rowId, field)}"]`
  );
  if (el) {
    el.focus();
    el.select();
  }
}

function findNeighbor(
  flat: { id: string }[],
  rowId: string,
  field: EditableField,
  dir: 'nextField' | 'prevField' | 'nextRow' | 'prevRow'
): { id: string; field: EditableField } | null {
  const rowIdx = flat.findIndex((r) => r.id === rowId);
  if (rowIdx < 0) return null;
  const fieldIdx = FIELDS.indexOf(field);

  if (dir === 'nextField') {
    if (fieldIdx < FIELDS.length - 1) return { id: rowId, field: FIELDS[fieldIdx + 1] };
    if (rowIdx < flat.length - 1) return { id: flat[rowIdx + 1].id, field: FIELDS[0] };
    return null;
  }
  if (dir === 'prevField') {
    if (fieldIdx > 0) return { id: rowId, field: FIELDS[fieldIdx - 1] };
    if (rowIdx > 0) return { id: flat[rowIdx - 1].id, field: FIELDS[FIELDS.length - 1] };
    return null;
  }
  if (dir === 'nextRow') {
    if (rowIdx < flat.length - 1) return { id: flat[rowIdx + 1].id, field };
    return null;
  }
  if (dir === 'prevRow') {
    if (rowIdx > 0) return { id: flat[rowIdx - 1].id, field };
    return null;
  }
  return null;
}

const EditBadge = memo(function EditBadge({ state }: { state: DailyStockRow['editState'] }) {
  if (state === 'edited') {
    return (
      <span className="inline-flex rounded-md bg-orange-100 px-1.5 py-0.5 text-[11px] font-bold text-orange-700">
        Edited
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
        Saved
      </span>
    );
  }
  return null;
});

const StockRow = memo(function StockRow({
  row,
  selected,
  compact,
  flatIds,
  onToggleSelect,
  onChangeField,
}: {
  row: DailyStockRow;
  selected: boolean;
  compact?: boolean;
  flatIds: { id: string }[];
  onToggleSelect: (id: string) => void;
  onChangeField: (id: string, field: EditableField, value: number) => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, field: EditableField) => {
      const move = (dir: 'nextField' | 'prevField' | 'nextRow' | 'prevRow') => {
        e.preventDefault();
        const next = findNeighbor(flatIds, row.id, field, dir);
        if (next) focusCell(next.id, next.field);
      };

      if (e.key === 'Enter') {
        move('nextField');
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        move(e.shiftKey ? 'prevField' : 'nextRow');
        return;
      }
      if (e.key === 'ArrowDown') {
        move('nextRow');
        return;
      }
      if (e.key === 'ArrowUp') {
        move('prevRow');
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.currentTarget.value = String(row[field]);
        e.currentTarget.blur();
      }
    },
    [flatIds, row]
  );

  const inputClass = cn(
    'w-full min-w-[4.5rem] rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2 py-1.5 text-center text-base font-medium text-slate-800 tabular-nums outline-none',
    'focus-visible:border-[#FF6A00] focus-visible:ring-2 focus-visible:ring-[#FF6A00]/25',
    compact ? 'h-9 text-sm' : 'h-10'
  );

  return (
    <tr
      className={cn(
        'border-b border-slate-100 transition-colors',
        row.editState === 'edited' && 'bg-orange-50/70',
        row.editState === 'saved' && 'bg-emerald-50/40',
        selected && 'bg-sky-50/80',
        !selected && row.editState === 'clean' && 'bg-white hover:bg-slate-50/80'
      )}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 52px' }}
    >
      <td className={cn('sticky left-0 z-[1] bg-inherit px-3', compact ? 'py-1.5' : 'py-2')}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(row.id)}
          className="h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
          aria-label={`Select ${row.productName}`}
        />
      </td>
      <td className={cn('sticky left-10 z-[1] bg-inherit px-3', compact ? 'py-1.5' : 'py-2')}>
        <div className="flex min-w-[10rem] items-start gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">{row.productName}</p>
            <p className="truncate text-xs text-slate-400">
              {row.unit}
              {row.productCode ? ` · ${row.productCode}` : ''}
            </p>
          </div>
          <EditBadge state={row.editState} />
        </div>
      </td>
      <td className={cn('px-3 text-right text-base tabular-nums text-slate-700', compact ? 'py-1.5' : 'py-2')}>
        {row.openingStock}
      </td>
      {FIELDS.map((field) => (
        <td key={field} className={cn('px-2', compact ? 'py-1.5' : 'py-2')}>
          <input
            key={`${row.id}-${field}-${row[field]}`}
            type="number"
            inputMode="decimal"
            className={inputClass}
            defaultValue={row[field]}
            data-stock-cell={cellKey(row.id, field)}
            data-stock-field={field}
            aria-label={`${row.productName} ${field}`}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => {
              const num = parseFloat(e.target.value) || 0;
              if (num !== row[field]) onChangeField(row.id, field, num);
              e.target.value = String(num === row[field] ? row[field] : num);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const num = parseFloat(e.currentTarget.value) || 0;
                if (num !== row[field]) onChangeField(row.id, field, num);
              }
              handleKeyDown(e, field);
            }}
          />
        </td>
      ))}
      <td
        className={cn(
          'px-3 text-right text-base font-bold tabular-nums text-[#FF6A00]',
          compact ? 'py-1.5' : 'py-2'
        )}
      >
        {row.closingStock}
      </td>
    </tr>
  );
});

export function DailyStockTable({
  groups,
  selectedIds,
  collapsed,
  compact,
  onToggleCollapse,
  onToggleSelect,
  onToggleSelectCategory,
  onChangeField,
  registerCategoryEl,
}: Props) {
  const flatIds = groups.flatMap((g) => (collapsed.has(g.name) ? [] : g.items.map((i) => ({ id: i.id }))));

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const open = !collapsed.has(group.name);
        const allSelected = group.items.length > 0 && group.items.every((i) => selectedIds.has(i.id));
        const pct = group.total > 0 ? Math.round((group.updated / group.total) * 100) : 0;

        return (
          <section
            key={group.name}
            ref={(el) => registerCategoryEl(group.name, el)}
            data-category={group.name}
            className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex flex-col gap-3 border-b border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40"
                onClick={() => onToggleCollapse(group.name)}
                aria-expanded={open}
              >
                {open ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">{group.name}</p>
                  <p className="text-xs font-medium text-slate-500">
                    {group.total} Products · {group.updated} Updated · {group.pending} Pending
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-3 pl-7 sm:pl-0">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-32">
                  <div
                    className={cn('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : 'bg-[#FF6A00]')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) =>
                      onToggleSelectCategory(
                        group.items.map((i) => i.id),
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
                  />
                  Select
                </label>
              </div>
            </div>

            {open ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                      <th className="sticky left-0 z-[2] bg-slate-50 px-3 py-2.5 w-10" />
                      <th className="sticky left-10 z-[2] bg-slate-50 px-3 py-2.5">Product</th>
                      <th className="px-3 py-2.5 text-right">Opening</th>
                      <th className="px-2 py-2.5 text-center text-emerald-700">Purchase</th>
                      <th className="px-2 py-2.5 text-center text-emerald-700">Consumed</th>
                      <th className="px-2 py-2.5 text-center text-emerald-700">Waste</th>
                      <th className="px-3 py-2.5 text-right">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((row) => (
                      <StockRow
                        key={row.id}
                        row={row}
                        selected={selectedIds.has(row.id)}
                        compact={compact}
                        flatIds={flatIds}
                        onToggleSelect={onToggleSelect}
                        onChangeField={onChangeField}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
