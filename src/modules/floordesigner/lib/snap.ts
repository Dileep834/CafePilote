import { gridPixelSize, type GridSize } from '../types';

export function snapValue(value: number, gridSize: GridSize, enabled: boolean): number {
  if (!enabled) return value;
  const g = gridPixelSize(gridSize);
  return Math.round(value / g) * g;
}

export function snapPoint(
  x: number,
  y: number,
  gridSize: GridSize,
  enabled: boolean
): { x: number; y: number } {
  return {
    x: snapValue(x, gridSize, enabled),
    y: snapValue(y, gridSize, enabled),
  };
}
