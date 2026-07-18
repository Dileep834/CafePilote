import type { FloorObject } from './Object';

export const LAYOUT_SCHEMA_VERSION = 1 as const;

export type GridSize = 'small' | 'medium' | 'large';

export interface LayoutViewport {
  x: number;
  y: number;
  scale: number;
}

export interface LayoutGrid {
  size: GridSize;
  snap: boolean;
  visible: boolean;
}

export interface LayoutBlueprint {
  /** data URL or remote URL */
  url: string;
  opacity: number;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Physical floor plan bounds (meters → canvas pixels) */
export interface FloorSize {
  /** Floor width in meters */
  widthM: number;
  /** Floor depth / length in meters */
  heightM: number;
  /** Scale: how many canvas pixels = 1 meter */
  pixelsPerMeter: number;
}

export const DEFAULT_FLOOR_SIZE: FloorSize = {
  widthM: 12,
  heightM: 10,
  pixelsPerMeter: 50,
};

export const FLOOR_SIZE_PRESETS: { id: string; label: string; widthM: number; heightM: number }[] = [
  { id: 'small', label: 'Small café (8×6 m)', widthM: 8, heightM: 6 },
  { id: 'medium', label: 'Medium (12×10 m)', widthM: 12, heightM: 10 },
  { id: 'large', label: 'Large hall (20×15 m)', widthM: 20, heightM: 15 },
  { id: 'wide', label: 'Wide room (16×8 m)', widthM: 16, heightM: 8 },
];

export function floorSizeToPixels(size: FloorSize): { width: number; height: number } {
  const ppm = Math.max(10, size.pixelsPerMeter || 50);
  return {
    width: Math.round(Math.max(2, size.widthM) * ppm),
    height: Math.round(Math.max(2, size.heightM) * ppm),
  };
}

export function normalizeFloorSize(raw?: Partial<FloorSize> | null): FloorSize {
  return {
    widthM: Math.max(2, Number(raw?.widthM) || DEFAULT_FLOOR_SIZE.widthM),
    heightM: Math.max(2, Number(raw?.heightM) || DEFAULT_FLOOR_SIZE.heightM),
    pixelsPerMeter: Math.max(
      10,
      Math.min(120, Number(raw?.pixelsPerMeter) || DEFAULT_FLOOR_SIZE.pixelsPerMeter)
    ),
  };
}

export interface FloorLayoutDocument {
  schemaVersion: typeof LAYOUT_SCHEMA_VERSION;
  floorId: string;
  outletId: string;
  brandId?: string;
  viewport: LayoutViewport;
  grid: LayoutGrid;
  /** Defined floor area — drawn as the layout boundary */
  floorSize: FloorSize;
  blueprint?: LayoutBlueprint | null;
  objects: FloorObject[];
  /** Optimistic concurrency / future SignalR */
  version: number;
  updatedAt: string;
}

export function emptyLayout(floorId: string, outletId: string): FloorLayoutDocument {
  return {
    schemaVersion: LAYOUT_SCHEMA_VERSION,
    floorId,
    outletId,
    viewport: { x: 40, y: 40, scale: 1 },
    grid: { size: 'medium', snap: true, visible: true },
    floorSize: { ...DEFAULT_FLOOR_SIZE },
    blueprint: null,
    objects: [],
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}

export function gridPixelSize(size: GridSize): number {
  if (size === 'small') return 10;
  if (size === 'large') return 40;
  return 20;
}

/** Ensure older saved layouts get floorSize + sane defaults */
export function normalizeLayoutDoc(doc: FloorLayoutDocument): FloorLayoutDocument {
  return {
    ...emptyLayout(doc.floorId, doc.outletId),
    ...doc,
    floorSize: normalizeFloorSize(doc.floorSize),
    grid: { ...emptyLayout(doc.floorId, doc.outletId).grid, ...doc.grid },
    objects: doc.objects || [],
  };
}
