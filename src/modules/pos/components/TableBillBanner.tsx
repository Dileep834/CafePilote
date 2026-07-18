import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { useAuthStore } from '@/store/useAuthStore';
import { useTableStore, getMergeLabel, getMergeGroup, isMergePrimary } from '@/modules/tables/store/useTableStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { usePOSStore } from '../store/usePOSStore';
import { LayoutGrid, X, Receipt } from 'lucide-react';

export function TableBillBanner() {
  const navigate = useNavigate();
  const { activeTableId, activeTableLabel, detachTable, cart, syncActiveTableBill } = usePOSStore();
  const getOpenBill = useTableBillStore((s) => s.getOpenBill);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!activeTableId) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-left hover:border-[#FF6A00]/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <LayoutGrid className="w-4 h-4" style={{ color: BRAND.orange }} />
            Attach table
          </span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dine-in</span>
        </button>
        {pickerOpen && <TablePickerModal onClose={() => setPickerOpen(false)} />}
      </>
    );
  }

  const bill = getOpenBill(activeTableId);
  const itemCount = bill?.items.length ?? cart.length;

  return (
    <>
      <div
        className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 border"
        style={{ backgroundColor: BRAND.navy, borderColor: BRAND.steel }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Open bill</p>
          <p className="text-sm font-bold text-white truncate">{activeTableLabel}</p>
          <p className="text-[11px] text-white/60">{itemCount} line{itemCount === 1 ? '' : 's'} on check</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: BRAND.orange }}
            onClick={() => {
              syncActiveTableBill();
              navigate('/erp/pos/checkout');
            }}
            disabled={cart.length === 0}
          >
            <Receipt className="w-3.5 h-3.5 mr-1" />
            Pay
          </Button>
          <button
            type="button"
            onClick={() => {
              syncActiveTableBill();
              detachTable();
              usePOSStore.getState().clearCart();
            }}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10"
            title="Close table session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {pickerOpen && <TablePickerModal onClose={() => setPickerOpen(false)} />}
    </>
  );
}

function TablePickerModal({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const outletId = user?.outletId || 'current-outlet';
  const tables = useTableStore((s) => s.tables);
  const loadTableBill = usePOSStore((s) => s.loadTableBill);
  const getOpenBillForTable = useTableBillStore((s) => s.getOpenBillForTable);
  const getBillTotal = useTableBillStore((s) => s.getBillTotal);

  const outletTables = useMemo(
    () =>
      tables
        .filter((t) => t.outletId === outletId || t.outletId === 'current-outlet')
        .filter((t) => !t.mergeGroupId || isMergePrimary(t))
        .sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })),
    [tables, outletId]
  );

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0D1B2A]/45 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#F3F3F8]">
          <div>
            <h3 className="text-lg font-bold text-[#0D1B2A]">Select table</h3>
            <p className="text-xs text-slate-500">Open or continue a dine-in bill</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3 overflow-y-auto space-y-2">
          {outletTables.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tables yet. Add tables on the floor board.</p>
          ) : (
            outletTables.map((table) => {
              const group = getMergeGroup(tables, table);
              const label = group.length > 1 ? getMergeLabel(group) : table.tableNumber;
              const bill = getOpenBillForTable(table, tables);
              const total = bill ? getBillTotal(bill) : 0;
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => {
                    loadTableBill(table, tables);
                    onClose();
                  }}
                  className={cn(
                    'w-full flex items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors',
                    bill ? 'border-[#FF6A00]/40 bg-orange-50/50' : 'border-slate-200 hover:border-slate-300 bg-white'
                  )}
                >
                  <div>
                    <p className="font-bold text-[#0D1B2A]">{label}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{table.status}</p>
                  </div>
                  <div className="text-right">
                    {bill ? (
                      <>
                        <p className="text-sm font-black" style={{ color: BRAND.orange }}>
                          {formatCurrency(total)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Open</p>
                      </>
                    ) : (
                      <p className="text-[11px] font-bold text-slate-400">New bill</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
