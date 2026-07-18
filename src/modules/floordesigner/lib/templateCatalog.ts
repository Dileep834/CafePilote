import type { FloorObject } from '../types/Object';
import type { FloorLayoutDocument, FloorSize } from '../types/Layout';
import { emptyLayout } from '../types/Layout';
import { buildSampleCafeLayout, SAMPLE_TABLE_SPECS } from './sampleLayout';

export type FloorPlanTemplateId =
  | 'tpl-cafe-standard'
  | 'tpl-cafe-compact'
  | 'tpl-cafe-bar'
  | 'tpl-cafe-patio';

export type FloorPlanTemplateMeta = {
  id: FloorPlanTemplateId;
  slug: string;
  name: string;
  description: string;
  category: 'cafe' | 'bar' | 'patio' | 'fast_casual' | 'custom';
  tableCount: number;
  seats: number;
  previewHint: string;
  sortOrder: number;
};

export type TemplateTableSpec = {
  tableNumber: string;
  capacity: number;
  type: 'square' | 'round' | 'sofa';
};

type BuiltTemplate = {
  meta: FloorPlanTemplateMeta;
  tableSpecs: TemplateTableSpec[];
  build: (
    floorId: string,
    outletId: string,
    linkByNumber: Record<string, string>
  ) => FloorLayoutDocument;
};

function baseObj(
  partial: Partial<FloorObject> &
    Pick<FloorObject, 'id' | 'name' | 'kind' | 'category' | 'x' | 'y' | 'width' | 'height'>
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

function wall(id: string, name: string, x: number, y: number, w: number, h: number): FloorObject {
  return baseObj({
    id,
    name,
    category: 'structure',
    kind: 'wall',
    x,
    y,
    width: w,
    height: h,
    color: '#94A3B8',
    borderColor: '#64748B',
    layer: 0,
  });
}

function finishLayout(
  floorId: string,
  outletId: string,
  floorSize: FloorSize,
  objects: FloorObject[],
  scale = 0.95
): FloorLayoutDocument {
  const base = emptyLayout(floorId, outletId);
  return {
    ...base,
    floorSize: { ...floorSize },
    viewport: { x: 24, y: 24, scale },
    grid: { size: 'medium', snap: true, visible: true },
    objects,
    updatedAt: new Date().toISOString(),
  };
}

function buildCompact(
  floorId: string,
  outletId: string,
  linkByNumber: Record<string, string>
): FloorLayoutDocument {
  const floorSize: FloorSize = { widthM: 8, heightM: 7, pixelsPerMeter: 50 };
  const tables: Array<{
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
  }> = [
    {
      id: 'c-t01',
      kind: 'square_table',
      tableNumber: 'T-01',
      capacity: 4,
      x: 50,
      y: 70,
      width: 90,
      height: 90,
      chairLayout: 'all',
      tableShape: 'square',
    },
    {
      id: 'c-t02',
      kind: 'square_table',
      tableNumber: 'T-02',
      capacity: 4,
      x: 180,
      y: 70,
      width: 90,
      height: 90,
      chairLayout: 'all',
      tableShape: 'square',
    },
    {
      id: 'c-t03',
      kind: 'round_table',
      tableNumber: 'T-03',
      capacity: 2,
      x: 50,
      y: 200,
      width: 72,
      height: 72,
      chairLayout: 'all',
      tableShape: 'round',
    },
    {
      id: 'c-t04',
      kind: 'round_table',
      tableNumber: 'T-04',
      capacity: 2,
      x: 180,
      y: 200,
      width: 72,
      height: 72,
      chairLayout: 'all',
      tableShape: 'round',
    },
  ];

  const structures = [
    wall('c-wall-n', 'Front wall', 20, 20, 340, 14),
    wall('c-wall-w', 'Side wall', 20, 20, 14, 320),
    baseObj({
      id: 'c-counter',
      name: 'Counter',
      category: 'structure',
      kind: 'coffee_counter',
      x: 80,
      y: 300,
      width: 180,
      height: 48,
      color: '#FF6A00',
      borderColor: '#0D1B2A',
      layer: 2,
    }),
  ];

  const tableObjs = tables.map((t, i) =>
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

  return finishLayout(floorId, outletId, floorSize, [...structures, ...tableObjs], 1.05);
}

function buildBar(
  floorId: string,
  outletId: string,
  linkByNumber: Record<string, string>
): FloorLayoutDocument {
  const floorSize: FloorSize = { widthM: 10, heightM: 8, pixelsPerMeter: 50 };
  const tables = [
    {
      id: 'b-t01',
      kind: 'bar_table' as const,
      tableNumber: 'T-01',
      capacity: 2,
      x: 60,
      y: 280,
      width: 56,
      height: 56,
      chairLayout: 'sides' as const,
      tableShape: 'bar' as const,
    },
    {
      id: 'b-t02',
      kind: 'bar_table' as const,
      tableNumber: 'T-02',
      capacity: 2,
      x: 140,
      y: 280,
      width: 56,
      height: 56,
      chairLayout: 'sides' as const,
      tableShape: 'bar' as const,
    },
    {
      id: 'b-t03',
      kind: 'bar_table' as const,
      tableNumber: 'T-03',
      capacity: 2,
      x: 220,
      y: 280,
      width: 56,
      height: 56,
      chairLayout: 'sides' as const,
      tableShape: 'bar' as const,
    },
    {
      id: 'b-t04',
      kind: 'round_table' as const,
      tableNumber: 'T-04',
      capacity: 4,
      x: 80,
      y: 80,
      width: 96,
      height: 96,
      chairLayout: 'all' as const,
      tableShape: 'round' as const,
    },
    {
      id: 'b-t05',
      kind: 'round_table' as const,
      tableNumber: 'T-05',
      capacity: 4,
      x: 220,
      y: 80,
      width: 96,
      height: 96,
      chairLayout: 'all' as const,
      tableShape: 'round' as const,
    },
    {
      id: 'b-t06',
      kind: 'family_table' as const,
      tableNumber: 'T-06',
      capacity: 4,
      x: 360,
      y: 100,
      width: 110,
      height: 70,
      chairLayout: 'front_back' as const,
      tableShape: 'sofa' as const,
    },
  ];

  const structures = [
    wall('b-wall-n', 'Front wall', 20, 20, 460, 14),
    baseObj({
      id: 'b-bar',
      name: 'Bar counter',
      category: 'structure',
      kind: 'coffee_counter',
      x: 40,
      y: 360,
      width: 320,
      height: 56,
      color: '#0D1B2A',
      borderColor: '#FF6A00',
      layer: 2,
    }),
  ];

  const tableObjs = tables.map((t, i) =>
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

  return finishLayout(floorId, outletId, floorSize, [...structures, ...tableObjs]);
}

function buildPatio(
  floorId: string,
  outletId: string,
  linkByNumber: Record<string, string>
): FloorLayoutDocument {
  const floorSize: FloorSize = { widthM: 14, heightM: 10, pixelsPerMeter: 45 };
  const tables = [
    {
      id: 'p-t01',
      kind: 'rectangle_table' as const,
      tableNumber: 'T-01',
      capacity: 4,
      x: 50,
      y: 60,
      width: 120,
      height: 70,
      chairLayout: 'front_back' as const,
      tableShape: 'rectangle' as const,
    },
    {
      id: 'p-t02',
      kind: 'rectangle_table' as const,
      tableNumber: 'T-02',
      capacity: 4,
      x: 220,
      y: 60,
      width: 120,
      height: 70,
      chairLayout: 'front_back' as const,
      tableShape: 'rectangle' as const,
    },
    {
      id: 'p-t03',
      kind: 'rectangle_table' as const,
      tableNumber: 'T-03',
      capacity: 4,
      x: 390,
      y: 60,
      width: 120,
      height: 70,
      chairLayout: 'front_back' as const,
      tableShape: 'rectangle' as const,
    },
    {
      id: 'p-t04',
      kind: 'rectangle_table' as const,
      tableNumber: 'T-04',
      capacity: 4,
      x: 50,
      y: 200,
      width: 120,
      height: 70,
      chairLayout: 'front_back' as const,
      tableShape: 'rectangle' as const,
    },
    {
      id: 'p-t05',
      kind: 'rectangle_table' as const,
      tableNumber: 'T-05',
      capacity: 4,
      x: 220,
      y: 200,
      width: 120,
      height: 70,
      chairLayout: 'front_back' as const,
      tableShape: 'rectangle' as const,
    },
    {
      id: 'p-t06',
      kind: 'rectangle_table' as const,
      tableNumber: 'T-06',
      capacity: 4,
      x: 390,
      y: 200,
      width: 120,
      height: 70,
      chairLayout: 'front_back' as const,
      tableShape: 'rectangle' as const,
    },
  ];

  const structures = [
    wall('p-wall-n', 'Planter edge', 20, 20, 560, 12),
    baseObj({
      id: 'p-plant-1',
      name: 'Planter',
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
    baseObj({
      id: 'p-plant-2',
      name: 'Planter',
      category: 'decoration',
      kind: 'plant',
      x: 540,
      y: 280,
      width: 40,
      height: 40,
      color: '#66BB6A',
      borderColor: '#2E7D32',
      layer: 4,
    }),
  ];

  const tableObjs = tables.map((t, i) =>
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

  return finishLayout(floorId, outletId, floorSize, [...structures, ...tableObjs], 0.9);
}

const BUILTIN: BuiltTemplate[] = [
  {
    meta: {
      id: 'tpl-cafe-standard',
      slug: 'cafe_standard',
      name: 'Standard Café',
      description: '8 tables, counter, entrance — classic café floor',
      category: 'cafe',
      tableCount: 8,
      seats: 32,
      previewHint: '12×10 m · 8 tables',
      sortOrder: 10,
    },
    tableSpecs: SAMPLE_TABLE_SPECS,
    build: buildSampleCafeLayout,
  },
  {
    meta: {
      id: 'tpl-cafe-compact',
      slug: 'cafe_compact',
      name: 'Compact Café',
      description: '4 tables for small shops / kiosks',
      category: 'cafe',
      tableCount: 4,
      seats: 12,
      previewHint: '8×7 m · 4 tables',
      sortOrder: 20,
    },
    tableSpecs: [
      { tableNumber: 'T-01', capacity: 4, type: 'square' },
      { tableNumber: 'T-02', capacity: 4, type: 'square' },
      { tableNumber: 'T-03', capacity: 2, type: 'round' },
      { tableNumber: 'T-04', capacity: 2, type: 'round' },
    ],
    build: buildCompact,
  },
  {
    meta: {
      id: 'tpl-cafe-bar',
      slug: 'cafe_bar',
      name: 'Bar & High Seating',
      description: 'Bar counter with high stools and lounge tables',
      category: 'bar',
      tableCount: 6,
      seats: 18,
      previewHint: '10×8 m · bar + lounge',
      sortOrder: 30,
    },
    tableSpecs: [
      { tableNumber: 'T-01', capacity: 2, type: 'square' },
      { tableNumber: 'T-02', capacity: 2, type: 'square' },
      { tableNumber: 'T-03', capacity: 2, type: 'square' },
      { tableNumber: 'T-04', capacity: 4, type: 'round' },
      { tableNumber: 'T-05', capacity: 4, type: 'round' },
      { tableNumber: 'T-06', capacity: 4, type: 'sofa' },
    ],
    build: buildBar,
  },
  {
    meta: {
      id: 'tpl-cafe-patio',
      slug: 'cafe_patio',
      name: 'Patio / Outdoor',
      description: 'Open layout with outdoor-style seating rows',
      category: 'patio',
      tableCount: 6,
      seats: 24,
      previewHint: '14×10 m · patio rows',
      sortOrder: 40,
    },
    tableSpecs: [
      { tableNumber: 'T-01', capacity: 4, type: 'square' },
      { tableNumber: 'T-02', capacity: 4, type: 'square' },
      { tableNumber: 'T-03', capacity: 4, type: 'square' },
      { tableNumber: 'T-04', capacity: 4, type: 'square' },
      { tableNumber: 'T-05', capacity: 4, type: 'square' },
      { tableNumber: 'T-06', capacity: 4, type: 'square' },
    ],
    build: buildPatio,
  },
];

export function listBuiltinFloorPlanTemplates(): FloorPlanTemplateMeta[] {
  return BUILTIN.map((t) => t.meta).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getBuiltinTemplate(id: string): BuiltTemplate | undefined {
  return BUILTIN.find((t) => t.meta.id === id || t.meta.slug === id);
}

export function buildLayoutFromTemplate(
  templateId: string,
  floorId: string,
  outletId: string,
  linkByNumber: Record<string, string>
): FloorLayoutDocument | null {
  const tpl = getBuiltinTemplate(templateId);
  if (!tpl) return null;
  return tpl.build(floorId, outletId, linkByNumber);
}

export function getTemplateTableSpecs(templateId: string): TemplateTableSpec[] {
  return getBuiltinTemplate(templateId)?.tableSpecs || [];
}
