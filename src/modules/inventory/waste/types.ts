export type WasteStatus = 'pending' | 'approved' | 'rejected';

export type WasteReason =
  | 'Expired'
  | 'Damaged'
  | 'Spoiled'
  | 'Spillage'
  | 'Overproduction'
  | 'Prep Error'
  | 'Customer Return'
  | 'Theft / Loss'
  | 'Other';

export type WasteQuickFilter =
  | 'all'
  | 'today'
  | 'this_week'
  | 'expired'
  | 'damaged'
  | 'pending';

export type WasteFilters = {
  search: string;
  category: string;
  supplier: string;
  reason: string;
  employee: string;
  dateFrom: string;
  dateTo: string;
  status: 'all' | WasteStatus;
};

export type WasteProductOption = {
  id: string;
  name: string;
  unit: string;
  category: string;
  supplier: string;
  purchasePrice: number;
  currentStock: number;
};

export type WasteLogRow = {
  id: string;
  date: string;
  createdAt: string | null;
  productId: string;
  productName: string;
  category: string;
  supplier: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalLoss: number;
  reason: WasteReason | string;
  notes: string;
  status: WasteStatus;
  loggedBy: string;
  approvedBy: string;
  imageUrl: string;
  franchiseId: string;
};

export type WasteKpis = {
  wasteValue: number;
  entriesToday: number;
  highestWasteProduct: string;
  highestWasteQty: number;
  wastePercentage: number | null;
  pendingApprovals: number;
};

export type WasteChartPoint = {
  label: string;
  value: number;
};

export const WASTE_REASONS: WasteReason[] = [
  'Expired',
  'Damaged',
  'Spoiled',
  'Spillage',
  'Overproduction',
  'Prep Error',
  'Customer Return',
  'Theft / Loss',
  'Other',
];

export const DEFAULT_WASTE_FILTERS: WasteFilters = {
  search: '',
  category: 'all',
  supplier: 'all',
  reason: 'all',
  employee: 'all',
  dateFrom: '',
  dateTo: '',
  status: 'all',
};

export const META_MARKER = '\n<!--WASTE_META:';
export const META_END = '-->';
