import React, { useMemo } from 'react';
import { useFloorStore } from '../store/floorStore';
import { BRAND } from '@/constants';

/** Lightweight overview — click to re-center viewport */
export function FloorMiniMap() {
  const layout = useFloorStore((s) => s.layout);
  const setViewport = useFloorStore((s) => s.setViewport);

  const bounds = useMemo(() => {
    if (!layout?.objects.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    layout.objects.forEach((o) => {
      minX = Math.min(minX, o.x);
      minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.width);
      maxY = Math.max(maxY, o.y + o.height);
    });
    return { minX, minY, maxX, maxY, w: maxX - minX || 1, h: maxY - minY || 1 };
  }, [layout]);

  if (!layout || !bounds) return null;

  const W = 140;
  const H = 96;
  const scale = Math.min(W / bounds.w, H / bounds.h) * 0.85;

  return (
    <button
      type="button"
      title="Fit to content"
      className="absolute bottom-3 right-3 z-20 rounded-xl border border-slate-200 bg-white/95 shadow-lg p-2 hidden md:block"
      onClick={() => {
        setViewport({
          scale: 1,
          x: 80 - bounds.minX,
          y: 80 - bounds.minY,
        });
      }}
    >
      <svg width={W} height={H} className="block">
        <rect width={W} height={H} fill="#F3F3F8" rx={8} />
        {layout.objects.map((o) => (
          <rect
            key={o.id}
            x={(o.x - bounds.minX) * scale + 8}
            y={(o.y - bounds.minY) * scale + 8}
            width={Math.max(2, o.width * scale)}
            height={Math.max(2, o.height * scale)}
            fill={o.linkedTableId ? BRAND.orange : BRAND.navy}
            opacity={0.7}
            rx={1}
          />
        ))}
      </svg>
    </button>
  );
}
