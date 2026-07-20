import type { PurchaseOrder } from '../store/usePurchaseStore';
import type { ChartPoint } from '@/modules/inventory/types';

export type POStatusFilter =
  | 'all'
  | 'Draft'
  | 'Pending'
  | 'Approved'
  | 'Ordered'
  | 'Received'
  | 'Cancelled'
  | 'Overdue';

export type POFilters = {
  search: string;
  supplier: string;
  status: POStatusFilter;
  outlet: string;
  expectedDate: string;
  dateFrom: string;
  dateTo: string;
};

export type LowStockSuggestion = {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  minStock: number;
  reorderQty: number;
  unitPrice: number;
  status: string;
};

export type POKpis = {
  pending: number;
  awaitingApproval: number;
  orderedToday: number;
  receivedToday: number;
  overdue: number;
};

export type SupplierSummary = {
  id: string;
  name: string;
  totalPurchases: number;
  orderCount: number;
  outstanding: number;
  avgDeliveryDays: number | null;
};

export const DEFAULT_PO_FILTERS: POFilters = {
  search: '',
  supplier: 'all',
  status: 'all',
  outlet: 'all',
  expectedDate: '',
  dateFrom: '',
  dateTo: '',
};

export const TIMELINE_STEPS = [
  'Draft',
  'Approved',
  'Sent',
  'Accepted',
  'Delivered',
  'Received',
  'Closed',
] as const;

export function toDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isOverdue(po: PurchaseOrder) {
  if (!po.expected_date) return false;
  if (po.status === 'Received' || po.status === 'Cancelled') return false;
  return po.expected_date < toDateStr();
}

export function matchesPOStatus(po: PurchaseOrder, status: POStatusFilter) {
  if (status === 'all') return true;
  if (status === 'Overdue') return isOverdue(po);
  if (status === 'Approved' || status === 'Ordered') return po.status === 'Pending';
  return po.status === status;
}

export function filterPurchaseOrders(orders: PurchaseOrder[], filters: POFilters, search: string) {
  const q = search.trim().toLowerCase();
  return orders.filter((po) => {
    if (q) {
      const hay = `${po.po_number} ${po.suppliers?.name || ''} ${po.notes || ''} ${po.status}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.supplier !== 'all' && po.supplier_id !== filters.supplier) return false;
    if (!matchesPOStatus(po, filters.status)) return false;
    if (filters.outlet !== 'all' && po.outlet_id !== filters.outlet) return false;
    if (filters.expectedDate && po.expected_date !== filters.expectedDate) return false;
    const created = (po.created_at || '').slice(0, 10);
    if (filters.dateFrom && created < filters.dateFrom) return false;
    if (filters.dateTo && created > filters.dateTo) return false;
    return true;
  });
}

export function computePOKpis(orders: PurchaseOrder[]): POKpis {
  const today = toDateStr();
  return {
    pending: orders.filter((o) => o.status === 'Pending').length,
    awaitingApproval: orders.filter((o) => o.status === 'Draft').length,
    orderedToday: orders.filter(
      (o) => (o.created_at || '').slice(0, 10) === today && (o.status === 'Pending' || o.status === 'Draft')
    ).length,
    receivedToday: orders.filter(
      (o) => o.status === 'Received' && (o.created_at || '').slice(0, 10) === today
    ).length,
    overdue: orders.filter(isOverdue).length,
  };
}

export function timelineIndex(status: PurchaseOrder['status']): number {
  if (status === 'Draft') return 0;
  if (status === 'Pending') return 2; // Sent
  if (status === 'Received') return 6; // Closed
  if (status === 'Cancelled') return -1;
  return 0;
}

export function buildPurchaseTrend(orders: PurchaseOrder[], days = 30): ChartPoint[] {
  const map = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(toDateStr(d), 0);
  }
  for (const po of orders) {
    if (po.status === 'Cancelled') continue;
    const key = (po.created_at || '').slice(0, 10);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) || 0) + Number(po.total_amount || 0));
  }
  return Array.from(map.entries()).map(([label, value]) => ({
    label: label.slice(5),
    value,
  }));
}

export function buildPurchasesBySupplier(orders: PurchaseOrder[]): ChartPoint[] {
  const map = new Map<string, number>();
  for (const po of orders) {
    if (po.status === 'Cancelled') continue;
    const name = po.suppliers?.name || 'Unknown';
    map.set(name, (map.get(name) || 0) + Number(po.total_amount || 0));
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function buildMonthlySpend(orders: PurchaseOrder[]): ChartPoint[] {
  const map = new Map<string, number>();
  for (const po of orders) {
    if (po.status === 'Cancelled') continue;
    const key = (po.created_at || '').slice(0, 7);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + Number(po.total_amount || 0));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([label, value]) => ({ label, value }));
}

export function buildSupplierSummaries(orders: PurchaseOrder[]): SupplierSummary[] {
  const map = new Map<string, SupplierSummary & { deliverySamples: number[] }>();
  for (const po of orders) {
    const id = po.supplier_id || 'unknown';
    const name = po.suppliers?.name || 'Unknown';
    if (!map.has(id)) {
      map.set(id, {
        id,
        name,
        totalPurchases: 0,
        orderCount: 0,
        outstanding: 0,
        avgDeliveryDays: null,
        deliverySamples: [],
      });
    }
    const row = map.get(id)!;
    if (po.status === 'Cancelled') continue;
    row.orderCount += 1;
    row.totalPurchases += Number(po.total_amount || 0);
    if (po.status !== 'Received') row.outstanding += Number(po.total_amount || 0);
    if (po.status === 'Received' && po.expected_date && po.created_at) {
      const created = new Date(po.created_at.slice(0, 10));
      const expected = new Date(po.expected_date);
      const days = Math.max(0, Math.round((expected.getTime() - created.getTime()) / 86400000));
      row.deliverySamples.push(days);
    }
  }
  return Array.from(map.values())
    .map(({ deliverySamples, ...rest }) => ({
      ...rest,
      avgDeliveryDays:
        deliverySamples.length > 0
          ? Math.round(deliverySamples.reduce((a, b) => a + b, 0) / deliverySamples.length)
          : null,
    }))
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 6);
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function normalizeProductName(name?: string | null) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Build smart PO line suggestions from inventory attention items. */
export function buildLowStockSuggestions(
  items: Array<{
    id: string;
    productName: string;
    unit: string;
    quantity: number;
    minStock: number;
    maxStock?: number;
    unitCost: number;
    status: string;
    item_type?: string;
  }>
): LowStockSuggestion[] {
  const attention = items.filter(
    (i) => i.status === 'Low' || i.status === 'Critical' || i.status === 'Out of Stock'
  );

  // Collapse duplicate catalog rows (same name / same id) into one suggestion line.
  const byKey = new Map<string, LowStockSuggestion>();
  const rank = (s: string) => (s === 'Out of Stock' ? 0 : s === 'Critical' ? 1 : 2);

  for (const i of attention) {
    const target = Math.max(i.minStock, i.maxStock || i.minStock || 1);
    const reorderQty = Math.max(1, Math.ceil(target - i.quantity));
    const nameKey = normalizeProductName(i.productName);
    const key = nameKey || i.id;
    const existing = byKey.get(key);

    if (existing) {
      existing.quantity += i.quantity;
      existing.minStock = Math.max(existing.minStock, i.minStock);
      existing.reorderQty += reorderQty;
      if (i.unitCost > existing.unitPrice) existing.unitPrice = i.unitCost;
      if (rank(i.status) < rank(existing.status)) existing.status = i.status;
      continue;
    }

    byKey.set(key, {
      productId: i.id,
      productName: i.productName,
      unit: i.unit,
      quantity: i.quantity,
      minStock: i.minStock,
      reorderQty,
      unitPrice: i.unitCost,
      status: i.status,
    });
  }

  return Array.from(byKey.values()).sort(
    (a, b) => rank(a.status) - rank(b.status) || a.productName.localeCompare(b.productName)
  );
}

type CatalogProduct = {
  id: string;
  name: string;
  unit?: string;
  purchase_price?: number;
};

/**
 * Map inventory suggestions onto the company product catalog used by the PO form.
 * Unmatched IDs cause the select to fall back to the first option (looks like duplicate products).
 */
export function resolveSuggestionsForCatalog(
  suggestions: LowStockSuggestion[],
  catalog: CatalogProduct[]
): {
  lines: { product_id: string; quantity: number; unit_price: number }[];
  extras: CatalogProduct[];
  resolved: LowStockSuggestion[];
} {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const byName = new Map<string, CatalogProduct>();
  for (const p of catalog) {
    const key = normalizeProductName(p.name);
    if (key && !byName.has(key)) byName.set(key, p);
  }

  const extras: CatalogProduct[] = [];
  const lines: { product_id: string; quantity: number; unit_price: number }[] = [];
  const resolved: LowStockSuggestion[] = [];

  for (const s of suggestions) {
    const nameKey = normalizeProductName(s.productName);
    let match = byId.get(s.productId) || (nameKey ? byName.get(nameKey) : undefined);

    if (!match) {
      match = {
        id: s.productId,
        name: s.productName,
        unit: s.unit,
        purchase_price: s.unitPrice,
      };
      extras.push(match);
      byId.set(match.id, match);
      if (nameKey) byName.set(nameKey, match);
    }

    const unitPrice =
      s.unitPrice > 0 ? s.unitPrice : Number(match.purchase_price || 0);

    lines.push({
      product_id: match.id,
      quantity: s.reorderQty,
      unit_price: unitPrice,
    });

    resolved.push({
      ...s,
      productId: match.id,
      productName: match.name || s.productName,
      unit: match.unit || s.unit,
      unitPrice,
    });
  }

  return {
    lines: mergeSuggestedPOLines(lines),
    extras,
    resolved,
  };
}

/** Collapse duplicate product lines before creating a PO. */
export function mergeSuggestedPOLines(
  lines: { product_id: string; quantity: number; unit_price: number }[]
) {
  const map = new Map<string, { product_id: string; quantity: number; unit_price: number }>();
  for (const line of lines) {
    if (!line.product_id) continue;
    const existing = map.get(line.product_id);
    if (existing) {
      existing.quantity += Number(line.quantity) || 0;
      if ((!existing.unit_price || existing.unit_price <= 0) && line.unit_price > 0) {
        existing.unit_price = line.unit_price;
      }
    } else {
      map.set(line.product_id, {
        product_id: line.product_id,
        quantity: Number(line.quantity) || 0,
        unit_price: Number(line.unit_price) || 0,
      });
    }
  }
  return Array.from(map.values());
}
