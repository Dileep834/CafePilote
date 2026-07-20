/** Phase 3 SaaS platform types */

export type HierarchyLevel = 'corporate' | 'region' | 'city' | 'store';

export type StockTransferStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'in_transit'
  | 'received'
  | 'cancelled';

export type AccountingProvider = 'tally' | 'zoho' | 'quickbooks' | 'busy' | 'xero' | 'csv';

export type ApiScope =
  | 'orders:read'
  | 'orders:write'
  | 'products:read'
  | 'inventory:read'
  | 'inventory:write'
  | 'customers:read'
  | 'tables:read'
  | 'kitchen:read'
  | 'reports:read'
  | 'webhooks:manage';

export const DEFAULT_API_SCOPES: ApiScope[] = [
  'orders:read',
  'products:read',
  'inventory:read',
  'customers:read',
  'reports:read',
];

export type BranchComparisonRow = {
  outletId: string;
  outletName: string;
  sales: number;
  orders: number;
  avgTicket: number;
  refunds: number;
};

export type ExecutiveBiSummary = {
  todaySales: number;
  weekSales: number;
  monthSales: number;
  orderCountToday: number;
  avgTicketToday: number;
  refundsToday: number;
  topItems: Array<{ name: string; qty: number; revenue: number }>;
  hourly: Array<{ hour: number; sales: number; orders: number }>;
  branches: BranchComparisonRow[];
  foodCostEstimate: number;
  generatedAt: string;
};

export type AiAssistantReply = {
  intent: string;
  answer: string;
  data?: Record<string, unknown>;
  suggestions?: string[];
};
