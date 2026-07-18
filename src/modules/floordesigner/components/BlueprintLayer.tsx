import React, { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type { LayoutBlueprint } from '../types';

type Props = {
  blueprint: LayoutBlueprint;
};

export function BlueprintLayer({ blueprint }: Props) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!blueprint?.url) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = blueprint.url;
  }, [blueprint?.url]);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={blueprint.x}
      y={blueprint.y}
      width={blueprint.width}
      height={blueprint.height}
      opacity={blueprint.opacity}
      listening={!blueprint.locked}
      perfectDrawEnabled={false}
    />
  );
}
