import type { PurchaseOrder } from '../store/usePurchaseStore';
import type { Supplier } from '../store/usePurchaseStore';
import type { ChartPoint } from '@/modules/inventory/types';

export type OutstandingFilter = 'all' | 'with' | 'none';
export type StatusFilter = 'all' | 'active' | 'inactive';

export type SupplierFilters = {
  search: string;
  category: string;
  status: StatusFilter;
  outstanding: OutstandingFilter;
  city: string;
};

export const DEFAULT_SUPPLIER_FILTERS: SupplierFilters = {
  search: '',
  category: 'all',
  status: 'all',
  outstanding: 'all',
  city: 'all',
};

export type SupplierRow = Supplier & {
  city: string;
  totalPurchases: number;
  orderCount: number;
  outstanding: number;
  avgDeliveryDays: number | null;
  lastOrderAt: string | null;
};

export type SupplierKpis = {
  total: number;
  active: number;
  categories: number;
  outstandingTotal: number;
  ordersThisMonth: number;
};

/** Best-effort city from a free-text address (last comma segment). */
export function extractCity(address?: string | null): string {
  if (!address?.trim()) return '';
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  const last = parts[parts.length - 1];
  // Drop trailing postal codes like "110001" or "MH 400001"
  const cleaned = last.replace(/\b\d{5,6}\b/g, '').trim();
  return cleaned || last;
}

export function buildSupplierRows(suppliers: Supplier[], orders: PurchaseOrder[]): SupplierRow[] {
  type Acc = {
    totalPurchases: number;
    orderCount: number;
    outstanding: number;
    lastOrderAt: string | null;
    deliverySamples: number[];
  };
  const map = new Map<string, Acc>();

  for (const po of orders) {
    if (!po.supplier_id || po.status === 'Cancelled') continue;
    if (!map.has(po.supplier_id)) {
      map.set(po.supplier_id, {
        totalPurchases: 0,
        orderCount: 0,
        outstanding: 0,
        lastOrderAt: null,
        deliverySamples: [],
      });
    }
    const row = map.get(po.supplier_id)!;
    row.orderCount += 1;
    row.totalPurchases += Number(po.total_amount || 0);
    if (po.status !== 'Received') row.outstanding += Number(po.total_amount || 0);
    const created = po.created_at || '';
    if (!row.lastOrderAt || created > row.lastOrderAt) row.lastOrderAt = created;
    if (po.status === 'Received' && po.expected_date && po.created_at) {
      const createdDate = new Date(po.created_at.slice(0, 10));
      const expected = new Date(po.expected_date);
      const days = Math.max(0, Math.round((expected.getTime() - createdDate.getTime()) / 86400000));
      row.deliverySamples.push(days);
    }
  }

  return suppliers.map((s) => {
    const stats = map.get(s.id);
    const samples = stats?.deliverySamples || [];
    return {
      ...s,
      city: extractCity(s.address),
      totalPurchases: stats?.totalPurchases || 0,
      orderCount: stats?.orderCount || 0,
      outstanding: stats?.outstanding || 0,
      avgDeliveryDays:
        samples.length > 0
          ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
          : null,
      lastOrderAt: stats?.lastOrderAt || null,
    };
  });
}

export function filterSupplierRows(rows: SupplierRow[], filters: SupplierFilters): SupplierRow[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((s) => {
    if (q) {
      const hay = `${s.name} ${s.category || ''} ${s.contact_name || ''} ${s.phone || ''} ${s.address || ''} ${s.city}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.category !== 'all' && (s.category || 'General') !== filters.category) return false;
    if (filters.status === 'active' && !s.is_active) return false;
    if (filters.status === 'inactive' && s.is_active) return false;
    if (filters.outstanding === 'with' && s.outstanding <= 0) return false;
    if (filters.outstanding === 'none' && s.outstanding > 0) return false;
    if (filters.city !== 'all' && s.city !== filters.city) return false;
    return true;
  });
}

export function computeSupplierKpis(rows: SupplierRow[], orders: PurchaseOrder[]): SupplierKpis {
  const month = new Date().toISOString().slice(0, 7);
  return {
    total: rows.length,
    active: rows.filter((r) => r.is_active).length,
    categories: new Set(rows.map((r) => r.category || 'General')).size,
    outstandingTotal: rows.reduce((sum, r) => sum + r.outstanding, 0),
    ordersThisMonth: orders.filter(
      (o) => o.status !== 'Cancelled' && (o.created_at || '').startsWith(month)
    ).length,
  };
}

export function buildPerformanceChart(rows: SupplierRow[]): ChartPoint[] {
  return [...rows]
    .filter((r) => r.totalPurchases > 0)
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 8)
    .map((r) => ({ label: r.name, value: r.totalPurchases }));
}

export function uniqueCities(rows: SupplierRow[]) {
  return Array.from(new Set(rows.map((r) => r.city).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function uniqueCategories(rows: SupplierRow[]) {
  return Array.from(new Set(rows.map((r) => r.category || 'General'))).sort((a, b) =>
    a.localeCompare(b)
  );
}
