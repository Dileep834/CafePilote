import type { RoleType, InventoryStatusType } from '../constants';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  outletId?: string;
  companyId: string;
  isActive: boolean;
}

export interface Outlet {
  id: string;
  name: string;
  location: string;
  ownerId?: string;
  companyId: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  companyId: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  companyId: string;
  brand: string;
  unit: string;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  gst: number;
  barcode: string;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  productId: string;
  outletId: string;
  currentQuantity: number;
  unit: string;
  lastUpdated: string;
}

export interface DailyInventory {
  id: string;
  date: string;
  outletId: string;
  productId: string;
  openingStock: number;
  purchase: number;
  consumption: number;
  waste: number;
  closingStock: number;
  status: InventoryStatusType;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';
export type TableType = 'square' | 'round' | 'sofa';

export interface Table {
  id: string;
  outletId: string;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  type: TableType;
  qrCodeToken?: string;
  currentOrderId?: string;
}

export type OrderStatus = 'pending_approval' | 'in_kitchen' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  outletId: string;
  tableId?: string; // If placed from a table
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  source: 'pos' | 'qr'; // Whether placed by staff or customer self-order
}
