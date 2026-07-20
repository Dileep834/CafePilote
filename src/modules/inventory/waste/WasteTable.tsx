import {
  Check,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import type { WasteLogRow, WasteStatus } from './types';

type Props = {
  rows: WasteLogRow[];
  canApprove: boolean;
  canDelete: boolean;
  onView: (row: WasteLogRow) => void;
  onEdit: (row: WasteLogRow) => void;
  onApprove: (row: WasteLogRow) => void;
  onReject: (row: WasteLogRow) => void;
  onDelete: (row: WasteLogRow) => void;
};

const STATUS_STYLE: Record<WasteStatus, string> = {
  pending: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/15',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15',
  rejected: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15',
};

function StatusBadge({ status }: { status: WasteStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize', STATUS_STYLE[status])}>
      {status}
    </span>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function WasteTable({
  rows,
  canApprove,
  canDelete,
  onView,
  onEdit,
  onApprove,
  onReject,
  onDelete,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3 text-right">Qty</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3 text-right">Cost</th>
              <th className="px-3 py-3 text-right">Total Loss</th>
              <th className="px-3 py-3">Reason</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Logged By</th>
              <th className="px-3 py-3">Approved By</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 text-sm hover:bg-slate-50/80">
                <td className="px-3 py-3 font-medium text-slate-700">
                  {new Date(row.date + 'T00:00:00').toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-3 py-3 text-slate-500">{formatTime(row.createdAt)}</td>
                <td className="px-3 py-3 font-semibold text-slate-900">{row.productName}</td>
                <td className="px-3 py-3 text-slate-600">{row.category}</td>
                <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-800">{row.quantity}</td>
                <td className="px-3 py-3 text-slate-500">{row.unit}</td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-600">{formatCurrency(row.unitCost)}</td>
                <td className="px-3 py-3 text-right tabular-nums font-bold text-[#FF6A00]">
                  {formatCurrency(row.totalLoss)}
                </td>
                <td className="px-3 py-3 text-slate-700">{row.reason}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-3 py-3 text-slate-600">{row.loggedBy || '—'}</td>
                <td className="px-3 py-3 text-slate-600">{row.approvedBy || '—'}</td>
                <td className="px-3 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          aria-label={`Actions for ${row.productName}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5">
                      <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => onView(row)}>
                        <Eye className="h-4 w-4 text-slate-400" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => onEdit(row)}>
                        <Pencil className="h-4 w-4 text-slate-400" /> Edit
                      </DropdownMenuItem>
                      {canApprove && row.status === 'pending' ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 rounded-lg text-emerald-700" onClick={() => onApprove(row)}>
                            <Check className="h-4 w-4" /> Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 rounded-lg text-orange-700" onClick={() => onReject(row)}>
                            <X className="h-4 w-4" /> Reject
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      {canDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 rounded-lg text-red-600" onClick={() => onDelete(row)}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
