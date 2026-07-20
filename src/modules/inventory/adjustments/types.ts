export type AdjustmentStatus = 'pending' | 'approved' | 'rejected';

export type AdjustmentType = 'increase' | 'decrease';

export type AdjustmentReason =
  | 'Stock Count'
  | 'Transfer In'
  | 'Transfer Out'
  | 'Damage'
  | 'Theft / Loss'
  | 'Found Stock'
  | 'Manual Correction'
  | 'Other';

export type AdjustmentQuickFilter =
  | 'all'
  | 'increase'
  | 'decrease'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'today'
  | 'this_week';

export type AdjustmentFilters = {
  search: string;
  category: string;
  adjustmentType: 'all' | AdjustmentType;
  reason: string;
  status: 'all' | AdjustmentStatus;
  employee: string;
  dateFrom: string;
  dateTo: string;
};

export type AdjustmentProductOption = {
  id: string;
  name: string;
  unit: string;
  category: string;
  currentStock: number;
};

export type AdjustmentRow = {
  id: string;
  date: string;
  createdAt: string | null;
  productId: string;
  productName: string;
  category: string;
  unit: string;
  previousStock: number;
  adjustment: number;
  newStock: number;
  adjustmentType: AdjustmentType;
  reason: string;
  notes: string;
  status: AdjustmentStatus;
  employee: string;
  approvedBy: string;
  franchiseId: string;
};

export type AdjustmentKpis = {
  todaysCount: number;
  inventoryIncreased: number;
  inventoryReduced: number;
  pendingApprovals: number;
  lastAdjustmentAt: string | null;
};

export type AdjustmentChartPoint = { label: string; value: number };

export const ADJUSTMENT_REASONS: AdjustmentReason[] = [
  'Stock Count',
  'Transfer In',
  'Transfer Out',
  'Damage',
  'Theft / Loss',
  'Found Stock',
  'Manual Correction',
  'Other',
];

export const DEFAULT_ADJUSTMENT_FILTERS: AdjustmentFilters = {
  search: '',
  category: 'all',
  adjustmentType: 'all',
  reason: 'all',
  status: 'all',
  employee: 'all',
  dateFrom: '',
  dateTo: '',
};

export const META_MARKER = '\n<!--ADJ_META:';
export const META_END = '-->';
