import { AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/format';
import type { LowStockSuggestion } from '../lib/poHelpers';

type Props = {
  suggestions: LowStockSuggestion[];
  onGenerate: () => void;
  onCreateManual: () => void;
};

export function POSuggestions({ suggestions, onGenerate, onCreateManual }: Props) {
  if (suggestions.length === 0) {
    return (
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Smart Purchase Suggestions</h2>
            <p className="text-sm text-slate-500">Inventory looks healthy — no low-stock items need ordering right now.</p>
          </div>
          <Button type="button" variant="outline" className="rounded-xl" onClick={onCreateManual}>
            Create Purchase Order
          </Button>
        </div>
      </section>
    );
  }

  const est = suggestions.reduce((sum, s) => sum + s.reorderQty * s.unitPrice, 0);

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Sparkles className="h-5 w-5 text-[#FF6A00]" />
            Smart Purchase Suggestions
          </h2>
          <p className="text-sm text-slate-500">
            {suggestions.length} low-stock item{suggestions.length === 1 ? '' : 's'} · Est.{' '}
            {formatCurrency(est)}
          </p>
        </div>
        <Button type="button" className="rounded-xl bg-[#FF6A00] hover:bg-[#e85f00]" onClick={onGenerate}>
          Generate Suggested PO
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {suggestions.slice(0, 6).map((s) => (
          <div key={s.productId} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#FF6A00]">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{s.productName}</p>
              <p className="text-xs font-medium text-slate-500">
                {s.quantity} {s.unit} on hand · Min {s.minStock} · Order {s.reorderQty}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
