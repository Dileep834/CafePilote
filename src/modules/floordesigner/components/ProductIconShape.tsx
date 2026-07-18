import React from 'react';
import { Rect, Circle, Group, Line, Arc } from 'react-konva';
import type { FloorObject, ObjectKind } from '../types';
import { BRAND } from '@/constants';

const CHAIR = '#1B263B';
const TABLE_ORANGE = BRAND.orange;
const STRUCTURE = '#1B263B';
const SOFT = '#64748B';

export type ChairLayout = NonNullable<FloorObject['chairLayout']>;
type Side = 'n' | 'e' | 's' | 'w';

function activeSides(layout: ChairLayout): Side[] {
  if (layout === 'none') return [];
  if (layout === 'front_back') return ['n', 's'];
  if (layout === 'sides') return ['e', 'w'];
  return ['n', 'e', 's', 'w'];
}

/** Split seat count across sides as evenly as possible */
function seatsPerSide(total: number, sides: Side[]): Record<Side, number> {
  const out: Record<Side, number> = { n: 0, e: 0, s: 0, w: 0 };
  if (!sides.length || total <= 0) return out;
  const base = Math.floor(total / sides.length);
  let rem = total % sides.length;
  sides.forEach((side) => {
    out[side] = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
  });
  return out;
}

function chairSizeForCount(width: number, height: number, maxOnSide: number) {
  const along = Math.max(width, height);
  const fitted = maxOnSide > 0 ? (along * 0.72) / maxOnSide - 2 : 18;
  return Math.max(8, Math.min(22, fitted, Math.min(width, height) * 0.22));
}

function anglesForLayout(layout: ChairLayout, seats: number): number[] {
  if (layout === 'none' || seats <= 0) return [];

  if (layout === 'all') {
    return Array.from({ length: seats }, (_, i) => (Math.PI * 2 * i) / seats - Math.PI / 2);
  }

  const spreadOnArc = (count: number, center: number, span = Math.PI * 0.55) => {
    if (count <= 0) return [] as number[];
    return Array.from({ length: count }, (_, i) => {
      const t = count === 1 ? 0.5 : (i + 1) / (count + 1);
      return center - span / 2 + span * t;
    });
  };

  if (layout === 'front_back') {
    const north = Math.ceil(seats / 2);
    const south = seats - north;
    return [...spreadOnArc(north, -Math.PI / 2), ...spreadOnArc(south, Math.PI / 2)];
  }

  // sides
  const west = Math.ceil(seats / 2);
  const east = seats - west;
  return [...spreadOnArc(west, Math.PI), ...spreadOnArc(east, 0)];
}

/** Top-down product icons for floor objects (CafePilots mockup style) */
export function ProductIconShape({
  kind,
  width,
  height,
  fill,
  stroke,
  strokeWidth,
  selected,
  pulse,
  chairLayout = 'front_back',
  capacity = 4,
}: {
  kind: ObjectKind;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  selected?: boolean;
  pulse?: boolean;
  chairLayout?: ChairLayout;
  /** Seat count — drives how many chair icons are drawn */
  capacity?: number;
}) {
  const tableFill = fill || TABLE_ORANGE;
  const chair = CHAIR;
  const layout = chairLayout || 'front_back';
  const seats = Math.max(0, Math.min(24, Math.round(Number(capacity) || 0)));
  const sides = activeSides(layout);
  const perSide = seatsPerSide(seats, sides);
  const maxOnSide = Math.max(0, ...Object.values(perSide));
  const hasSideChairs = perSide.e > 0 || perSide.w > 0;
  const hasFrontChairs = perSide.n > 0 || perSide.s > 0;
  const cw = chairSizeForCount(width, height, maxOnSide || 1);
  const gap = Math.max(3, cw * 0.25);
  const padX = hasSideChairs ? cw + gap : Math.max(6, gap);
  const padY = hasFrontChairs ? cw + gap : Math.max(6, gap);
  const shadow = {
    shadowEnabled: !!(selected || pulse),
    shadowBlur: selected ? 10 : pulse ? 8 : 0,
    shadowColor: pulse ? '#F43F5E' : BRAND.orange,
    shadowOpacity: 0.35,
  };

  const renderSideChairs = (side: Side, count: number) => {
    if (count <= 0) return null;
    return Array.from({ length: count }).map((_, i) => {
      const t = count === 1 ? 0.5 : (i + 1) / (count + 1);
      if (side === 'n') {
        return (
          <Rect
            key={`n-${i}`}
            x={padX + (width - padX * 2) * t - cw / 2}
            y={0}
            width={cw}
            height={cw}
            fill={chair}
            cornerRadius={3}
            listening={false}
          />
        );
      }
      if (side === 's') {
        return (
          <Rect
            key={`s-${i}`}
            x={padX + (width - padX * 2) * t - cw / 2}
            y={height - cw}
            width={cw}
            height={cw}
            fill={chair}
            cornerRadius={3}
            listening={false}
          />
        );
      }
      if (side === 'w') {
        return (
          <Rect
            key={`w-${i}`}
            x={0}
            y={padY + (height - padY * 2) * t - cw / 2}
            width={cw}
            height={cw}
            fill={chair}
            cornerRadius={3}
            listening={false}
          />
        );
      }
      return (
        <Rect
          key={`e-${i}`}
          x={width - cw}
          y={padY + (height - padY * 2) * t - cw / 2}
          width={cw}
          height={cw}
          fill={chair}
          cornerRadius={3}
          listening={false}
        />
      );
    });
  };

  if (
    kind === 'square_table' ||
    kind === 'family_table' ||
    kind === 'rectangle_table' ||
    kind === 'outdoor_table'
  ) {
    const isRound = kind === 'outdoor_table';
    const tw = width - padX * 2;
    const th = height - padY * 2;
    return (
      <Group>
        {renderSideChairs('n', perSide.n)}
        {renderSideChairs('e', perSide.e)}
        {renderSideChairs('s', perSide.s)}
        {renderSideChairs('w', perSide.w)}
        {isRound ? (
          <Circle
            x={width / 2}
            y={height / 2}
            radius={Math.min(tw, th) / 2}
            fill={tableFill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            {...shadow}
          />
        ) : (
          <Rect
            x={padX}
            y={padY}
            width={Math.max(24, tw)}
            height={Math.max(24, th)}
            fill={tableFill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            cornerRadius={6}
            {...shadow}
          />
        )}
      </Group>
    );
  }

  if (kind === 'round_table' || kind === 'bar_table') {
    const r = Math.min(width, height) / 2;
    const chairR = Math.max(4, Math.min(cw / 2, r * 0.18));
    const orbit = Math.max(r * 0.72, r - chairR - 2);
    const roundSeats = kind === 'bar_table' ? Math.min(seats, 2) || seats : seats;
    const angles = anglesForLayout(layout, roundSeats);

    return (
      <Group>
        {angles.map((a, i) => (
          <Circle
            key={i}
            x={width / 2 + Math.cos(a) * orbit}
            y={height / 2 + Math.sin(a) * orbit}
            radius={chairR}
            fill={chair}
            listening={false}
          />
        ))}
        <Circle
          x={width / 2}
          y={height / 2}
          radius={Math.max(12, r * 0.52)}
          fill={tableFill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          {...shadow}
        />
      </Group>
    );
  }

  if (kind === 'chair') {
    return (
      <Rect
        width={width}
        height={height}
        fill={chair}
        stroke={stroke}
        strokeWidth={strokeWidth}
        cornerRadius={4}
        {...shadow}
      />
    );
  }

  if (kind === 'sofa') {
    return (
      <Group>
        <Rect
          width={width}
          height={height}
          fill={STRUCTURE}
          cornerRadius={8}
          stroke={stroke}
          strokeWidth={strokeWidth}
          {...shadow}
        />
        <Rect
          x={4}
          y={4}
          width={width - 8}
          height={height * 0.35}
          fill="#334155"
          cornerRadius={4}
          listening={false}
        />
        <Rect
          x={6}
          y={height * 0.42}
          width={(width - 18) / 2}
          height={height * 0.45}
          fill="#475569"
          cornerRadius={4}
          listening={false}
        />
        <Rect
          x={width / 2 + 3}
          y={height * 0.42}
          width={(width - 18) / 2}
          height={height * 0.45}
          fill="#475569"
          cornerRadius={4}
          listening={false}
        />
      </Group>
    );
  }

  if (kind === 'bench') {
    return (
      <Rect
        width={width}
        height={height}
        fill={STRUCTURE}
        stroke={stroke}
        strokeWidth={strokeWidth}
        cornerRadius={4}
        {...shadow}
      />
    );
  }

  if (kind === 'wall') {
    return (
      <Rect
        width={width}
        height={height}
        fill={STRUCTURE}
        cornerRadius={2}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }

  if (kind === 'door') {
    return (
      <Group>
        <Rect
          width={width}
          height={height}
          fill={BRAND.orangeLight}
          stroke={BRAND.orange}
          strokeWidth={strokeWidth}
          cornerRadius={2}
        />
        <Arc
          x={0}
          y={height / 2}
          innerRadius={0}
          outerRadius={Math.min(width * 1.2, 48)}
          angle={90}
          rotation={-90}
          stroke={BRAND.orange}
          strokeWidth={1.5}
          dash={[4, 3]}
          listening={false}
        />
      </Group>
    );
  }

  if (kind === 'window') {
    return (
      <Group>
        <Rect
          width={width}
          height={height}
          fill="#BAE6FD"
          stroke="#0288D1"
          strokeWidth={strokeWidth}
          cornerRadius={2}
        />
        <Line
          points={[width / 2, 0, width / 2, height]}
          stroke="#0288D1"
          strokeWidth={1}
          listening={false}
        />
      </Group>
    );
  }

  if (kind === 'pillar') {
    return (
      <Circle
        x={width / 2}
        y={height / 2}
        radius={Math.min(width, height) / 2}
        fill={SOFT}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }

  if (
    kind === 'coffee_counter' ||
    kind === 'billing_counter' ||
    kind === 'pickup_counter' ||
    kind === 'bakery_display'
  ) {
    return (
      <Group>
        <Rect
          width={width}
          height={height}
          fill={kind === 'billing_counter' ? BRAND.orange : STRUCTURE}
          cornerRadius={6}
          stroke={stroke}
          strokeWidth={strokeWidth}
          {...shadow}
        />
        <Rect
          x={6}
          y={height * 0.25}
          width={width - 12}
          height={height * 0.5}
          fill={kind === 'billing_counter' ? '#FFB347' : '#334155'}
          cornerRadius={3}
          listening={false}
        />
      </Group>
    );
  }

  if (kind === 'kitchen') {
    return (
      <Group>
        <Rect
          width={width}
          height={height}
          fill="#FFCCBC"
          stroke="#E64A19"
          strokeWidth={strokeWidth}
          cornerRadius={8}
          {...shadow}
        />
        <Rect
          x={8}
          y={8}
          width={width * 0.4}
          height={height - 16}
          fill="#FF8A65"
          cornerRadius={4}
          listening={false}
        />
        <Circle
          x={width * 0.72}
          y={height * 0.35}
          radius={Math.min(width, height) * 0.12}
          fill="#BF360C"
          listening={false}
        />
        <Circle
          x={width * 0.72}
          y={height * 0.65}
          radius={Math.min(width, height) * 0.12}
          fill="#BF360C"
          listening={false}
        />
      </Group>
    );
  }

  if (kind === 'stairs') {
    return (
      <Group>
        <Rect
          width={width}
          height={height}
          fill="#CFD8DC"
          stroke={STRUCTURE}
          strokeWidth={strokeWidth}
          cornerRadius={4}
        />
        {[0.2, 0.4, 0.6, 0.8].map((t) => (
          <Line
            key={t}
            points={[4, height * t, width - 4, height * t]}
            stroke={STRUCTURE}
            strokeWidth={1.5}
            listening={false}
          />
        ))}
      </Group>
    );
  }

  if (kind === 'washroom' || kind === 'lift' || kind === 'waiting_area' || kind === 'garden') {
    const colors: Record<string, string> = {
      washroom: '#E1F5FE',
      lift: '#ECEFF1',
      waiting_area: '#E8EAF6',
      garden: '#A5D6A7',
    };
    return (
      <Rect
        width={width}
        height={height}
        fill={colors[kind] || fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        cornerRadius={8}
        dash={kind === 'waiting_area' ? [6, 4] : undefined}
      />
    );
  }

  if (kind === 'plant') {
    return (
      <Group>
        <Circle x={width / 2} y={height / 2} radius={Math.min(width, height) / 2} fill="#66BB6A" />
        <Circle
          x={width * 0.35}
          y={height * 0.4}
          radius={Math.min(width, height) * 0.22}
          fill="#43A047"
          listening={false}
        />
        <Circle
          x={width * 0.65}
          y={height * 0.45}
          radius={Math.min(width, height) * 0.2}
          fill="#2E7D32"
          listening={false}
        />
      </Group>
    );
  }

  if (kind === 'qr_marker') {
    return (
      <Group>
        <Rect width={width} height={height} fill="#fff" stroke={BRAND.navy} strokeWidth={2} cornerRadius={4} />
        <Rect
          x={width * 0.2}
          y={height * 0.2}
          width={width * 0.25}
          height={height * 0.25}
          fill={BRAND.navy}
          listening={false}
        />
        <Rect
          x={width * 0.55}
          y={height * 0.2}
          width={width * 0.25}
          height={height * 0.25}
          fill={BRAND.navy}
          listening={false}
        />
        <Rect
          x={width * 0.2}
          y={height * 0.55}
          width={width * 0.25}
          height={height * 0.25}
          fill={BRAND.navy}
          listening={false}
        />
        <Rect
          x={width * 0.55}
          y={height * 0.55}
          width={width * 0.12}
          height={height * 0.12}
          fill={BRAND.orange}
          listening={false}
        />
      </Group>
    );
  }

  return (
    <Rect
      width={width}
      height={height}
      fill={fill === 'transparent' ? 'rgba(0,0,0,0)' : fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      cornerRadius={8}
      {...shadow}
    />
  );
}
