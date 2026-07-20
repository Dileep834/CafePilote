import { Role } from '@/constants';
import { isPlatformAdmin, isSuperAdmin } from '@/lib/access';
import type { User } from '@/types';
import type {
  WasteChartPoint,
  WasteFilters,
  WasteKpis,
  WasteLogRow,
  WasteQuickFilter,
  WasteReason,
  WasteStatus,
} from './types';
import { DEFAULT_WASTE_FILTERS, META_END, META_MARKER, WASTE_REASONS } from './types';

export type WasteMeta = {
  notes?: string;
  status?: WasteStatus;
  approvedBy?: string;
  unitCost?: number;
  totalLoss?: number;
  imageUrl?: string;
};

export function canApproveWaste(user?: User | null): boolean {
  if (!user) return false;
  if (isSuperAdmin(user) || isPlatformAdmin(user)) return true;
  return (
    user.role === Role.OUTLET_MANAGER ||
    user.role === Role.OUTLET_OWNER ||
    user.role === 'Outlet Manager' ||
    user.role === 'Outlet Owner'
  );
}

export function canDeleteWaste(user?: User | null): boolean {
  return canApproveWaste(user);
}

export function canEditWaste(user?: User | null, row?: WasteLogRow): boolean {
  if (!user) return false;
  if (canApproveWaste(user)) return true;
  // Kitchen staff can edit their own pending entries
  if (row && row.status === 'pending' && row.loggedBy === (user.name || user.email)) return true;
  return false;
}

export function encodeReason(reason: string, meta: WasteMeta): string {
  const payload = JSON.stringify({
    n: meta.notes || '',
    s: meta.status || 'pending',
    a: meta.approvedBy || '',
    c: meta.unitCost ?? 0,
    l: meta.totalLoss ?? 0,
    i: meta.imageUrl || '',
  });
  return `${reason}${META_MARKER}${payload}${META_END}`;
}

export function decodeReason(raw: string | null | undefined): {
  reason: string;
  meta: WasteMeta;
} {
  const text = String(raw || '');
  const start = text.indexOf(META_MARKER);
  if (start < 0) {
    return { reason: text || 'Other', meta: { status: 'approved', notes: '' } };
  }
  const end = text.indexOf(META_END, start);
  const reason = text.slice(0, start).trim() || 'Other';
  const json = text.slice(start + META_MARKER.length, end >= 0 ? end : undefined);
  try {
    const parsed = JSON.parse(json);
    return {
      reason,
      meta: {
        notes: parsed.n || '',
        status: (parsed.s as WasteStatus) || 'pending',
        approvedBy: parsed.a || '',
        unitCost: Number(parsed.c) || 0,
        totalLoss: Number(parsed.l) || 0,
        imageUrl: parsed.i || '',
      },
    };
  } catch {
    return { reason, meta: { status: 'pending', notes: '' } };
  }
}

export function isWasteReason(value: string): value is WasteReason {
  return (WASTE_REASONS as string[]).includes(value);
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  x.setDate(x.getDate() - diff);
  return x;
}

export function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function filterWasteRows(
  rows: WasteLogRow[],
  filters: WasteFilters,
  quick: WasteQuickFilter,
  search: string
) {
  const q = search.trim().toLowerCase();
  const today = toDateStr(new Date());
  const weekStart = startOfWeek();

  return rows.filter((row) => {
    if (q) {
      const hay = `${row.productName} ${row.category} ${row.reason} ${row.loggedBy} ${row.notes}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.category !== 'all' && row.category !== filters.category) return false;
    if (filters.supplier !== 'all' && row.supplier !== filters.supplier) return false;
    if (filters.reason !== 'all' && row.reason !== filters.reason) return false;
    if (filters.employee !== 'all' && row.loggedBy !== filters.employee) return false;
    if (filters.status !== 'all' && row.status !== filters.status) return false;
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;

    if (quick === 'today' && row.date !== today) return false;
    if (quick === 'this_week') {
      const rowDate = new Date(row.date + 'T00:00:00');
      if (rowDate < weekStart) return false;
    }
    if (quick === 'expired' && row.reason !== 'Expired') return false;
    if (quick === 'damaged' && row.reason !== 'Damaged') return false;
    if (quick === 'pending' && row.status !== 'pending') return false;

    return true;
  });
}

export function computeWasteKpis(
  rows: WasteLogRow[],
  inventoryValue: number | null
): WasteKpis {
  const today = toDateStr(new Date());
  const entriesToday = rows.filter((r) => r.date === today).length;
  const wasteValue = rows.reduce((sum, r) => sum + (Number(r.totalLoss) || 0), 0);
  const pendingApprovals = rows.filter((r) => r.status === 'pending').length;

  const byProduct = new Map<string, number>();
  for (const r of rows) {
    byProduct.set(r.productName, (byProduct.get(r.productName) || 0) + Number(r.quantity));
  }
  let highestWasteProduct = '—';
  let highestWasteQty = 0;
  for (const [name, qty] of byProduct) {
    if (qty > highestWasteQty) {
      highestWasteQty = qty;
      highestWasteProduct = name;
    }
  }

  const wastePercentage =
    inventoryValue && inventoryValue > 0
      ? Math.round((wasteValue / inventoryValue) * 1000) / 10
      : null;

  return {
    wasteValue,
    entriesToday,
    highestWasteProduct,
    highestWasteQty,
    wastePercentage,
    pendingApprovals,
  };
}

export function buildTrendPoints(rows: WasteLogRow[], days = 30): WasteChartPoint[] {
  const map = new Map<string, number>();
  const today = startOfDay();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(toDateStr(d), 0);
  }
  for (const row of rows) {
    if (!map.has(row.date)) continue;
    map.set(row.date, (map.get(row.date) || 0) + Number(row.totalLoss || 0));
  }
  return Array.from(map.entries()).map(([label, value]) => ({
    label: label.slice(5),
    value,
  }));
}

export function buildCategoryPoints(rows: WasteLogRow[]): WasteChartPoint[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = row.category || 'Uncategorized';
    map.set(key, (map.get(key) || 0) + Number(row.totalLoss || 0));
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export { DEFAULT_WASTE_FILTERS };
