import { useFloorStore } from '../store/floorStore';

export { useKeyboard } from './useKeyboard';
export { useZoom } from './useZoom';

export function useSelection() {
  const selectedIds = useFloorStore((s) => s.selectedIds);
  const select = useFloorStore((s) => s.select);
  const clearSelection = useFloorStore((s) => s.clearSelection);
  return { selectedIds, select, clearSelection };
}

export function useHistory() {
  const undo = useFloorStore((s) => s.undo);
  const redo = useFloorStore((s) => s.redo);
  const pushHistory = useFloorStore((s) => s.pushHistory);
  return { undo, redo, pushHistory };
}

export function useCanvas() {
  const layout = useFloorStore((s) => s.layout);
  const mode = useFloorStore((s) => s.mode);
  const setViewport = useFloorStore((s) => s.setViewport);
  return { layout, mode, setViewport };
}
