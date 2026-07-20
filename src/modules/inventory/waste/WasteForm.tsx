import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { WASTE_REASONS, type WasteProductOption, type WasteReason } from './types';

export type WasteFormState = {
  productId: string;
  quantity: string;
  reason: WasteReason | '';
  notes: string;
  imageFile: File | null;
  imagePreview: string;
};

type Props = {
  form: WasteFormState;
  products: WasteProductOption[];
  selected: WasteProductOption | null;
  submitting: boolean;
  canSubmit: boolean;
  onChange: (next: Partial<WasteFormState>) => void;
  onSubmit: () => void;
  onClearImage: () => void;
};

const fieldClass =
  'h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30';

export function WasteForm({
  form,
  products,
  selected,
  submitting,
  canSubmit,
  onChange,
  onSubmit,
  onClearImage,
}: Props) {
  const qty = parseFloat(form.quantity) || 0;
  const exceeds = selected ? qty > selected.currentStock : false;
  const estimatedLoss = selected ? qty * selected.purchasePrice : 0;

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Log Waste</h2>
          <p className="text-sm text-slate-500">Record spoilage, damage, or expired stock for this branch.</p>
        </div>
        {selected ? (
          <p className="text-sm font-semibold text-slate-600">
            Est. loss{' '}
            <span className="text-[#FF6A00]">
              {estimatedLoss.toLocaleString(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
            </span>
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="block md:col-span-2 xl:col-span-1">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Product</span>
          <select
            className={fieldClass}
            value={form.productId}
            onChange={(e) => onChange({ productId: e.target.value })}
            aria-label="Product"
          >
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Current Stock</span>
          <Input
            readOnly
            value={selected ? String(selected.currentStock) : '—'}
            className={cn(fieldClass, 'cursor-default text-slate-500')}
            aria-label="Current stock"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Unit</span>
          <Input
            readOnly
            value={selected?.unit || '—'}
            className={cn(fieldClass, 'cursor-default text-slate-500')}
            aria-label="Unit"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Quantity</span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={form.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            className={cn(fieldClass, exceeds && 'ring-2 ring-red-300')}
            aria-label="Waste quantity"
            aria-invalid={exceeds}
          />
          {exceeds ? (
            <span className="mt-1 block text-xs font-semibold text-red-600">
              Cannot exceed available stock ({selected?.currentStock}).
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Reason</span>
          <select
            className={fieldClass}
            value={form.reason}
            onChange={(e) => onChange({ reason: e.target.value as WasteReason | '' })}
            aria-label="Waste reason"
          >
            <option value="">Select reason…</option>
            {WASTE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
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
            aria-label="Notes"
          />
        </label>

        <div className="md:col-span-2 xl:col-span-3">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Photo (optional)
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
              <ImagePlus className="h-4 w-4" />
              Attach image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (!file) {
                    onChange({ imageFile: null, imagePreview: '' });
                    return;
                  }
                  const preview = URL.createObjectURL(file);
                  onChange({ imageFile: file, imagePreview: preview });
                }}
              />
            </label>
            {form.imagePreview ? (
              <div className="flex items-center gap-2">
                <img
                  src={form.imagePreview}
                  alt="Waste attachment preview"
                  className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200"
                />
                <button
                  type="button"
                  onClick={onClearImage}
                  className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          disabled={!canSubmit || submitting || exceeds}
          onClick={onSubmit}
          className="h-11 rounded-xl bg-[#FF6A00] px-6 font-semibold text-white hover:bg-[#e85f00]"
        >
          {submitting ? 'Saving…' : 'Save Waste Entry'}
        </Button>
      </div>
    </section>
  );
}
