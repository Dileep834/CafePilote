import type { FloorObject } from '../types/Object';
import { gridPixelSize, type GridSize } from '../types/Layout';

export type AlignAction =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom'
  | 'distributeH'
  | 'distributeV'
  | 'auto';

type Bounds = { id: string; x: number; y: number; width: number; height: number; locked: boolean };

function toBounds(objects: FloorObject[]): Bounds[] {
  return objects.map((o) => ({
    id: o.id,
    x: o.x,
    y: o.y,
    width: o.width,
    height: o.height,
    locked: o.locked,
  }));
}

/** Compute new x/y for selected objects after an align action. Locked objects stay put. */
export function computeAlign(
  objects: FloorObject[],
  action: AlignAction,
  grid: GridSize = 'medium'
): Record<string, { x: number; y: number }> {
  const gridSize = gridPixelSize(grid);
  const items = toBounds(objects).filter((b) => !b.locked);
  if (items.length < 1) return {};

  const minX = Math.min(...items.map((b) => b.x));
  const maxX = Math.max(...items.map((b) => b.x + b.width));
  const minY = Math.min(...items.map((b) => b.y));
  const maxY = Math.max(...items.map((b) => b.y + b.height));
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const next: Record<string, { x: number; y: number }> = {};

  if (action === 'left') {
    items.forEach((b) => {
      next[b.id] = { x: minX, y: b.y };
    });
    return next;
  }
  if (action === 'right') {
    items.forEach((b) => {
      next[b.id] = { x: maxX - b.width, y: b.y };
    });
    return next;
  }
  if (action === 'center') {
    items.forEach((b) => {
      next[b.id] = { x: midX - b.width / 2, y: b.y };
    });
    return next;
  }
  if (action === 'top') {
    items.forEach((b) => {
      next[b.id] = { x: b.x, y: minY };
    });
    return next;
  }
  if (action === 'bottom') {
    items.forEach((b) => {
      next[b.id] = { x: b.x, y: maxY - b.height };
    });
    return next;
  }
  if (action === 'middle') {
    items.forEach((b) => {
      next[b.id] = { x: b.x, y: midY - b.height / 2 };
    });
    return next;
  }

  if (action === 'distributeH' && items.length >= 3) {
    const sorted = [...items].sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const span = last.x + last.width - first.x;
    const totalW = sorted.reduce((s, b) => s + b.width, 0);
    const gap = (span - totalW) / (sorted.length - 1);
    let cursor = first.x;
    sorted.forEach((b, i) => {
      if (i === 0) {
        next[b.id] = { x: b.x, y: b.y };
        cursor = b.x + b.width + gap;
        return;
      }
      if (i === sorted.length - 1) {
        next[b.id] = { x: b.x, y: b.y };
        return;
      }
      next[b.id] = { x: cursor, y: b.y };
      cursor += b.width + gap;
    });
    return next;
  }

  if (action === 'distributeV' && items.length >= 3) {
    const sorted = [...items].sort((a, b) => a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const span = last.y + last.height - first.y;
    const totalH = sorted.reduce((s, b) => s + b.height, 0);
    const gap = (span - totalH) / (sorted.length - 1);
    let cursor = first.y;
    sorted.forEach((b, i) => {
      if (i === 0) {
        next[b.id] = { x: b.x, y: b.y };
        cursor = b.y + b.height + gap;
        return;
      }
      if (i === sorted.length - 1) {
        next[b.id] = { x: b.x, y: b.y };
        return;
      }
      next[b.id] = { x: b.x, y: cursor };
      cursor += b.height + gap;
    });
    return next;
  }

  // Auto: snap to grid + cluster into shared rows / columns
  const threshold = Math.max(gridSize * 1.5, 28);
  const snap = (v: number) => Math.round(v / gridSize) * gridSize;

  items.forEach((b) => {
    next[b.id] = { x: snap(b.x), y: snap(b.y) };
  });

  // Cluster by Y (rows)
  const byY = [...items].sort((a, b) => a.y - b.y);
  let rowY = snap(byY[0].y);
  let lastY = byY[0].y;
  byY.forEach((b, i) => {
    if (i === 0 || Math.abs(b.y - lastY) > threshold) {
      rowY = snap(b.y);
    }
    lastY = b.y;
    next[b.id] = { ...next[b.id], y: rowY };
  });

  // Cluster by X (columns)
  const byX = [...items].sort((a, b) => a.x - b.x);
  let colX = snap(byX[0].x);
  let lastX = byX[0].x;
  byX.forEach((b, i) => {
    if (i === 0 || Math.abs(b.x - lastX) > threshold) {
      colX = snap(b.x);
    }
    lastX = b.x;
    next[b.id] = { ...next[b.id], x: colX };
  });

  return next;
}
