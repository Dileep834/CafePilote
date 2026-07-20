import {
  Check,
  Eye,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Printer,
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
import { isOverdue } from '../lib/poHelpers';
import type { PurchaseOrder } from '../store/usePurchaseStore';
import { POTimeline } from './POTimeline';

type Props = {
  orders: PurchaseOrder[];
  onView: (po: PurchaseOrder) => void;
  onEdit: (po: PurchaseOrder) => void;
  onApprove: (po: PurchaseOrder) => void;
  onCancel: (po: PurchaseOrder) => void;
  onReceive: (po: PurchaseOrder) => void;
  onPrint: (po: PurchaseOrder) => void;
};

const STATUS_STYLE: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-400/20',
  Pending: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/15',
  Received: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15',
  Cancelled: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15',
};

export function POTable({ orders, onView, onEdit, onApprove, onCancel, onReceive, onPrint }: Props) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
              <th className="px-3 py-3">PO Number</th>
              <th className="px-3 py-3">Supplier</th>
              <th className="px-3 py-3">Order Date</th>
              <th className="px-3 py-3">Expected Delivery</th>
              <th className="px-3 py-3 text-right">Items</th>
              <th className="px-3 py-3 text-right">Total Amount</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Created By</th>
              <th className="px-3 py-3">Approved By</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((po) => {
              const overdue = isOverdue(po);
              return (
                <tr key={po.id} className="border-t border-slate-100 text-sm hover:bg-slate-50/80">
                  <td className="px-3 py-3">
                    <span className="rounded-md bg-orange-50 px-2 py-1 font-mono text-xs font-bold text-[#FF6A00]">
                      {po.po_number}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{po.suppliers?.name || '—'}</td>
                  <td className="px-3 py-3 text-slate-600">
                    {po.created_at
                      ? new Date(po.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className={cn('px-3 py-3', overdue ? 'font-semibold text-red-600' : 'text-slate-600')}>
                    {po.expected_date
                      ? new Date(po.expected_date + 'T00:00:00').toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                    {overdue ? ' · Overdue' : ''}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-800">
                    {po.items?.length || 0}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-900">
                    {formatCurrency(po.total_amount)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold', STATUS_STYLE[po.status] || STATUS_STYLE.Draft)}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {po.status === 'Cancelled' ? '—' : 'Staff'}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {po.status === 'Pending' || po.status === 'Received' ? 'Manager' : '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label={`Actions for ${po.po_number}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
                        <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => onView(po)}>
                          <Eye className="h-4 w-4 text-slate-400" /> View
                        </DropdownMenuItem>
                        {po.status === 'Draft' ? (
                          <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => onEdit(po)}>
                            <Pencil className="h-4 w-4 text-slate-400" /> Edit
                          </DropdownMenuItem>
                        ) : null}
                        {po.status === 'Draft' ? (
                          <DropdownMenuItem className="gap-2 rounded-lg text-sky-700" onClick={() => onApprove(po)}>
                            <Check className="h-4 w-4" /> Approve
                          </DropdownMenuItem>
                        ) : null}
                        {po.status === 'Pending' ? (
                          <DropdownMenuItem className="gap-2 rounded-lg text-emerald-700" onClick={() => onReceive(po)}>
                            <PackageCheck className="h-4 w-4" /> Receive Goods
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => onPrint(po)}>
                          <Printer className="h-4 w-4 text-slate-400" /> Print
                        </DropdownMenuItem>
                        {po.status === 'Draft' || po.status === 'Pending' ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 rounded-lg text-red-600" onClick={() => onCancel(po)}>
                              <X className="h-4 w-4" /> Cancel
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PODetailPanel({ po }: { po: PurchaseOrder }) {
  return (
    <div className="space-y-4">
      <POTimeline status={po.status} />
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Line items</h4>
        <div className="space-y-2">
          {(po.items || []).map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="rounded-md bg-white px-2 py-0.5 font-bold text-slate-700 ring-1 ring-slate-200">
                {item.quantity} {item.products?.unit}
              </span>
              <span className="min-w-[8rem] flex-1 font-semibold text-slate-800">{item.products?.name}</span>
              <span className="text-slate-400">@ {formatCurrency(item.unit_price)}</span>
              <span className="font-bold text-slate-900">{formatCurrency(item.total_price)}</span>
            </div>
          ))}
        </div>
      </div>
      {po.notes ? (
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <span className="mb-1 block font-semibold text-slate-800">Notes</span>
          {po.notes}
        </div>
      ) : null}
    </div>
  );
}
