export type CatalogStatus =
  | 'active'
  | 'inactive'
  | 'hidden'
  | 'archived'
  | 'low_stock'
  | 'out_of_stock'
  | 'discontinued'
  | 'seasonal';

export type ProductGroupBy = 'flat' | 'category' | 'brand';

export type ProductSort =
  | 'name_asc'
  | 'name_desc'
  | 'updated_desc'
  | 'price_asc'
  | 'price_desc'
  | 'stock_asc';

export type CatalogProduct = {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  companyId?: string | null;
  brand: string;
  supplier: string;
  unit: string;
  itemType: string;
  purchasePrice: number;
  sellingPrice: number;
  minStock: number;
  stockQty: number | null;
  isActive: boolean;
  isHidden: boolean;
  isArchived: boolean;
  availabilityStatus?: CatalogStatus;
  computedAvailabilityStatus?: string | null;
  manualAvailabilityStatus?: string | null;
  availabilityReason?: string | null;
  availableServings?: number | null;
  imageUrl?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  /** Raw row for edit/save (snake_case DB fields) */
  raw: Record<string, unknown>;
};

export type CatalogCategory = {
  id: string;
  name: string;
  description: string;
  companyId?: string | null;
  productCount: number;
  isActive: boolean;
  isHidden: boolean;
  isArchived: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  raw: Record<string, unknown>;
};

export type ProductFilters = {
  search: string;
  category: string;
  brand: string;
  supplier: string;
  status: 'all' | 'active' | 'inactive' | 'out_of_stock';
  type: string;
  unit: string;
  sort: ProductSort;
  groupBy: ProductGroupBy;
};

export type CategoryFilters = {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'hidden';
  productCount: 'all' | 'empty' | 'has_products';
  sort: 'name_asc' | 'name_desc' | 'products_desc' | 'updated_desc';
};

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  search: '',
  category: 'all',
  brand: 'all',
  supplier: 'all',
  status: 'all',
  type: 'all',
  unit: 'all',
  sort: 'name_asc',
  groupBy: 'flat',
};

export const DEFAULT_CATEGORY_FILTERS: CategoryFilters = {
  search: '',
  status: 'all',
  productCount: 'all',
  sort: 'name_asc',
};
