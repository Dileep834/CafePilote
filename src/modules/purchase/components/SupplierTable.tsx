import { Eye, MoreHorizontal, Phone, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import type { SupplierRow } from '../lib/supplierHelpers';

type Props = {
  rows: SupplierRow[];
  onView: (row: SupplierRow) => void;
  onCreatePO: (row: SupplierRow) => void;
  onViewOrders: (row: SupplierRow) => void;
};

export function SupplierTable({ rows, onView, onCreatePO, onViewOrders }: Props) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
              <th className="px-3 py-3">Supplier</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">City</th>
              <th className="px-3 py-3 text-right">Orders</th>
              <th className="px-3 py-3 text-right">Total Purchases</th>
              <th className="px-3 py-3 text-right">Outstanding</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 text-sm hover:bg-slate-50/80">
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onView(s)}
                    className="text-left font-semibold text-slate-900 hover:text-[#FF6A00]"
                  >
                    {s.name}
                  </button>
                  {s.phone ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <Phone className="h-3 w-3" />
                      {s.phone}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {s.category || 'General'}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-600">{s.contact_name || '—'}</td>
                <td className="px-3 py-3 text-slate-600">{s.city || '—'}</td>
                <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-800">
                  {s.orderCount}
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-900">
                  {formatCurrency(s.totalPurchases)}
                </td>
                <td
                  className={cn(
                    'px-3 py-3 text-right tabular-nums font-semibold',
                    s.outstanding > 0 ? 'text-amber-700' : 'text-slate-500'
                  )}
                >
                  {formatCurrency(s.outstanding)}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold',
                      s.is_active
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15'
                        : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-400/20'
                    )}
                  >
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          aria-label={`Actions for ${s.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
                      <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => onView(s)}>
                        <Eye className="h-4 w-4 text-slate-400" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => onCreatePO(s)}>
                        <ShoppingCart className="h-4 w-4 text-slate-400" /> Create PO
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 rounded-lg" onClick={() => onViewOrders(s)}>
                        View purchase orders
                      </DropdownMenuItem>
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
