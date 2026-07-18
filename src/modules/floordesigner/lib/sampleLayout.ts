import type { FloorObject } from '../types/Object';
import type { FloorLayoutDocument, FloorSize } from '../types/Layout';
import { emptyLayout } from '../types/Layout';

const SAMPLE_FLOOR_SIZE: FloorSize = {
  widthM: 12,
  heightM: 10,
  pixelsPerMeter: 50,
};

type SampleTable = {
  id: string;
  kind: FloorObject['kind'];
  tableNumber: string;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  chairLayout: NonNullable<FloorObject['chairLayout']>;
  tableShape: FloorObject['tableShape'];
};

/** Demo café: two table rows + counter + soft walls */
const SAMPLE_TABLES: SampleTable[] = [
  // Left row
  { id: 'sample-t01', kind: 'rectangle_table', tableNumber: 'T-01', capacity: 4, x: 60, y: 80, width: 120, height: 72, chairLayout: 'front_back', tableShape: 'rectangle' },
  { id: 'sample-t02', kind: 'rectangle_table', tableNumber: 'T-02', capacity: 4, x: 60, y: 190, width: 120, height: 72, chairLayout: 'front_back', tableShape: 'rectangle' },
  { id: 'sample-t03', kind: 'rectangle_table', tableNumber: 'T-03', capacity: 4, x: 60, y: 300, width: 120, height: 72, chairLayout: 'front_back', tableShape: 'rectangle' },
  // Middle
  { id: 'sample-t04', kind: 'round_table', tableNumber: 'T-04', capacity: 4, x: 240, y: 100, width: 96, height: 96, chairLayout: 'all', tableShape: 'round' },
  { id: 'sample-t05', kind: 'round_table', tableNumber: 'T-05', capacity: 2, x: 240, y: 240, width: 80, height: 80, chairLayout: 'all', tableShape: 'round' },
  { id: 'sample-t06', kind: 'family_table', tableNumber: 'T-06', capacity: 8, x: 380, y: 90, width: 150, height: 88, chairLayout: 'front_back', tableShape: 'rectangle' },
  // Right
  { id: 'sample-t07', kind: 'square_table', tableNumber: 'T-07', capacity: 4, x: 420, y: 230, width: 90, height: 90, chairLayout: 'all', tableShape: 'square' },
  { id: 'sample-t08', kind: 'bar_table', tableNumber: 'T-08', capacity: 2, x: 520, y: 340, width: 64, height: 64, chairLayout: 'sides', tableShape: 'bar' },
];

function baseObj(
  partial: Partial<FloorObject> & Pick<FloorObject, 'id' | 'name' | 'kind' | 'category' | 'x' | 'y' | 'width' | 'height'>
): FloorObject {
  return {
    rotation: 0,
    color: '#FF6A00',
    borderColor: '#0D1B2A',
    borderWidth: 2,
    opacity: 1,
    visible: true,
    locked: false,
    layer: 1,
    ...partial,
  };
}

/**
 * Build a ready-to-use sample café layout.
 * `linkByNumber` maps tableNumber → dining_tables.id
 */
export function buildSampleCafeLayout(
  floorId: string,
  outletId: string,
  linkByNumber: Record<string, string>
): FloorLayoutDocument {
  const base = emptyLayout(floorId, outletId);
  const structures: FloorObject[] = [
    baseObj({
      id: 'sample-wall-n',
      name: 'Front wall',
      category: 'structure',
      kind: 'wall',
      x: 20,
      y: 20,
      width: 560,
      height: 16,
      color: '#94A3B8',
      borderColor: '#64748B',
      layer: 0,
    }),
    baseObj({
      id: 'sample-wall-w',
      name: 'Side wall',
      category: 'structure',
      kind: 'wall',
      x: 20,
      y: 20,
      width: 16,
      height: 460,
      color: '#94A3B8',
      borderColor: '#64748B',
      layer: 0,
    }),
    baseObj({
      id: 'sample-counter',
      name: 'Coffee counter',
      category: 'structure',
      kind: 'coffee_counter',
      x: 200,
      y: 400,
      width: 220,
      height: 64,
      color: '#FF6A00',
      borderColor: '#0D1B2A',
      layer: 2,
    }),
    baseObj({
      id: 'sample-door',
      name: 'Entrance',
      category: 'structure',
      kind: 'door',
      x: 260,
      y: 12,
      width: 56,
      height: 28,
      color: '#CBD5E1',
      borderColor: '#0D1B2A',
      layer: 3,
    }),
    baseObj({
      id: 'sample-plant',
      name: 'Plant',
      category: 'decoration',
      kind: 'plant',
      x: 540,
      y: 40,
      width: 40,
      height: 40,
      color: '#66BB6A',
      borderColor: '#2E7D32',
      layer: 4,
    }),
  ];

  const tables: FloorObject[] = SAMPLE_TABLES.map((t, i) =>
    baseObj({
      id: t.id,
      name: t.tableNumber,
      category: 'furniture',
      kind: t.kind,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      layer: 10 + i,
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      chairLayout: t.chairLayout,
      tableShape: t.tableShape,
      linkedTableId: linkByNumber[t.tableNumber],
      reservationEnabled: true,
      qrEnabled: true,
    })
  );

  return {
    ...base,
    floorSize: { ...SAMPLE_FLOOR_SIZE },
    viewport: { x: 24, y: 24, scale: 0.95 },
    grid: { size: 'medium', snap: true, visible: true },
    objects: [...structures, ...tables],
    updatedAt: new Date().toISOString(),
  };
}

export const SAMPLE_TABLE_SPECS = SAMPLE_TABLES.map((t) => ({
  tableNumber: t.tableNumber,
  capacity: t.capacity,
  type: (t.tableShape === 'round' ? 'round' : t.tableShape === 'sofa' ? 'sofa' : 'square') as
    | 'square'
    | 'round'
    | 'sofa',
}));

/** Re-link floor table shapes to dining_tables by matching table numbers */
export function repairLinksByTableNumber(
  objects: FloorObject[],
  tables: { id: string; tableNumber: string; capacity: number; outletId: string }[],
  outletId: string
): { objects: FloorObject[]; repaired: number } {
  const outletTables = tables.filter(
    (t) => t.outletId === outletId || t.outletId === 'current-outlet'
  );
  const byNumber = new Map(
    outletTables.map((t) => [t.tableNumber.trim().toUpperCase(), t] as const)
  );
  const used = new Set<string>();
  let repaired = 0;

  const next = objects.map((o) => {
    if (!o.kind.includes('table')) return o;

    // Valid existing link
    if (o.linkedTableId) {
      const hit = outletTables.find((t) => t.id === o.linkedTableId);
      if (hit && !used.has(hit.id)) {
        used.add(hit.id);
        if (o.tableNumber !== hit.tableNumber || o.name !== hit.tableNumber) {
          repaired += 1;
          return {
            ...o,
            tableNumber: hit.tableNumber,
            name: hit.tableNumber,
            capacity: o.capacity || hit.capacity,
          };
        }
        return o;
      }
      // Broken id — fall through to number match
    }

    const num = (o.tableNumber || '').trim().toUpperCase();
    if (!num) return { ...o, linkedTableId: undefined };

    const match = byNumber.get(num);
    if (match && !used.has(match.id)) {
      used.add(match.id);
      repaired += 1;
      return {
        ...o,
        linkedTableId: match.id,
        tableNumber: match.tableNumber,
        name: match.tableNumber,
        capacity: o.capacity || match.capacity,
      };
    }

    if (o.linkedTableId) {
      repaired += 1;
      return { ...o, linkedTableId: undefined };
    }
    return o;
  });

  return { objects: next, repaired };
}
