import type { InventoryFilters, StatusFilter, StockTypeFilter } from '../types';

export type DailyEditState = 'clean' | 'edited' | 'saved';

export type DailyQuickFilter =
  | 'all'
  | 'pending'
  | 'updated'
  | 'has_purchase'
  | 'has_consumption'
  | 'has_waste'
  | 'low_stock'
  | 'out_of_stock'
  | 'recently_updated';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'failed';

export type EditableField = 'purchase' | 'consumption' | 'waste';

export interface DailyStockRow {
  id: string;
  product_id: string;
  productName: string;
  productCode: string;
  barcode: string;
  alias: string;
  categoryName: string;
  supplier: string;
  unit: string;
  item_type: string;
  minStock: number;
  openingStock: number;
  purchase: number;
  consumption: number;
  waste: number;
  closingStock: number;
  status: string;
  date: string;
  markedComplete: boolean;
  editState: DailyEditState;
  baseline: {
    purchase: number;
    consumption: number;
    waste: number;
  };
  updatedAt: string | null;
}

export interface DailyStockFilters extends InventoryFilters {
  outletId: string;
}

export interface DailyDraftEntry {
  product_id: string;
  purchase: number;
  consumption: number;
  waste: number;
  closingStock: number;
  markedComplete?: boolean;
}

export interface DailyStockDraft {
  outletId: string;
  date: string;
  savedAt: string;
  entries: DailyDraftEntry[];
}

export type { StatusFilter, StockTypeFilter };
