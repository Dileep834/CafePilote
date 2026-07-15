import type { RoleType, InventoryStatusType } from '../constants';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  franchiseId?: string;
  companyId: string;
  isActive: boolean;
}

export interface Franchise {
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
  franchiseId: string;
  currentQuantity: number;
  unit: string;
  lastUpdated: string;
}

export interface DailyInventory {
  id: string;
  date: string;
  franchiseId: string;
  productId: string;
  openingStock: number;
  purchase: number;
  consumption: number;
  waste: number;
  closingStock: number;
  status: InventoryStatusType;
}
