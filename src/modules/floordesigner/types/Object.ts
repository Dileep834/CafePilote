/** Canvas object categories & base transform model */

export type ObjectCategory = 'furniture' | 'structure' | 'decoration' | 'marker';

export type ObjectKind =
  | 'square_table'
  | 'round_table'
  | 'rectangle_table'
  | 'family_table'
  | 'bar_table'
  | 'outdoor_table'
  | 'chair'
  | 'sofa'
  | 'bench'
  | 'wall'
  | 'door'
  | 'window'
  | 'pillar'
  | 'kitchen'
  | 'coffee_counter'
  | 'billing_counter'
  | 'bakery_display'
  | 'pickup_counter'
  | 'washroom'
  | 'lift'
  | 'stairs'
  | 'garden'
  | 'plant'
  | 'waiting_area'
  | 'text_label'
  | 'image'
  | 'qr_marker';

export interface FloorObjectBase {
  id: string;
  name: string;
  category: ObjectCategory;
  kind: ObjectKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** Higher draws on top */
  layer: number;
  groupId?: string;
}

export type FloorObject = FloorObjectBase & {
  /** Table-linked objects */
  linkedTableId?: string;
  tableNumber?: string;
  capacity?: number;
  tableShape?: 'square' | 'round' | 'rectangle' | 'sofa' | 'bar';
  /**
   * Where chair icons sit around the table (top-down).
   * front_back = top + bottom only (no left/right sides)
   */
  chairLayout?: 'all' | 'front_back' | 'sides' | 'none';
  zone?: string;
  reservationEnabled?: boolean;
  qrEnabled?: boolean;
  assignedWaiter?: string;
  /** Text / image extras */
  text?: string;
  fontSize?: number;
  imageUrl?: string;
};

/** Display-only canvas status (live data comes from dining tables) */
export type CanvasTableStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'billing'
  | 'cleaning'
  | 'disabled'
  | 'selected';
