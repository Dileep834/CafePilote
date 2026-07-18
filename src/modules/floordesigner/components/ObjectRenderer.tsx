import React from 'react';
import { Text, Group } from 'react-konva';
import type { FloorObject } from '../types';
import { TABLE_STATUS_COLORS, type CanvasTableStatus } from '../types';
import { BRAND } from '@/constants';
import { ProductIconShape } from './ProductIconShape';
import { useTableStore } from '@/modules/tables/store/useTableStore';

type Props = {
  object: FloorObject;
  status?: CanvasTableStatus;
  selected?: boolean;
  preview?: boolean;
  draggable?: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
  onTransformEnd?: (
    id: string,
    attrs: { x: number; y: number; width: number; height: number; rotation: number }
  ) => void;
};

export function ObjectRenderer({
  object: o,
  status,
  selected,
  preview,
  draggable,
  onSelect,
  onDragEnd,
  onContextMenu,
}: Props) {
  const linkedTable = useTableStore((s) =>
    o.linkedTableId ? s.tables.find((t) => t.id === o.linkedTableId) : undefined
  );

  if (!o.visible) return null;

  const fill =
    o.linkedTableId && status
      ? TABLE_STATUS_COLORS[status]
      : o.color === 'transparent'
        ? 'rgba(0,0,0,0)'
        : o.kind.includes('table')
          ? BRAND.orange
          : o.color;

  const stroke = selected ? BRAND.orange : o.borderColor;
  const strokeWidth = selected ? Math.max(o.borderWidth, 2.5) : o.borderWidth;

  const common = {
    id: o.id,
    name: o.id,
    x: o.x,
    y: o.y,
    rotation: o.rotation,
    opacity: o.opacity,
    draggable: draggable && !o.locked && !preview,
    onClick: (e: any) => {
      e.cancelBubble = true;
      onSelect(o.id, e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey);
    },
    onTap: (e: any) => {
      e.cancelBubble = true;
      onSelect(o.id, false);
    },
    onDragEnd: (e: any) => {
      onDragEnd(o.id, e.target.x(), e.target.y());
    },
    onContextMenu: (e: any) => {
      e.evt.preventDefault();
      onContextMenu(o.id, e.evt.clientX, e.evt.clientY);
    },
  };

  const label =
    linkedTable?.tableNumber ||
    o.tableNumber ||
    (o.kind === 'text_label' ? o.text : null) ||
    (o.category === 'structure' && !o.kind.includes('table') ? shortLabel(o.kind) : null);

  const pulse = status === 'occupied' || status === 'billing';
  const seatCount = Math.max(
    0,
    Number(o.capacity ?? linkedTable?.capacity) || (o.kind.includes('table') ? 4 : 0)
  );

  return (
    <Group {...common}>
      <ProductIconShape
        kind={o.kind}
        width={o.width}
        height={o.height}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        selected={selected}
        pulse={pulse}
        chairLayout={o.chairLayout || (o.kind.includes('table') ? 'front_back' : undefined)}
        capacity={seatCount}
      />
      {label && (
        <Text
          text={label}
          width={o.width}
          height={o.height}
          align="center"
          verticalAlign="middle"
          fontSize={o.fontSize || (linkedTable?.tableNumber || o.tableNumber ? 13 : 10)}
          fontStyle="bold"
          fill={o.linkedTableId && status ? '#fff' : BRAND.navy}
          listening={false}
        />
      )}
    </Group>
  );
}

function shortLabel(kind: string) {
  const map: Record<string, string> = {
    kitchen: 'Kitchen',
    coffee_counter: 'Coffee',
    billing_counter: 'Bill',
    bakery_display: 'Bakery',
    pickup_counter: 'Pickup',
    washroom: 'WC',
    lift: 'Lift',
    stairs: 'Stairs',
    garden: 'Garden',
    waiting_area: 'Wait',
  };
  return map[kind] || null;
}
