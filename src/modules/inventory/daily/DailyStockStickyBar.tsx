import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  updated: number;
  total: number;
  unsaved: boolean;
  submitting: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
};

export function DailyStockStickyBar({
  updated,
  total,
  unsaved,
  submitting,
  onSaveDraft,
  onSubmit,
}: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2">
      <div
        className={cn(
          'pointer-events-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_-8px_28px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-3.5'
        )}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm">
          <p className="font-semibold text-slate-800">
            <span className="tabular-nums text-[#FF6A00]">{updated}</span>
            <span className="text-slate-400"> / {total}</span> Products Updated
          </p>
          <p
            className={cn(
              'font-semibold',
              unsaved ? 'text-orange-600' : 'text-emerald-600'
            )}
          >
            {unsaved ? 'Unsaved Changes' : 'All changes saved'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl border-slate-200 font-semibold sm:flex-none sm:min-w-[8.5rem]"
            onClick={onSaveDraft}
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl bg-[#FF6A00] font-semibold text-white hover:bg-[#e85f00] sm:flex-none sm:min-w-[10rem]"
            onClick={onSubmit}
            disabled={submitting}
          >
            <Save className="h-4 w-4" />
            {submitting ? 'Submitting…' : 'Submit Inventory'}
          </Button>
        </div>
      </div>
    </div>
  );
}
