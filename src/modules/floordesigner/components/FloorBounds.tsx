import React from 'react';
import { Layer, Rect, Text } from 'react-konva';
import { BRAND } from '@/constants';
import { floorSizeToPixels, type FloorSize } from '../types/Layout';

type Props = {
  floorSize: FloorSize;
  scale: number;
};

/** Visible floor plan rectangle (layout bounds in meters) */
export function FloorBounds({ floorSize, scale }: Props) {
  const { width, height } = floorSizeToPixels(floorSize);
  const label = `${floorSize.widthM} × ${floorSize.heightM} m`;

  return (
    <Layer listening={false}>
      {/* Dim outside — soft frame via stroke only; fill marks the usable floor */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="rgba(255,255,255,0.55)"
        stroke={BRAND.navy}
        strokeWidth={2 / scale}
        dash={[8 / scale, 6 / scale]}
        listening={false}
      />
      <Text
        x={8}
        y={8}
        text={label}
        fontSize={Math.max(11, 12 / scale)}
        fontStyle="bold"
        fill={BRAND.navy}
        opacity={0.55}
        listening={false}
      />
    </Layer>
  );
}
