import React, { useMemo } from 'react';
import { Layer, Line } from 'react-konva';
import { gridPixelSize, type GridSize } from '../types';

type Props = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  size: GridSize;
  visible: boolean;
};

export function CanvasGrid({ width, height, offsetX, offsetY, scale, size, visible }: Props) {
  const lines = useMemo(() => {
    if (!visible) return [];
    const g = gridPixelSize(size);
    const worldLeft = -offsetX / scale;
    const worldTop = -offsetY / scale;
    const worldRight = (width - offsetX) / scale;
    const worldBottom = (height - offsetY) / scale;
    const startX = Math.floor(worldLeft / g) * g;
    const startY = Math.floor(worldTop / g) * g;
    const result: { points: number[]; major: boolean }[] = [];
    for (let x = startX; x <= worldRight + g; x += g) {
      result.push({
        points: [x, worldTop - g, x, worldBottom + g],
        major: Math.round(x / g) % 5 === 0,
      });
    }
    for (let y = startY; y <= worldBottom + g; y += g) {
      result.push({
        points: [worldLeft - g, y, worldRight + g, y],
        major: Math.round(y / g) % 5 === 0,
      });
    }
    return result;
  }, [width, height, offsetX, offsetY, scale, size, visible]);

  if (!visible) return null;

  return (
    <Layer listening={false}>
      {lines.map((l, i) => (
        <Line
          key={i}
          points={l.points}
          stroke={l.major ? 'rgba(13,27,42,0.08)' : 'rgba(13,27,42,0.04)'}
          strokeWidth={l.major ? 1 / scale : 0.5 / scale}
          listening={false}
        />
      ))}
    </Layer>
  );
}
