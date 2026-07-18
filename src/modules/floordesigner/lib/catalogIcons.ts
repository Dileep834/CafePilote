import {
  Armchair,
  ArrowUpDown,
  AppWindow,
  Circle as CircleIcon,
  Coffee,
  Columns3,
  ConciergeBell,
  CookingPot,
  DoorOpen,
  Fence,
  Flower2,
  Image as ImageIcon,
  LayoutGrid,
  QrCode,
  Square,
  Store,
  Table2,
  Trees,
  Type,
  Users,
  UtensilsCrossed,
  Warehouse,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ObjectKind } from '../types';

/** Lucide product icons for the component library */
export const CATALOG_ICONS: Partial<Record<ObjectKind, LucideIcon>> = {
  square_table: Square,
  round_table: CircleIcon,
  rectangle_table: Table2,
  family_table: Users,
  bar_table: ConciergeBell,
  outdoor_table: Trees,
  chair: Armchair,
  sofa: Armchair,
  bench: Fence,
  wall: Columns3,
  door: DoorOpen,
  window: AppWindow,
  pillar: Columns3,
  kitchen: CookingPot,
  coffee_counter: Coffee,
  billing_counter: Store,
  bakery_display: UtensilsCrossed,
  pickup_counter: ConciergeBell,
  washroom: Waves,
  lift: Warehouse,
  stairs: ArrowUpDown,
  garden: Trees,
  plant: Flower2,
  waiting_area: Users,
  text_label: Type,
  image: ImageIcon,
  qr_marker: QrCode,
};

export function getCatalogIcon(kind: ObjectKind): LucideIcon {
  return CATALOG_ICONS[kind] || LayoutGrid;
}
