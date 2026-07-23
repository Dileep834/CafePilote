import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/constants';
import type { CatalogItem } from '../lib/catalog';
import { SeatSetupPicker } from './SeatSetupPicker';
import { matchSeatPreset, type SeatPresetId } from '../lib/seatPresets';
import type { FloorObject } from '../types';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import { useFloorStore } from '../store/floorStore';
import { X, Armchair, Link2 } from 'lucide-react';

type Props = {
  open: boolean;
  item: CatalogItem | null;
  defaultTableNumber: string;
  onClose: () => void;
  onConfirm: (opts: {
    tableNumber: string;
    capacity: number;
    chairLayout: NonNullable<FloorObject['chairLayout']>;
    seatPreset: SeatPresetId;
    linkTableId?: string;
  }) => void;
};

export function PlaceTableModal({ open, item, defaultTableNumber, onClose, onConfirm }: Props) {
  const outletId = useFloorStore((s) => s.outletId);
  const layout = useFloorStore((s) => s.layout);
  const tables = useTableStore((s) => s.tables);
  const [tableNumber, setTableNumber] = useState(defaultTableNumber);
  const [capacity, setCapacity] = useState(4);
  const [chairLayout, setChairLayout] =
    useState<NonNullable<FloorObject['chairLayout']>>('front_back');
  const [linkExistingId, setLinkExistingId] = useState('');

  const normalized = tableNumber.trim().toUpperCase();

  const usedOnFloor = useMemo(
    () => new Set((layout?.objects || []).map((o) => o.linkedTableId).filter(Boolean) as string[]),
    [layout]
  );

  const outletTables = useMemo(
    () =>
      tables.filter((t) => t.outletId === outletId || t.outletId === 'current-outlet'),
    [tables, outletId]
  );

  const duplicate = useMemo(
    () => outletTables.find((t) => t.tableNumber.toUpperCase() === normalized),
    [outletTables, normalized]
  );

  const freeToLink = useMemo(
    () =>
      outletTables
        .filter((t) => !usedOnFloor.has(t.id))
        .sort((a, b) =>
          a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
        ),
    [outletTables, usedOnFloor]
  );

  const canCreate = !!normalized && !duplicate;
  const canLinkDup = !!duplicate && !usedOnFloor.has(duplicate.id);
  const canLinkPick = !!linkExistingId;

  useEffect(() => {
    if (!open) return;
    setTableNumber(defaultTableNumber);
    setLinkExistingId('');
    const startCap = item?.capacity || 4;
    const startLayout: NonNullable<FloorObject['chairLayout']> =
      item?.kind === 'square_table' || item?.kind === 'round_table' || item?.kind === 'outdoor_table'
        ? 'all'
        : 'front_back';
    setCapacity(startCap);
    setChairLayout(startLayout);
  }, [open, defaultTableNumber, item?.capacity, item?.kind]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0D1B2A]/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="flex max-h-[min(92dvh,720px)] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-table-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#F3F3F8]">
          <div>
            <h2
              id="place-table-title"
              className="text-lg font-bold text-[#0D1B2A] flex items-center gap-2"
            >
              <Armchair className="w-5 h-5" style={{ color: BRAND.orange }} />
              Place {item.label}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Table number must be unique — or link an existing one
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Table number</span>
            <input
              value={tableNumber}
              onChange={(e) => {
                setTableNumber(e.target.value);
                setLinkExistingId('');
              }}
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold uppercase text-slate-900"
              autoFocus
            />
          </label>

          {duplicate && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-2">
              <p>
                <strong>{duplicate.tableNumber}</strong> already exists in Table Management
                {usedOnFloor.has(duplicate.id) ? ' and is already on this floor.' : '.'}
              </p>
              {canLinkDup && (
                <Button
                  type="button"
                  className="w-full h-9 rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: BRAND.navy }}
                  onClick={() =>
                    onConfirm({
                      tableNumber: duplicate.tableNumber,
                      capacity: duplicate.capacity,
                      chairLayout,
                      seatPreset: matchSeatPreset(duplicate.capacity, chairLayout),
                      linkTableId: duplicate.id,
                    })
                  }
                >
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  Link existing {duplicate.tableNumber} (no duplicate)
                </Button>
              )}
            </div>
          )}

          <SeatSetupPicker
            capacity={capacity}
            chairLayout={chairLayout}
            onChange={(next) => {
              setCapacity(next.capacity);
              setChairLayout(next.chairLayout);
            }}
          />

          {freeToLink.length > 0 && (
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Or link existing table</span>
              <select
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900"
                value={linkExistingId}
                onChange={(e) => setLinkExistingId(e.target.value)}
              >
                <option value="">Create new number above…</option>
                {freeToLink.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tableNumber} · {t.capacity} seats
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 h-11 rounded-xl font-bold text-white"
              style={{ backgroundColor: BRAND.orange }}
              disabled={!canLinkPick && !canCreate}
              onClick={() => {
                if (linkExistingId) {
                  const t = freeToLink.find((x) => x.id === linkExistingId);
                  if (!t) return;
                  onConfirm({
                    tableNumber: t.tableNumber,
                    capacity: t.capacity,
                    chairLayout,
                    seatPreset: matchSeatPreset(t.capacity, chairLayout),
                    linkTableId: t.id,
                  });
                  return;
                }
                onConfirm({
                  tableNumber: normalized,
                  capacity,
                  chairLayout,
                  seatPreset: matchSeatPreset(capacity, chairLayout),
                });
              }}
            >
              {linkExistingId
                ? `Link · ${freeToLink.find((t) => t.id === linkExistingId)?.tableNumber || ''}`
                : `Add · ${normalized || '—'} · ${capacity} seats`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
