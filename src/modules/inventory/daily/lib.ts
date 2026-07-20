import { InventoryStatus } from '@/constants';
import type {
  DailyQuickFilter,
  DailyStockDraft,
  DailyStockFilters,
  DailyStockRow,
  EditableField,
  StatusFilter,
  StockTypeFilter,
} from './types';

export const DRAFT_PREFIX = 'cafepilots_daily_stock_draft:';
export const DRAFT_SAVE_MS = 400;
export const SEARCH_DEBOUNCE_MS = 200;

export const DEFAULT_DAILY_FILTERS: DailyStockFilters = {
  search: '',
  category: 'all',
  supplier: 'all',
  status: 'all',
  stockType: 'all',
  dateFrom: '',
  outletId: '',
};

export function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function draftKey(outletId: string, dateStr: string) {
  return `${DRAFT_PREFIX}${outletId}:${dateStr}`;
}

export function calcClosing(
  opening: number,
  purchase: number,
  consumption: number,
  waste: number
) {
  return Number(opening) + Number(purchase) - Number(consumption) - Number(waste);
}

export function isProductUpdated(row: DailyStockRow) {
  return (
    row.markedComplete ||
    Number(row.purchase) > 0 ||
    Number(row.consumption) > 0 ||
    Number(row.waste) > 0 ||
    row.status === InventoryStatus.SUBMITTED
  );
}

export function isLowStock(row: DailyStockRow) {
  const qty = Number(row.closingStock);
  return qty > 0 && row.minStock > 0 && qty <= row.minStock;
}

export function isOutOfStock(row: DailyStockRow) {
  return Number(row.closingStock) <= 0;
}

export function loadDraft(outletId: string, dateStr: string): DailyStockDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(outletId, dateStr));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyStockDraft;
    if (!parsed?.outletId || !parsed?.date || !Array.isArray(parsed.entries)) return null;
    if (parsed.outletId !== outletId || parsed.date !== dateStr) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(outletId: string, dateStr: string, rows: DailyStockRow[]) {
  const draft: DailyStockDraft = {
    outletId,
    date: dateStr,
    savedAt: new Date().toISOString(),
    entries: rows
      .filter(
        (r) =>
          r.markedComplete ||
          r.purchase > 0 ||
          r.consumption > 0 ||
          r.waste > 0
      )
      .map((r) => ({
        product_id: r.product_id,
        purchase: r.purchase,
        consumption: r.consumption,
        waste: r.waste,
        closingStock: r.closingStock,
        markedComplete: r.markedComplete,
      })),
  };
  localStorage.setItem(draftKey(outletId, dateStr), JSON.stringify(draft));
  return draft;
}

export function clearDraft(outletId: string, dateStr: string) {
  localStorage.removeItem(draftKey(outletId, dateStr));
}

export function applyDraftToRows(rows: DailyStockRow[], draft: DailyStockDraft): DailyStockRow[] {
  const byProduct = new Map(draft.entries.map((e) => [e.product_id, e]));
  return rows.map((row) => {
    const entry = byProduct.get(row.product_id);
    if (!entry) return row;
    const purchase = entry.purchase;
    const consumption = entry.consumption;
    const waste = entry.waste;
    return {
      ...row,
      purchase,
      consumption,
      waste,
      closingStock: calcClosing(row.openingStock, purchase, consumption, waste),
      markedComplete: Boolean(entry.markedComplete),
      editState: 'edited' as const,
      status: InventoryStatus.IN_PROGRESS,
    };
  });
}

export function withFieldChange(
  row: DailyStockRow,
  field: EditableField,
  value: number
): DailyStockRow {
  const next = { ...row, [field]: value };
  next.closingStock = calcClosing(next.openingStock, next.purchase, next.consumption, next.waste);
  const changed =
    next.purchase !== row.baseline.purchase ||
    next.consumption !== row.baseline.consumption ||
    next.waste !== row.baseline.waste ||
    next.markedComplete;
  next.editState = changed ? 'edited' : 'clean';
  return next;
}

export function normalizeItemType(raw: unknown): 'raw_material' | 'ready_product' {
  const t = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (
    !t ||
    t === 'raw_material' ||
    t === 'raw' ||
    t === 'ingredient' ||
    t === 'ingredients' ||
    t === 'rm'
  ) {
    return 'raw_material';
  }

  if (
    t === 'ready_product' ||
    t === 'ready' ||
    t === 'finished' ||
    t === 'finished_good' ||
    t === 'finished_goods' ||
    t === 'menu' ||
    t === 'sellable' ||
    t === 'product' ||
    t === 'fg'
  ) {
    return 'ready_product';
  }

  // Unknown values: treat non-raw labels as sellable/ready so filters still work
  return 'ready_product';
}

export function matchesSearch(row: DailyStockRow, needle: string) {
  if (!needle) return true;
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  return (
    row.productName.toLowerCase().includes(q) ||
    row.productCode.toLowerCase().includes(q) ||
    row.barcode.toLowerCase().includes(q) ||
    row.alias.toLowerCase().includes(q)
  );
}

export function matchesStockType(row: DailyStockRow, stockType: StockTypeFilter) {
  if (stockType === 'all') return true;
  return normalizeItemType(row.item_type) === stockType;
}

export function matchesStatusFilter(row: DailyStockRow, status: StatusFilter) {
  if (status === 'all') return true;
  if (status === 'Low') return isLowStock(row);
  if (status === 'Out of Stock') return isOutOfStock(row);
  if (status === 'Not Counted') return !isProductUpdated(row);
  if (status === 'Critical') {
    return isLowStock(row) && Number(row.closingStock) <= row.minStock * 0.35;
  }
  if (status === 'Healthy') {
    return !isLowStock(row) && !isOutOfStock(row);
  }
  if (status === 'Expiring') return false;
  return true;
}

export function matchesQuickFilter(row: DailyStockRow, chip: DailyQuickFilter) {
  switch (chip) {
    case 'all':
      return true;
    case 'pending':
      return !isProductUpdated(row);
    case 'updated':
      return isProductUpdated(row);
    case 'has_purchase':
      return Number(row.purchase) > 0;
    case 'has_consumption':
      return Number(row.consumption) > 0;
    case 'has_waste':
      return Number(row.waste) > 0;
    case 'low_stock':
      return isLowStock(row);
    case 'out_of_stock':
      return isOutOfStock(row);
    case 'recently_updated':
      return row.editState === 'edited' || row.editState === 'saved';
    default:
      return true;
  }
}

export function filterDailyRows(
  rows: DailyStockRow[],
  filters: DailyStockFilters,
  quick: DailyQuickFilter,
  pendingOnly: boolean,
  search: string
) {
  return rows.filter((row) => {
    if (!matchesSearch(row, search)) return false;
    if (filters.category !== 'all' && row.categoryName !== filters.category) return false;
    if (filters.supplier !== 'all' && row.supplier !== filters.supplier) return false;
    if (!matchesStockType(row, filters.stockType)) return false;
    if (!matchesStatusFilter(row, filters.status)) return false;
    if (filters.dateFrom) {
      // If a date filter is set, only keep rows updated on/after that date.
      // Rows with no timestamp stay visible so stock entry is not blocked.
      if (row.updatedAt && row.updatedAt.slice(0, 10) < filters.dateFrom) return false;
    }
    if (pendingOnly && isProductUpdated(row)) return false;
    if (!matchesQuickFilter(row, quick)) return false;
    return true;
  });
}

export function formatRelativeTime(isoOrLocale: string | null) {
  if (!isoOrLocale) return '—';
  const parsed = Date.parse(isoOrLocale);
  if (Number.isNaN(parsed)) return isoOrLocale;
  const diffSec = Math.round((Date.now() - parsed) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return new Date(parsed).toLocaleString();
}

export function formatClock(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function groupByCategory(rows: DailyStockRow[]) {
  const map = new Map<string, DailyStockRow[]>();
  for (const row of rows) {
    const key = row.categoryName || 'Uncategorized';
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return Array.from(map.entries()).map(([name, items]) => ({
    name,
    items,
    total: items.length,
    updated: items.filter(isProductUpdated).length,
    pending: items.filter((r) => !isProductUpdated(r)).length,
  }));
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
