import { useEffect, useCallback } from 'react';
import { useFloorStore } from '../store/floorStore';

export function useKeyboard() {
  const mode = useFloorStore((s) => s.mode);
  const tool = useFloorStore((s) => s.tool);
  const setTool = useFloorStore((s) => s.setTool);
  const undo = useFloorStore((s) => s.undo);
  const redo = useFloorStore((s) => s.redo);
  const deleteSelected = useFloorStore((s) => s.deleteSelected);
  const copySelected = useFloorStore((s) => s.copySelected);
  const pasteClipboard = useFloorStore((s) => s.pasteClipboard);
  const duplicateSelected = useFloorStore((s) => s.duplicateSelected);
  const alignSelected = useFloorStore((s) => s.alignSelected);
  const save = useFloorStore((s) => s.save);
  const clearSelection = useFloorStore((s) => s.clearSelection);
  const select = useFloorStore((s) => s.select);
  const layout = useFloorStore((s) => s.layout);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (meta && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
        return;
      }
      if (meta && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }
      if (meta && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (layout) select(layout.objects.map((o) => o.id));
        return;
      }
      if (e.key === 'Escape') {
        if (tool === 'pan') {
          setTool('select');
          return;
        }
        clearSelection();
        return;
      }
      if (mode === 'preview') return;

      if (!meta && e.key.toLowerCase() === 'v') {
        setTool('select');
        return;
      }
      if (!meta && e.key.toLowerCase() === 'h') {
        setTool(tool === 'pan' ? 'select' : 'pan');
        return;
      }
      if (!meta && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        alignSelected('auto');
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    },
    [
      mode,
      tool,
      setTool,
      undo,
      redo,
      deleteSelected,
      copySelected,
      pasteClipboard,
      duplicateSelected,
      alignSelected,
      save,
      clearSelection,
      select,
      layout,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);
}
