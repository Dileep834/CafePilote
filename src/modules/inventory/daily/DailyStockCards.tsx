import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { DailyStockRow, EditableField } from './types';

type Props = {
  rows: DailyStockRow[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onChangeField: (id: string, field: EditableField, value: number) => void;
};

const FIELDS: { id: EditableField; label: string }[] = [
  { id: 'purchase', label: 'Purchase' },
  { id: 'consumption', label: 'Consumed' },
  { id: 'waste', label: 'Waste' },
];

export const DailyStockCards = memo(function DailyStockCards({
  rows,
  selectedIds,
  onToggleSelect,
  onChangeField,
}: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <article
          key={row.id}
          className={cn(
            'rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100',
            row.editState === 'edited' && 'bg-orange-50/80 ring-orange-100',
            row.editState === 'saved' && 'bg-emerald-50/50 ring-emerald-100',
            selectedIds.has(row.id) && 'ring-sky-300'
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">{row.productName}</p>
              <p className="text-xs text-slate-400">
                {row.categoryName} · {row.unit}
                {row.productCode ? ` · ${row.productCode}` : ''}
              </p>
            </div>
            <input
              type="checkbox"
              checked={selectedIds.has(row.id)}
              onChange={() => onToggleSelect(row.id)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
              aria-label={`Select ${row.productName}`}
            />
          </div>

          <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium text-slate-500">Opening</span>
            <span className="font-bold tabular-nums text-slate-800">{row.openingStock}</span>
          </div>

          <div className="space-y-2">
            {FIELDS.map((field) => (
              <label key={field.id} className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {field.label}
                </span>
                <input
                  key={`${row.id}-${field.id}-${row[field.id]}`}
                  type="number"
                  inputMode="decimal"
                  defaultValue={row[field.id]}
                  data-stock-field={field.id === 'purchase' ? 'purchase' : undefined}
                  className="h-11 w-full rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 text-center text-base font-semibold tabular-nums text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30"
                  aria-label={`${row.productName} ${field.label}`}
                  onBlur={(e) => {
                    const num = parseFloat(e.target.value) || 0;
                    if (num !== row[field.id]) onChangeField(row.id, field.id, num);
                  }}
                />
              </label>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm font-semibold text-slate-500">Closing</span>
            <span className="text-lg font-bold tabular-nums text-[#FF6A00]">{row.closingStock}</span>
          </div>
        </article>
      ))}
    </div>
  );
});
