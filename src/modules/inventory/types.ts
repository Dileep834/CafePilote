export type StockStatus = 'Healthy' | 'Low' | 'Critical' | 'Out of Stock' | 'Expiring' | 'Not Counted';

export type StockTypeFilter = 'all' | 'raw_material' | 'ready_product';

export type StatusFilter = 'all' | StockStatus;

export interface InventoryItem {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  supplier: string;
  quantity: number;
  unit: string;
  minStock: number;
  maxStock: number;
  status: StockStatus;
  item_type: string;
  unitCost: number;
  stockValue: number;
  updatedAt: string | null;
  imageUrl?: string | null;
}

export interface InventoryKpis {
  inventoryValue: number;
  valueChangePct: number | null;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  todayConsumptionValue: number | null;
  pendingPurchaseOrders: number;
}

export interface InventoryHealth {
  healthy: number;
  low: number;
  critical: number;
  expiring: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface InventoryFilters {
  search: string;
  category: string;
  supplier: string;
  status: StatusFilter;
  stockType: StockTypeFilter;
  dateFrom: string;
}
