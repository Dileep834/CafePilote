import type { FloorObject } from '../types';

export type SeatPresetId =
  | '1+1'
  | '2+2'
  | '3+3'
  | '4+4'
  | '1+1+1+1'
  | '2+2+2+2'
  | '2|2'
  | '3|3';

export type SeatPreset = {
  id: SeatPresetId;
  label: string;
  /** Short side hint */
  sides: string;
  capacity: number;
  chairLayout: NonNullable<FloorObject['chairLayout']>;
};

/** Simple seat patterns — capacity + which sides get chairs */
export const SEAT_PRESETS: SeatPreset[] = [
  { id: '1+1', label: '1+1', sides: 'Front & back', capacity: 2, chairLayout: 'front_back' },
  { id: '2+2', label: '2+2', sides: 'Front & back', capacity: 4, chairLayout: 'front_back' },
  { id: '3+3', label: '3+3', sides: 'Front & back', capacity: 6, chairLayout: 'front_back' },
  { id: '4+4', label: '4+4', sides: 'Front & back', capacity: 8, chairLayout: 'front_back' },
  { id: '1+1+1+1', label: '1+1+1+1', sides: 'All 4 sides', capacity: 4, chairLayout: 'all' },
  { id: '2+2+2+2', label: '2+2+2+2', sides: 'All 4 sides', capacity: 8, chairLayout: 'all' },
  { id: '2|2', label: '2|2', sides: 'Left & right', capacity: 4, chairLayout: 'sides' },
  { id: '3|3', label: '3|3', sides: 'Left & right', capacity: 6, chairLayout: 'sides' },
];

export function getSeatPreset(id: SeatPresetId): SeatPreset {
  return SEAT_PRESETS.find((p) => p.id === id) || SEAT_PRESETS[1];
}

export function matchSeatPreset(
  capacity?: number,
  chairLayout?: FloorObject['chairLayout']
): SeatPresetId {
  const cap = capacity || 4;
  const layout = chairLayout || 'front_back';
  const hit = SEAT_PRESETS.find((p) => p.capacity === cap && p.chairLayout === layout);
  return hit?.id || '2+2';
}

/** Move same seat count to another side mode */
export function applySeatSides(
  capacity: number,
  sides: 'front_back' | 'sides' | 'all'
): { capacity: number; chairLayout: NonNullable<FloorObject['chairLayout']> } {
  return { capacity: Math.max(1, capacity || 4), chairLayout: sides };
}
