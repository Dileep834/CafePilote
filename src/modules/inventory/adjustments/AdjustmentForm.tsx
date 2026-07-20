import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { signedAdjustment } from './lib';
import {
  ADJUSTMENT_REASONS,
  type AdjustmentProductOption,
  type AdjustmentReason,
  type AdjustmentType,
} from './types';

export type AdjustmentFormState = {
  productId: string;
  adjustmentType: AdjustmentType;
  quantity: string;
  reason: AdjustmentReason | '';
  notes: string;
};

type Props = {
  form: AdjustmentFormState;
  products: AdjustmentProductOption[];
  selected: AdjustmentProductOption | null;
  submitting: boolean;
  canSubmit: boolean;
  onChange: (next: Partial<AdjustmentFormState>) => void;
  onSubmit: () => void;
};

const fieldClass =
  'h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30';

export function AdjustmentForm({
  form,
  products,
  selected,
  submitting,
  canSubmit,
  onChange,
  onSubmit,
}: Props) {
  const qty = parseFloat(form.quantity) || 0;
  const signed = form.adjustmentType && qty ? signedAdjustment(form.adjustmentType, qty) : 0;
  const preview = selected ? selected.currentStock + signed : null;
  const wouldGoNegative = preview != null && preview < 0;

  return (
    <section id="adjustment-form" className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">New Adjustment</h2>
        <p className="text-sm text-slate-500">Correct stock after counts, transfers, damages, or manual fixes.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="block md:col-span-2 xl:col-span-1">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Product</span>
          <select className={fieldClass} value={form.productId} onChange={(e) => onChange({ productId: e.target.value })} aria-label="Product">
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Current Stock</span>
          <Input readOnly value={selected ? String(selected.currentStock) : '—'} className={cn(fieldClass, 'cursor-default text-slate-500')} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Unit</span>
          <Input readOnly value={selected?.unit || '—'} className={cn(fieldClass, 'cursor-default text-slate-500')} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Adjustment Type</span>
          <select
            className={fieldClass}
            value={form.adjustmentType}
            onChange={(e) => onChange({ adjustmentType: e.target.value as AdjustmentType })}
            aria-label="Adjustment type"
          >
            <option value="increase">Increase (+)</option>
            <option value="decrease">Decrease (−)</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Adjustment Quantity</span>
          <Input
            type="number"
            min={0}
            step="any"
            value={form.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            className={cn(fieldClass, wouldGoNegative && 'ring-2 ring-red-300')}
            aria-invalid={wouldGoNegative}
          />
          {wouldGoNegative ? (
            <span className="mt-1 block text-xs font-semibold text-red-600">
              New stock would be negative. Reduce the quantity.
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Reason</span>
          <select
            className={fieldClass}
            value={form.reason}
            onChange={(e) => onChange({ reason: e.target.value as AdjustmentReason | '' })}
            aria-label="Reason"
          >
            <option value="">Select reason…</option>
            {ADJUSTMENT_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={2}
            placeholder="Optional details…"
            className="w-full rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-base font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30"
          />
        </label>

        <div className="rounded-xl bg-slate-50 px-4 py-3 md:col-span-2 xl:col-span-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Preview New Stock</p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', wouldGoNegative ? 'text-red-600' : 'text-slate-900')}>
            {preview == null ? '—' : preview}
            {selected ? <span className="ml-1 text-sm font-semibold text-slate-400">{selected.unit}</span> : null}
          </p>
          {selected && qty > 0 ? (
            <p className="mt-1 text-sm font-medium text-slate-500">
              {selected.currentStock} {signed >= 0 ? '+' : '−'} {Math.abs(signed)} → {preview}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          disabled={!canSubmit || submitting || wouldGoNegative}
          onClick={onSubmit}
          className="h-11 rounded-xl bg-[#FF6A00] px-6 font-semibold text-white hover:bg-[#e85f00]"
        >
          {submitting ? 'Saving…' : 'Submit Adjustment'}
        </Button>
      </div>
    </section>
  );
}
