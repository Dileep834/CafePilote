import type { FloorObject } from '../types';

let clipboard: FloorObject[] = [];

export function copyObjects(objects: FloorObject[]) {
  clipboard = objects.map((o) => ({ ...o }));
}

export function getClipboard(): FloorObject[] {
  return clipboard.map((o) => ({ ...o }));
}

export function pasteObjects(offset = 24): FloorObject[] {
  return clipboard.map((o) => ({
    ...o,
    id: `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    x: o.x + offset,
    y: o.y + offset,
    linkedTableId: undefined, // pasted tables must re-link
    name: o.name,
  }));
}

export function hasClipboard() {
  return clipboard.length > 0;
}
