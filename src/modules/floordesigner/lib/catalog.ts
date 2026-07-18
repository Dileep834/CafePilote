import { BRAND } from '@/constants';
import type { FloorObject, ObjectCategory, ObjectKind } from '../types';

export type CatalogItem = {
  kind: ObjectKind;
  category: ObjectCategory;
  label: string;
  defaultWidth: number;
  defaultHeight: number;
  color: string;
  borderColor: string;
  /** Suggest dining table when placed */
  isTable?: boolean;
  capacity?: number;
  tableShape?: FloorObject['tableShape'];
};

export const FURNITURE_CATALOG: CatalogItem[] = [
  { kind: 'square_table', category: 'furniture', label: 'Square Table', defaultWidth: 96, defaultHeight: 96, color: '#FF6A00', borderColor: BRAND.navy, isTable: true, capacity: 4, tableShape: 'square' },
  { kind: 'round_table', category: 'furniture', label: 'Round Table', defaultWidth: 100, defaultHeight: 100, color: '#FF6A00', borderColor: BRAND.navy, isTable: true, capacity: 4, tableShape: 'round' },
  { kind: 'rectangle_table', category: 'furniture', label: 'Rectangle Table', defaultWidth: 140, defaultHeight: 80, color: '#FF6A00', borderColor: BRAND.navy, isTable: true, capacity: 6, tableShape: 'rectangle' },
  { kind: 'family_table', category: 'furniture', label: 'Family Table', defaultWidth: 160, defaultHeight: 90, color: '#FF6A00', borderColor: BRAND.navy, isTable: true, capacity: 8, tableShape: 'rectangle' },
  { kind: 'bar_table', category: 'furniture', label: 'Bar Table', defaultWidth: 72, defaultHeight: 72, color: '#FF6A00', borderColor: BRAND.steel, isTable: true, capacity: 2, tableShape: 'bar' },
  { kind: 'outdoor_table', category: 'furniture', label: 'Outdoor Table', defaultWidth: 96, defaultHeight: 96, color: '#FF6A00', borderColor: '#2E7D32', isTable: true, capacity: 4, tableShape: 'round' },
  { kind: 'chair', category: 'furniture', label: 'Chair', defaultWidth: 28, defaultHeight: 28, color: '#1B263B', borderColor: BRAND.steel },
  { kind: 'sofa', category: 'furniture', label: 'Sofa', defaultWidth: 120, defaultHeight: 48, color: '#1B263B', borderColor: BRAND.steel },
  { kind: 'bench', category: 'furniture', label: 'Bench', defaultWidth: 100, defaultHeight: 28, color: '#1B263B', borderColor: BRAND.steel },
];

export const STRUCTURE_CATALOG: CatalogItem[] = [
  { kind: 'wall', category: 'structure', label: 'Wall', defaultWidth: 200, defaultHeight: 12, color: BRAND.navy, borderColor: BRAND.navy },
  { kind: 'door', category: 'structure', label: 'Door', defaultWidth: 48, defaultHeight: 12, color: '#FFB347', borderColor: BRAND.orange },
  { kind: 'window', category: 'structure', label: 'Window', defaultWidth: 80, defaultHeight: 10, color: '#81D4FA', borderColor: '#0288D1' },
  { kind: 'pillar', category: 'structure', label: 'Pillar', defaultWidth: 36, defaultHeight: 36, color: '#78909C', borderColor: BRAND.steel },
  { kind: 'kitchen', category: 'structure', label: 'Kitchen', defaultWidth: 160, defaultHeight: 100, color: '#FFCCBC', borderColor: '#E64A19' },
  { kind: 'coffee_counter', category: 'structure', label: 'Coffee Counter', defaultWidth: 180, defaultHeight: 48, color: '#D7CCC8', borderColor: BRAND.navy },
  { kind: 'billing_counter', category: 'structure', label: 'Billing Counter', defaultWidth: 140, defaultHeight: 48, color: '#FFE0B2', borderColor: BRAND.orange },
  { kind: 'bakery_display', category: 'structure', label: 'Bakery Display', defaultWidth: 120, defaultHeight: 50, color: '#F8BBD0', borderColor: '#C2185B' },
  { kind: 'pickup_counter', category: 'structure', label: 'Pickup Counter', defaultWidth: 120, defaultHeight: 44, color: '#B2DFDB', borderColor: '#00796B' },
  { kind: 'washroom', category: 'structure', label: 'Washroom', defaultWidth: 80, defaultHeight: 80, color: '#E1F5FE', borderColor: '#0277BD' },
  { kind: 'lift', category: 'structure', label: 'Lift', defaultWidth: 56, defaultHeight: 56, color: '#ECEFF1', borderColor: BRAND.steel },
  { kind: 'stairs', category: 'structure', label: 'Stairs', defaultWidth: 80, defaultHeight: 100, color: '#CFD8DC', borderColor: BRAND.steel },
  { kind: 'garden', category: 'structure', label: 'Garden', defaultWidth: 120, defaultHeight: 80, color: '#A5D6A7', borderColor: '#388E3C' },
  { kind: 'waiting_area', category: 'structure', label: 'Waiting Area', defaultWidth: 140, defaultHeight: 80, color: '#E8EAF6', borderColor: BRAND.steel },
];

export const DECORATION_CATALOG: CatalogItem[] = [
  { kind: 'plant', category: 'decoration', label: 'Plant', defaultWidth: 32, defaultHeight: 32, color: '#66BB6A', borderColor: '#2E7D32' },
  { kind: 'text_label', category: 'decoration', label: 'Text Label', defaultWidth: 100, defaultHeight: 28, color: 'transparent', borderColor: 'transparent' },
  { kind: 'image', category: 'decoration', label: 'Image', defaultWidth: 100, defaultHeight: 100, color: '#ECEFF1', borderColor: BRAND.steel },
  { kind: 'qr_marker', category: 'marker', label: 'QR Marker', defaultWidth: 40, defaultHeight: 40, color: '#FFFFFF', borderColor: BRAND.navy },
];

export const ALL_CATALOG: CatalogItem[] = [
  ...FURNITURE_CATALOG,
  ...STRUCTURE_CATALOG,
  ...DECORATION_CATALOG,
];

export function getCatalogItem(kind: ObjectKind): CatalogItem | undefined {
  return ALL_CATALOG.find((c) => c.kind === kind);
}

export function createObjectFromCatalog(
  item: CatalogItem,
  x: number,
  y: number,
  opts?: {
    id?: string;
    name?: string;
    tableNumber?: string;
    linkedTableId?: string;
    layer?: number;
    capacity?: number;
    chairLayout?: FloorObject['chairLayout'];
  }
): FloorObject {
  const id = opts?.id || `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const capacity = opts?.capacity ?? item.capacity;
  const chairLayout =
    opts?.chairLayout ??
    (item.isTable
      ? item.kind === 'square_table' || item.kind === 'round_table' || item.kind === 'outdoor_table'
        ? 'all'
        : 'front_back'
      : undefined);
  return {
    id,
    name: opts?.name || opts?.tableNumber || item.label,
    category: item.category,
    kind: item.kind,
    x,
    y,
    width: item.defaultWidth,
    height: item.defaultHeight,
    rotation: 0,
    color: item.color,
    borderColor: item.borderColor,
    borderWidth: 2,
    opacity: 1,
    visible: true,
    locked: false,
    layer: opts?.layer ?? 1,
    linkedTableId: opts?.linkedTableId,
    tableNumber: opts?.tableNumber,
    capacity,
    tableShape: item.tableShape,
    chairLayout,
    reservationEnabled: item.isTable ? true : undefined,
    qrEnabled: item.isTable ? true : undefined,
    text: item.kind === 'text_label' ? 'Label' : undefined,
    fontSize: item.kind === 'text_label' ? 14 : undefined,
  };
}
