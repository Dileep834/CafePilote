import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '@/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFloorStore } from '../store/floorStore';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { TABLE_STATUS_COLORS, toCanvasStatus } from '../types';
import { ChevronLeft, ChevronRight, Receipt, QrCode, Sparkles, Link2, Unlink } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { openTableOnPOS } from '@/modules/pos/store/usePOSStore';
import { useNavigate } from 'react-router-dom';
import { SeatSetupPicker } from './SeatSetupPicker';
import { FLOOR_SIZE_PRESETS, floorSizeToPixels } from '../types/Layout';

type Props = {
  onPrintQr: () => void;
};

export function FloorPropertiesPanel({ onPrintQr }: Props) {
  const propsOpen = useFloorStore((s) => s.propsOpen);
  const setPropsOpen = useFloorStore((s) => s.setPropsOpen);
  const layout = useFloorStore((s) => s.layout);
  const selectedIds = useFloorStore((s) => s.selectedIds);
  const mode = useFloorStore((s) => s.mode);
  const updateObjects = useFloorStore((s) => s.updateObjects);
  const alignSelected = useFloorStore((s) => s.alignSelected);
  const linkDiningTable = useFloorStore((s) => s.linkDiningTable);
  const unlinkDiningTable = useFloorStore((s) => s.unlinkDiningTable);
  const outletId = useFloorStore((s) => s.outletId);
  const setGrid = useFloorStore((s) => s.setGrid);
  const setFloorSize = useFloorStore((s) => s.setFloorSize);
  const setBlueprint = useFloorStore((s) => s.setBlueprint);
  const tables = useTableStore((s) => s.tables);
  const getOpenBillForTable = useTableBillStore((s) => s.getOpenBillForTable);
  const getBillTotal = useTableBillStore((s) => s.getBillTotal);
  const navigate = useNavigate();
  const [linkPickId, setLinkPickId] = React.useState('');

  const obj =
    selectedIds.length === 1
      ? layout?.objects.find((o) => o.id === selectedIds[0])
      : undefined;

  const linked = obj?.linkedTableId
    ? tables.find((t) => t.id === obj.linkedTableId)
    : undefined;
  const bill = linked ? getOpenBillForTable(linked, tables) : undefined;
  const canvasStatus = linked
    ? toCanvasStatus(linked.status, { hasOpenBill: !!(bill && bill.items.length > 0) })
    : undefined;

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <label className="mb-3 block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );

  const inputClass =
    'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30';

  return (
    <>
      {propsOpen ? (
        <button
          type="button"
          aria-label="Close properties"
          className="fixed inset-0 z-[60] bg-slate-950/45 md:hidden"
          onClick={() => setPropsOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          'relative hidden h-full shrink-0 md:flex',
          propsOpen &&
            'max-md:!flex max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:z-[65] max-md:max-h-[min(75dvh,640px)] max-md:flex-col max-md:overflow-hidden max-md:rounded-t-2xl max-md:border-t max-md:border-slate-200 max-md:bg-white max-md:shadow-2xl'
        )}
      >
      <button
        type="button"
        onClick={() => setPropsOpen(!propsOpen)}
        className="z-10 mt-3 -ml-3 hidden h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow touch-manipulation md:flex"
        title={propsOpen ? 'Collapse properties' : 'Expand properties'}
      >
        {propsOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
      <AnimatePresence initial={false}>
        {propsOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-hidden border-l border-slate-200 bg-white max-md:!w-full max-md:border-l-0"
          >
            <div className="flex h-full w-full flex-col md:w-[280px]">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-bold tracking-tight text-slate-900">Properties</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-600">
                      {selectedIds.length === 0
                        ? 'Floor settings'
                        : selectedIds.length > 1
                          ? `${selectedIds.length} selected`
                          : linked?.tableNumber || obj?.tableNumber || obj?.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPropsOpen(false)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 touch-manipulation md:hidden"
                    aria-label="Close properties"
                  >
                    <ChevronRight className="h-4 w-4 rotate-90" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {selectedIds.length > 1 && mode === 'design' && (
                  <div className="mb-4 rounded-2xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      Align {selectedIds.length} objects
                    </p>
                    <Button
                      type="button"
                      className="w-full h-10 rounded-xl font-bold text-white mb-2"
                      style={{ backgroundColor: BRAND.orange }}
                      onClick={() => alignSelected('auto')}
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Auto align
                    </Button>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ['left', 'Left'],
                          ['center', 'Ctr'],
                          ['right', 'Right'],
                          ['top', 'Top'],
                          ['middle', 'Mid'],
                          ['bottom', 'Bot'],
                        ] as const
                      ).map(([action, label]) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => alignSelected(action)}
                          className="h-8 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!obj && selectedIds.length === 0 && layout && (
                  <>
                    <div className="mb-4 rounded-2xl border border-slate-200 p-3">
                      <p className="mb-2 text-sm font-semibold text-slate-700">Floor size</p>
                      <p className="mb-3 text-sm font-medium text-slate-600">
                        Layout area:{' '}
                        <span className="font-bold text-slate-900">
                          {layout.floorSize.widthM} × {layout.floorSize.heightM} m
                        </span>
                        <span className="text-slate-500">
                          {' '}
                          (
                          {floorSizeToPixels(layout.floorSize).width}×
                          {floorSizeToPixels(layout.floorSize).height} px)
                        </span>
                      </p>
                      <Field label="Preset">
                        <select
                          className={inputClass}
                          disabled={mode === 'preview'}
                          value={
                            FLOOR_SIZE_PRESETS.find(
                              (p) =>
                                p.widthM === layout.floorSize.widthM &&
                                p.heightM === layout.floorSize.heightM
                            )?.id || 'custom'
                          }
                          onChange={(e) => {
                            const p = FLOOR_SIZE_PRESETS.find((x) => x.id === e.target.value);
                            if (p) setFloorSize({ widthM: p.widthM, heightM: p.heightM });
                          }}
                        >
                          <option value="custom">Custom</option>
                          {FLOOR_SIZE_PRESETS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Width (m)">
                          <input
                            type="number"
                            min={2}
                            max={80}
                            step={0.5}
                            className={inputClass}
                            value={layout.floorSize.widthM}
                            disabled={mode === 'preview'}
                            onChange={(e) =>
                              setFloorSize({ widthM: Number(e.target.value) || 2 })
                            }
                          />
                        </Field>
                        <Field label="Depth (m)">
                          <input
                            type="number"
                            min={2}
                            max={80}
                            step={0.5}
                            className={inputClass}
                            value={layout.floorSize.heightM}
                            disabled={mode === 'preview'}
                            onChange={(e) =>
                              setFloorSize({ heightM: Number(e.target.value) || 2 })
                            }
                          />
                        </Field>
                      </div>
                      <Field label="Scale (px per meter)">
                        <input
                          type="number"
                          min={10}
                          max={120}
                          step={5}
                          className={inputClass}
                          value={layout.floorSize.pixelsPerMeter}
                          disabled={mode === 'preview'}
                          onChange={(e) =>
                            setFloorSize({ pixelsPerMeter: Number(e.target.value) || 50 })
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Grid size">
                      <select
                        className={inputClass}
                        value={layout.grid.size}
                        disabled={mode === 'preview'}
                        onChange={(e) =>
                          setGrid({ size: e.target.value as 'small' | 'medium' | 'large' })
                        }
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </Field>
                    {layout.blueprint && (
                      <>
                        <Field label="Blueprint opacity">
                          <input
                            type="range"
                            min={0.1}
                            max={1}
                            step={0.05}
                            value={layout.blueprint.opacity}
                            disabled={mode === 'preview'}
                            onChange={(e) =>
                              setBlueprint({
                                ...layout.blueprint!,
                                opacity: Number(e.target.value),
                              })
                            }
                            className="w-full"
                          />
                        </Field>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-9 rounded-xl text-xs font-bold"
                            disabled={mode === 'preview'}
                            onClick={() =>
                              setBlueprint({
                                ...layout.blueprint!,
                                locked: !layout.blueprint!.locked,
                              })
                            }
                          >
                            {layout.blueprint.locked ? 'Unlock blueprint' : 'Lock blueprint'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-9 rounded-xl text-xs font-bold text-rose-600"
                            disabled={mode === 'preview'}
                            onClick={() => setBlueprint(null)}
                          >
                            Remove
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {obj && (
                  <>
                    <Field label="Name">
                      <input
                        className={inputClass}
                        value={obj.name}
                        disabled={mode === 'preview'}
                        onChange={(e) => updateObjects([obj.id], { name: e.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="X">
                        <input
                          type="number"
                          className={inputClass}
                          value={Math.round(obj.x)}
                          disabled={mode === 'preview' || obj.locked}
                          onChange={(e) => updateObjects([obj.id], { x: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Y">
                        <input
                          type="number"
                          className={inputClass}
                          value={Math.round(obj.y)}
                          disabled={mode === 'preview' || obj.locked}
                          onChange={(e) => updateObjects([obj.id], { y: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Width">
                        <input
                          type="number"
                          className={inputClass}
                          value={Math.round(obj.width)}
                          disabled={mode === 'preview' || obj.locked}
                          onChange={(e) =>
                            updateObjects([obj.id], { width: Number(e.target.value) })
                          }
                        />
                      </Field>
                      <Field label="Height">
                        <input
                          type="number"
                          className={inputClass}
                          value={Math.round(obj.height)}
                          disabled={mode === 'preview' || obj.locked}
                          onChange={(e) =>
                            updateObjects([obj.id], { height: Number(e.target.value) })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Rotation">
                      <input
                        type="number"
                        className={inputClass}
                        value={Math.round(obj.rotation)}
                        disabled={mode === 'preview' || obj.locked}
                        onChange={(e) =>
                          updateObjects([obj.id], { rotation: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Color">
                      <input
                        type="color"
                        className="h-9 w-full rounded-xl border border-slate-200"
                        value={obj.color === 'transparent' ? '#ffffff' : obj.color}
                        disabled={mode === 'preview'}
                        onChange={(e) => updateObjects([obj.id], { color: e.target.value })}
                      />
                    </Field>
                    <Field label="Opacity">
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={obj.opacity}
                        disabled={mode === 'preview'}
                        onChange={(e) =>
                          updateObjects([obj.id], { opacity: Number(e.target.value) })
                        }
                        className="w-full"
                      />
                    </Field>
                    {obj.kind === 'text_label' && (
                      <Field label="Text">
                        <input
                          className={inputClass}
                          value={obj.text || ''}
                          disabled={mode === 'preview'}
                          onChange={(e) => updateObjects([obj.id], { text: e.target.value })}
                        />
                      </Field>
                    )}

                    {obj.kind.includes('table') && obj.linkedTableId && linked && (
                      <div className="mt-3 rounded-2xl border border-slate-200 p-3 space-y-2">
                        <p className="text-sm font-semibold text-slate-700">Linked table</p>
                        <Field label="Table number">
                          <input
                            className={inputClass}
                            value={linked.tableNumber || obj.tableNumber || ''}
                            disabled={mode === 'preview'}
                            onChange={(e) => {
                              const next = e.target.value.trim().toUpperCase();
                              updateObjects([obj.id], {
                                tableNumber: next,
                                name: next || obj.name,
                              });
                              void useTableStore
                                .getState()
                                .updateTable(linked.id, { tableNumber: next })
                                .then((ok) => {
                                  if (!ok) {
                                    const err = useTableStore.getState().lastError;
                                    if (err) alert(err);
                                  }
                                });
                            }}
                          />
                        </Field>
                        <SeatSetupPicker
                          capacity={obj.capacity ?? linked.capacity}
                          chairLayout={obj.chairLayout}
                          disabled={mode === 'preview'}
                          onChange={(next) => {
                            updateObjects([obj.id], {
                              capacity: next.capacity,
                              chairLayout: next.chairLayout,
                            });
                            void useTableStore
                              .getState()
                              .updateTable(linked.id, { capacity: next.capacity });
                          }}
                        />
                        <Field label="Zone">
                          <input
                            className={inputClass}
                            value={obj.zone || ''}
                            disabled={mode === 'preview'}
                            onChange={(e) => updateObjects([obj.id], { zone: e.target.value })}
                          />
                        </Field>
                        {canvasStatus && (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: TABLE_STATUS_COLORS[canvasStatus] }}
                            />
                            <span className="text-xs font-bold capitalize text-slate-700">
                              {canvasStatus}
                            </span>
                            {bill && bill.items.length > 0 && (
                              <span className="ml-auto text-sm font-bold" style={{ color: BRAND.orange }}>
                                {formatCurrency(getBillTotal(bill))}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button
                            type="button"
                            className="flex-1 h-9 rounded-xl text-xs font-bold text-white"
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
                            className="flex-1 h-9 rounded-xl text-xs font-bold"
                            onClick={onPrintQr}
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1" />
                            QR
                          </Button>
                        </div>
                        {mode === 'design' && (
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-1 py-1.5 text-sm font-semibold text-slate-500 hover:text-rose-600"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Unlink ${linked.tableNumber}? The dining table is kept.`
                                )
                              ) {
                                unlinkDiningTable(obj.id);
                              }
                            }}
                          >
                            <Unlink className="w-3 h-3" />
                            Unlink
                          </button>
                        )}
                      </div>
                    )}

                    {obj.kind.includes('table') && !obj.linkedTableId && mode === 'design' && (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                        <p className="text-sm font-semibold text-amber-800">Not linked</p>
                        <p className="text-sm font-medium text-amber-900">
                          Link an existing table number — duplicates are not created.
                        </p>
                        <select
                          className={inputClass}
                          value={linkPickId}
                          onChange={(e) => setLinkPickId(e.target.value)}
                        >
                          <option value="">Select table…</option>
                          {tables
                            .filter(
                              (t) =>
                                (t.outletId === outletId || t.outletId === 'current-outlet') &&
                                !layout?.objects.some(
                                  (o) => o.linkedTableId === t.id && o.id !== obj.id
                                )
                            )
                            .sort((a, b) =>
                              a.tableNumber.localeCompare(b.tableNumber, undefined, {
                                numeric: true,
                              })
                            )
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.tableNumber} · {t.capacity} seats
                              </option>
                            ))}
                        </select>
                        <Button
                          type="button"
                          className="w-full h-9 rounded-xl text-xs font-bold text-white"
                          style={{ backgroundColor: BRAND.navy }}
                          disabled={!linkPickId}
                          onClick={() => {
                            if (!linkPickId) return;
                            if (linkDiningTable(obj.id, linkPickId)) setLinkPickId('');
                            else {
                              const err = useFloorStore.getState().lastError;
                              if (err) alert(err);
                            }
                          }}
                        >
                          <Link2 className="w-3.5 h-3.5 mr-1" />
                          Link table
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
