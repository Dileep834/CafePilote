import React, { useMemo } from 'react';
import { BRAND } from '@/constants';
import { useFloorStore } from '../store/floorStore';
import { useTableStore, getNextStatusAction, isClearBlockedByOpenBill } from '@/modules/tables/store/useTableStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { TABLE_STATUS_COLORS, toCanvasStatus } from '../types';
import { openTableOnPOS } from '@/modules/pos/store/usePOSStore';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { Receipt, Users } from 'lucide-react';

/** Mobile-friendly table list when floor map is too dense */
export function MobileOpsTableList() {
  const layout = useFloorStore((s) => s.layout);
  const select = useFloorStore((s) => s.select);
  const selectedIds = useFloorStore((s) => s.selectedIds);
  const tables = useTableStore((s) => s.tables);
  const updateTableStatus = useTableStore((s) => s.updateTableStatus);
  const getOpenBillForTable = useTableBillStore((s) => s.getOpenBillForTable);
  const getBillTotal = useTableBillStore((s) => s.getBillTotal);
  const navigate = useNavigate();

  const rows = useMemo(() => {
    if (!layout) return [];
    return layout.objects
      .filter((o) => o.kind.includes('table') && o.linkedTableId)
      .map((o) => {
        const table = tables.find((t) => t.id === o.linkedTableId);
        return table ? { obj: o, table } : null;
      })
      .filter(Boolean)
      .sort((a, b) =>
        a!.table.tableNumber.localeCompare(b!.table.tableNumber, undefined, { numeric: true })
      ) as { obj: (typeof layout.objects)[0]; table: (typeof tables)[0] }[];
  }, [layout, tables]);

  if (rows.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-500 text-center">
        No linked tables yet. Open Edit layout or load the sample café.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2 bg-[#F3F3F8]">
      <p className="mb-1 px-1 text-sm font-semibold text-slate-700">Tables</p>
      {rows.map(({ obj, table }) => {
        const bill = getOpenBillForTable(table, tables);
        const status = toCanvasStatus(table.status, {
          hasOpenBill: !!(bill && bill.items.length > 0),
        });
        const next = getNextStatusAction(table.status);
        const selected = selectedIds.includes(obj.id);
        const clearBlocked =
          isClearBlockedByOpenBill(table.status, !!(bill && bill.items.length > 0)) &&
          (next.next === 'cleaning' || next.next === 'available');

        return (
          <button
            key={obj.id}
            type="button"
            onClick={() => select([obj.id])}
            className={cn(
              'w-full text-left rounded-2xl border bg-white px-3 py-3 shadow-sm transition-all',
              selected ? 'border-[#FF6A00] ring-2 ring-orange-100' : 'border-slate-200'
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: TABLE_STATUS_COLORS[status] }}
              />
              <span className="text-base font-bold text-slate-900" style={{ color: BRAND.navy }}>
                {table.tableNumber}
              </span>
              <span className="text-xs font-semibold capitalize text-slate-500">
                {table.status}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Users className="w-3 h-3" />
                {table.capacity}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={clearBlocked}
                className="h-8 flex-1 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: BRAND.orange }}
                title={
                  clearBlocked ? 'Pay the open bill before clearing this table' : undefined
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (clearBlocked) {
                    window.alert('Pay the open bill before clearing this table.');
                    return;
                  }
                  void updateTableStatus(table.id, next.next).then((ok) => {
                    if (!ok) {
                      window.alert(
                        useTableStore.getState().lastError ||
                          'Pay the open bill before clearing this table.'
                      );
                    }
                  });
                }}
              >
                {clearBlocked ? 'Pay bill first' : next.label}
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1 rounded-xl px-3 text-xs font-bold text-white"
                style={{ backgroundColor: BRAND.navy }}
                onClick={(e) => {
                  e.stopPropagation();
                  openTableOnPOS(table);
                  navigate('/erp/pos');
                }}
              >
                <Receipt className="w-3 h-3" />
                {bill && bill.items.length > 0 ? formatCurrency(getBillTotal(bill)) : 'Bill'}
              </button>
            </div>
          </button>
        );
      })}
    </div>
  );
}
