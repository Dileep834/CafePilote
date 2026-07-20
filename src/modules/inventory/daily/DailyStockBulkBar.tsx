import { CheckCheck, Eraser, FileDown, Printer, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  count: number;
  onMarkCompleted: () => void;
  onClearValues: () => void;
  onExport: () => void;
  onPrint: () => void;
  onBulkUpdate: () => void;
  onClearSelection: () => void;
};

export function DailyStockBulkBar({
  count,
  onMarkCompleted,
  onClearValues,
  onExport,
  onPrint,
  onBulkUpdate,
  onClearSelection,
}: Props) {
  if (count === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2.5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-sm font-semibold">
        <span className="tabular-nums text-[#FF6A00]">{count}</span> selected
        <button
          type="button"
          onClick={onClearSelection}
          className="ml-3 text-slate-300 underline-offset-2 hover:text-white hover:underline"
        >
          Clear
        </button>
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 rounded-lg bg-white/10 text-white hover:bg-white/20"
          onClick={onMarkCompleted}
        >
          <CheckCheck className="h-4 w-4" />
          Mark Completed
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 rounded-lg bg-white/10 text-white hover:bg-white/20"
          onClick={onClearValues}
        >
          <Eraser className="h-4 w-4" />
          Clear Values
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 rounded-lg bg-white/10 text-white hover:bg-white/20"
          onClick={onBulkUpdate}
        >
          <Wand2 className="h-4 w-4" />
          Bulk Update
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 rounded-lg bg-white/10 text-white hover:bg-white/20"
          onClick={onExport}
        >
          <FileDown className="h-4 w-4" />
          Export
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 rounded-lg bg-white/10 text-white hover:bg-white/20"
          onClick={onPrint}
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
