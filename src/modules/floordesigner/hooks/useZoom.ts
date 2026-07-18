import { useCallback } from 'react';
import { useFloorStore } from '../store/floorStore';

export function useZoom(containerRef: React.RefObject<HTMLDivElement | null>) {
  const viewport = useFloorStore((s) => s.layout?.viewport);
  const setViewport = useFloorStore((s) => s.setViewport);
  const fitView = useFloorStore((s) => s.fitView);

  const zoomBy = useCallback(
    (factor: number, center?: { x: number; y: number }) => {
      if (!viewport) return;
      const next = Math.min(4, Math.max(0.15, viewport.scale * factor));
      if (!center) {
        setViewport({ scale: next });
        return;
      }
      const worldX = (center.x - viewport.x) / viewport.scale;
      const worldY = (center.y - viewport.y) / viewport.scale;
      setViewport({
        scale: next,
        x: center.x - worldX * next,
        y: center.y - worldY * next,
      });
    },
    [viewport, setViewport]
  );

  const zoomIn = () => zoomBy(1.15);
  const zoomOut = () => zoomBy(1 / 1.15);

  const fit = () => {
    const el = containerRef.current;
    if (!el) return;
    fitView(el.clientWidth, el.clientHeight);
  };

  return { zoomIn, zoomOut, zoomBy, fit, scale: viewport?.scale ?? 1 };
}
