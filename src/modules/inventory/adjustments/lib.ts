import { Role } from '@/constants';
import { isPlatformAdmin, isSuperAdmin } from '@/lib/access';
import type { User } from '@/types';
import type {
  AdjustmentChartPoint,
  AdjustmentFilters,
  AdjustmentKpis,
  AdjustmentQuickFilter,
  AdjustmentRow,
  AdjustmentStatus,
  AdjustmentType,
} from './types';
import { DEFAULT_ADJUSTMENT_FILTERS, META_END, META_MARKER } from './types';

export type AdjustmentMeta = {
  notes?: string;
  status?: AdjustmentStatus;
  approvedBy?: string;
  employee?: string;
  previousStock?: number;
  newStock?: number;
  adjustmentType?: AdjustmentType;
};

export function canApproveAdjustment(user?: User | null): boolean {
  if (!user) return false;
  if (isSuperAdmin(user) || isPlatformAdmin(user)) return true;
  return (
    user.role === Role.OUTLET_MANAGER ||
    user.role === Role.OUTLET_OWNER ||
    user.role === 'Outlet Manager' ||
    user.role === 'Outlet Owner'
  );
}

export function canDeleteAdjustment(user?: User | null): boolean {
  return canApproveAdjustment(user);
}

export function encodeReason(reason: string, meta: AdjustmentMeta): string {
  const payload = JSON.stringify({
    n: meta.notes || '',
    s: meta.status || 'pending',
    a: meta.approvedBy || '',
    e: meta.employee || '',
    p: meta.previousStock ?? 0,
    ns: meta.newStock ?? 0,
    t: meta.adjustmentType || 'increase',
  });
  return `${reason}${META_MARKER}${payload}${META_END}`;
}

export function decodeReason(raw: string | null | undefined): {
  reason: string;
  meta: AdjustmentMeta;
} {
  const text = String(raw || '');
  const start = text.indexOf(META_MARKER);
  if (start < 0) {
    return {
      reason: text || 'Other',
      meta: { status: 'approved', notes: '', adjustmentType: 'increase' },
    };
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
        status: (parsed.s as AdjustmentStatus) || 'pending',
        approvedBy: parsed.a || '',
        employee: parsed.e || '',
        previousStock: Number(parsed.p) || 0,
        newStock: Number(parsed.ns) || 0,
        adjustmentType: (parsed.t as AdjustmentType) || 'increase',
      },
    };
  } catch {
    return { reason, meta: { status: 'pending', notes: '' } };
  }
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

export function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function signedAdjustment(type: AdjustmentType, qty: number) {
  const abs = Math.abs(qty);
  return type === 'decrease' ? -abs : abs;
}

export function filterAdjustmentRows(
  rows: AdjustmentRow[],
  filters: AdjustmentFilters,
  quick: AdjustmentQuickFilter,
  search: string
) {
  const q = search.trim().toLowerCase();
  const today = toDateStr(new Date());
  const weekStart = startOfWeek();

  return rows.filter((row) => {
    if (q) {
      const hay = `${row.productName} ${row.category} ${row.reason} ${row.employee} ${row.notes}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.category !== 'all' && row.category !== filters.category) return false;
    if (filters.adjustmentType !== 'all' && row.adjustmentType !== filters.adjustmentType) return false;
    if (filters.reason !== 'all' && row.reason !== filters.reason) return false;
    if (filters.status !== 'all' && row.status !== filters.status) return false;
    if (filters.employee !== 'all' && row.employee !== filters.employee) return false;
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;

    if (quick === 'increase' && row.adjustmentType !== 'increase') return false;
    if (quick === 'decrease' && row.adjustmentType !== 'decrease') return false;
    if (quick === 'pending' && row.status !== 'pending') return false;
    if (quick === 'approved' && row.status !== 'approved') return false;
    if (quick === 'rejected' && row.status !== 'rejected') return false;
    if (quick === 'today' && row.date !== today) return false;
    if (quick === 'this_week') {
      const rowDate = new Date(row.date + 'T00:00:00');
      if (rowDate < weekStart) return false;
    }
    return true;
  });
}

export function computeAdjustmentKpis(rows: AdjustmentRow[]): AdjustmentKpis {
  const today = toDateStr(new Date());
  const todays = rows.filter((r) => r.date === today);
  let inventoryIncreased = 0;
  let inventoryReduced = 0;
  for (const r of rows) {
    if (r.adjustment > 0) inventoryIncreased += r.adjustment;
    if (r.adjustment < 0) inventoryReduced += Math.abs(r.adjustment);
  }
  let lastAdjustmentAt: string | null = null;
  for (const r of rows) {
    if (!r.createdAt) continue;
    if (!lastAdjustmentAt || r.createdAt > lastAdjustmentAt) lastAdjustmentAt = r.createdAt;
  }
  return {
    todaysCount: todays.length,
    inventoryIncreased,
    inventoryReduced,
    pendingApprovals: rows.filter((r) => r.status === 'pending').length,
    lastAdjustmentAt,
  };
}

export function buildTrendPoints(rows: AdjustmentRow[], days = 30): AdjustmentChartPoint[] {
  const map = new Map<string, number>();
  const today = startOfDay();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(toDateStr(d), 0);
  }
  for (const row of rows) {
    if (!map.has(row.date)) continue;
    map.set(row.date, (map.get(row.date) || 0) + Math.abs(row.adjustment));
  }
  return Array.from(map.entries()).map(([label, value]) => ({
    label: label.slice(5),
    value,
  }));
}

export function buildIncreaseDecreasePoints(rows: AdjustmentRow[]): AdjustmentChartPoint[] {
  let inc = 0;
  let dec = 0;
  for (const r of rows) {
    if (r.adjustment > 0) inc += r.adjustment;
    else dec += Math.abs(r.adjustment);
  }
  return [
    { label: 'Increase', value: inc },
    { label: 'Decrease', value: dec },
  ];
}

export function buildTopProducts(rows: AdjustmentRow[]): AdjustmentChartPoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.productName, (map.get(r.productName) || 0) + Math.abs(r.adjustment));
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function buildReasonPoints(rows: AdjustmentRow[]): AdjustmentChartPoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.reason || 'Other', (map.get(r.reason || 'Other') || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function formatRelativeTime(iso: string | null) {
  if (!iso) return '—';
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  const diffSec = Math.round((Date.now() - parsed) / 1000);
  if (diffSec < 60) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(parsed).toLocaleString();
}

export { DEFAULT_ADJUSTMENT_FILTERS };
