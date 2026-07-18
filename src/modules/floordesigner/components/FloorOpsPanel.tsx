import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '@/constants';
import { Button } from '@/components/ui/button';
import { useFloorStore } from '../store/floorStore';
import {
  getNextStatusAction,
  useTableStore,
} from '@/modules/tables/store/useTableStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { TABLE_STATUS_COLORS, toCanvasStatus } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Receipt,
  QrCode,
  Link2,
  Unlink,
  Map,
  CircleDot,
  Users,
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { openTableOnPOS } from '@/modules/pos/store/usePOSStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { TableStatus } from '@/types';

type Props = {
  onPrintQr: () => void;
  onEditLayout?: () => void;
};

const STATUS_LABEL: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
};

/** Staff-facing panel for Table Management floor plan (not the designer) */
export function FloorOpsPanel({ onPrintQr, onEditLayout }: Props) {
  const propsOpen = useFloorStore((s) => s.propsOpen);
  const setPropsOpen = useFloorStore((s) => s.setPropsOpen);
  const layout = useFloorStore((s) => s.layout);
  const selectedIds = useFloorStore((s) => s.selectedIds);
  const outletId = useFloorStore((s) => s.outletId);
  const linkDiningTable = useFloorStore((s) => s.linkDiningTable);
  const unlinkDiningTable = useFloorStore((s) => s.unlinkDiningTable);
  const tables = useTableStore((s) => s.tables);
  const updateTableStatus = useTableStore((s) => s.updateTableStatus);
  const lastError = useTableStore((s) => s.lastError);
  const getOpenBillForTable = useTableBillStore((s) => s.getOpenBillForTable);
  const getBillTotal = useTableBillStore((s) => s.getBillTotal);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [linkId, setLinkId] = useState('');

  const obj =
    selectedIds.length === 1
      ? layout?.objects.find((o) => o.id === selectedIds[0])
      : undefined;

  const isTableShape = !!obj?.kind.includes('table');

  const linked = obj?.linkedTableId
    ? tables.find((t) => t.id === obj.linkedTableId)
    : undefined;

  const bill = linked ? getOpenBillForTable(linked, tables) : undefined;
  const canvasStatus = linked
    ? toCanvasStatus(linked.status, { hasOpenBill: !!(bill && bill.items.length > 0) })
    : undefined;
  const nextAction = linked ? getNextStatusAction(linked.status) : null;

  const linkedCount = useMemo(
    () => layout?.objects.filter((o) => o.linkedTableId).length || 0,
    [layout]
  );

  const availableToLink = useMemo(() => {
    const used = new Set(
      (layout?.objects || [])
        .filter((o) => o.id !== obj?.id && o.linkedTableId)
        .map((o) => o.linkedTableId as string)
    );
    return tables
      .filter(
        (t) =>
          (t.outletId === outletId || t.outletId === 'current-outlet') && !used.has(t.id)
      )
      .sort((a, b) =>
        a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
      );
  }, [tables, layout, outletId, obj?.id]);

  const displayNumber =
    linked?.tableNumber || obj?.tableNumber || (isTableShape ? 'Unlinked' : obj?.name);

  return (
    <div className="relative shrink-0 flex">
      <button
        type="button"
        onClick={() => setPropsOpen(!propsOpen)}
        className="w-6 h-6 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-slate-500 mt-3 -ml-3 z-10"
        title={propsOpen ? 'Collapse' : 'Expand'}
      >
        {propsOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
      <AnimatePresence initial={false}>
        {propsOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full border-l border-slate-200 bg-white overflow-hidden"
          >
            <div className="w-[300px] h-full flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold" style={{ color: BRAND.navy }}>
                  {obj ? displayNumber : 'Floor board'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {obj
                    ? linked
                      ? 'Linked to Table Management'
                      : isTableShape
                        ? 'Not linked yet'
                        : 'Not a dining table'
                    : `${linkedCount} linked table${linkedCount === 1 ? '' : 's'}`}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!obj && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <p className="text-sm text-slate-600">
                      Tap a table on the floor to open bill, change status, or print QR.
                    </p>
                    {linkedCount === 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        No linked tables on this floor yet. Place tables in Floor Designer so they
                        connect to Table Management.
                      </p>
                    )}
                    {onEditLayout && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 rounded-xl text-xs font-bold"
                        onClick={onEditLayout}
                      >
                        <Map className="w-3.5 h-3.5 mr-1.5" />
                        Edit layout
                      </Button>
                    )}
                  </div>
                )}

                {obj && !isTableShape && (
                  <p className="text-sm text-slate-500">
                    This is a layout object ({obj.name}). Use <strong>Edit layout</strong> to change
                    it.
                  </p>
                )}

                {obj && isTableShape && linked && canvasStatus && (
                  <>
                    <div
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor: TABLE_STATUS_COLORS[canvasStatus],
                        backgroundColor: `${TABLE_STATUS_COLORS[canvasStatus]}18`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: TABLE_STATUS_COLORS[canvasStatus] }}
                        />
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                          {STATUS_LABEL[linked.status]}
                        </span>
                      </div>
                      <p
                        className="text-3xl font-black tracking-tight"
                        style={{ color: BRAND.navy }}
                      >
                        {linked.tableNumber}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {linked.capacity} seats
                        </span>
                        {bill && bill.items.length > 0 && (
                          <span className="ml-auto font-black" style={{ color: BRAND.orange }}>
                            {formatCurrency(getBillTotal(bill))}
                          </span>
                        )}
                      </div>
                    </div>

                    {nextAction && (
                      <Button
                        type="button"
                        className="w-full h-11 rounded-xl font-bold text-white"
                        style={{ backgroundColor: BRAND.orange }}
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          await updateTableStatus(linked.id, nextAction.next);
                          setBusy(false);
                        }}
                      >
                        <CircleDot className="w-4 h-4 mr-1.5" />
                        {nextAction.label}
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        className="h-10 rounded-xl text-xs font-bold text-white"
                        style={{ backgroundColor: BRAND.navy }}
                        onClick={() => {
                          openTableOnPOS(linked);
                          navigate('/erp/pos');
                        }}
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1" />
                        Open bill
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl text-xs font-bold"
                        onClick={onPrintQr}
                      >
                        <QrCode className="w-3.5 h-3.5 mr-1" />
                        QR
                      </Button>
                    </div>

                    <button
                      type="button"
                      className="w-full text-[11px] font-semibold text-slate-400 hover:text-rose-600 flex items-center justify-center gap-1 py-1"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Unlink ${linked.tableNumber} from this floor shape? The table stays in Table Management.`
                          )
                        ) {
                          unlinkDiningTable(obj.id);
                        }
                      }}
                    >
                      <Unlink className="w-3 h-3" />
                      Unlink from floor
                    </button>
                  </>
                )}

                {obj && isTableShape && !linked && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      This shape is not linked. Link an existing table number — duplicates are not
                      created.
                    </div>
                    {availableToLink.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No free tables to link. Add one in Table view, or place a new table in Edit
                        layout.
                      </p>
                    ) : (
                      <>
                        <label className="block">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Link to table
                          </span>
                          <select
                            className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
                            value={linkId}
                            onChange={(e) => setLinkId(e.target.value)}
                          >
                            <option value="">Select table…</option>
                            {availableToLink.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.tableNumber} · {t.capacity} seats · {t.status}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button
                          type="button"
                          className="w-full h-10 rounded-xl font-bold text-white"
                          style={{ backgroundColor: BRAND.navy }}
                          disabled={!linkId}
                          onClick={() => {
                            if (!linkId) return;
                            const ok = linkDiningTable(obj.id, linkId);
                            if (ok) setLinkId('');
                          }}
                        >
                          <Link2 className="w-4 h-4 mr-1.5" />
                          Link table
                        </Button>
                      </>
                    )}
                    {lastError && (
                      <p className="text-xs text-rose-600 font-medium">{lastError}</p>
                    )}
                    {onEditLayout && (
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('w-full h-9 rounded-xl text-xs font-bold')}
                        onClick={onEditLayout}
                      >
                        Edit layout
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
