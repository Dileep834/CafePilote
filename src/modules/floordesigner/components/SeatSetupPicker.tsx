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
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Seat limit
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || seats <= 1}
            onClick={() => emit(seats - 1, layout)}
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-600 disabled:opacity-40"
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
            className="flex-1 h-10 rounded-xl border border-slate-200 px-3 text-center text-base font-bold tabular-nums"
            style={{ color: BRAND.navy }}
            aria-label="Seat limit"
          />
          <button
            type="button"
            disabled={disabled || seats >= 24}
            onClick={() => emit(seats + 1, layout)}
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-lg font-bold text-slate-600 disabled:opacity-40"
            aria-label="More seats"
          >
            +
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">
          {seats} seat{seats === 1 ? '' : 's'} · chairs update on the floor
          {!exactPreset ? ' (custom)' : ''}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Quick patterns
        </p>
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
                <p className="text-sm font-bold tabular-nums" style={{ color: BRAND.navy }}>
                  {p.label}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {p.capacity} seats · {p.sides}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Chair sides
        </p>
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
                  'flex-1 h-9 rounded-xl border text-[11px] font-bold transition-all disabled:opacity-40',
                  on
                    ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                    : 'bg-white text-slate-600 border-slate-200'
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
