import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/constants';
import {
  SEAT_PRESETS,
  matchSeatPreset,
  type SeatPresetId,
} from '../lib/seatPresets';
import type { FloorObject } from '../types';

type Props = {
  capacity?: number;
  chairLayout?: FloorObject['chairLayout'];
  disabled?: boolean;
  onChange: (next: {
    capacity: number;
    chairLayout: NonNullable<FloorObject['chairLayout']>;
    seatPreset: SeatPresetId;
  }) => void;
};

/** Seat limit + simple patterns (2+2 / 1+1+1+1) + chair sides */
export function SeatSetupPicker({ capacity, chairLayout, disabled, onChange }: Props) {
  const seats = Math.max(1, Math.min(24, Number(capacity) || 4));
  const layout = chairLayout || 'front_back';
  const activeId = matchSeatPreset(seats, layout);
  const exactPreset = SEAT_PRESETS.some((p) => p.capacity === seats && p.chairLayout === layout);

  const emit = (
    nextCapacity: number,
    nextLayout: NonNullable<FloorObject['chairLayout']>
  ) => {
    const cap = Math.max(1, Math.min(24, nextCapacity));
    onChange({
      capacity: cap,
      chairLayout: nextLayout,
      seatPreset: matchSeatPreset(cap, nextLayout),
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-sm font-semibold text-slate-700">Seat limit</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || seats <= 1}
            onClick={() => emit(seats - 1, layout)}
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-700 disabled:opacity-40"
            aria-label="Fewer seats"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={24}
            disabled={disabled}
            value={seats}
            onChange={(e) => emit(Number(e.target.value) || 1, layout)}
            className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-center text-base font-bold tabular-nums text-slate-900"
            style={{ color: BRAND.navy }}
            aria-label="Seat limit"
          />
          <button
            type="button"
            disabled={disabled || seats >= 24}
            onClick={() => emit(seats + 1, layout)}
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-700 disabled:opacity-40"
            aria-label="More seats"
          >
            +
          </button>
        </div>
        <p className="mt-1.5 text-xs font-medium text-slate-500">
          {seats} seat{seats === 1 ? '' : 's'} · chairs update on the floor
          {!exactPreset ? ' (custom)' : ''}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-slate-700">Quick patterns</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SEAT_PRESETS.map((p) => {
            const on = exactPreset && activeId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => emit(p.capacity, p.chairLayout)}
                className={cn(
                  'rounded-xl border px-2.5 py-2 text-left transition-all disabled:opacity-40',
                  on
                    ? 'border-[#FF6A00] bg-orange-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <p className="text-sm font-bold tabular-nums text-slate-900" style={{ color: BRAND.navy }}>
                  {p.label}
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {p.capacity} seats · {p.sides}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-slate-700">Chair sides</p>
        <div className="flex gap-1">
          {(
            [
              ['front_back', 'Front + back'],
              ['sides', 'Left + right'],
              ['all', 'All 4'],
            ] as const
          ).map(([id, label]) => {
            const on = layout === id;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => emit(seats, id)}
                className={cn(
                  'h-9 flex-1 rounded-xl border text-xs font-semibold transition-all disabled:opacity-40',
                  on
                    ? 'border-[#0D1B2A] bg-[#0D1B2A] text-white'
                    : 'border-slate-200 bg-white text-slate-700'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
