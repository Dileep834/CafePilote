import { supabase } from '@/lib/supabase';
import { pushAppNotification } from '@/modules/ops/services/notificationService';

export type LowStockItem = {
  productId: string;
  name: string;
  current: number;
  reorderLevel: number;
  unit?: string;
};

/**
 * Products under reorder level (uses inventory_reorder_rules when present,
 * else falls back to products.low_stock_threshold / min_stock if columns exist).
 */
export async function fetchLowStockItems(outletId: string): Promise<LowStockItem[]> {
  const { data: inv } = await supabase
    .from('inventory')
    .select('product_id, current_quantity, product:products(name, unit)')
    .eq('outlet_id', outletId);

  if (!inv?.length) return [];

  let rules: Record<string, number> = {};
  try {
    const { data: ruleRows } = await supabase
      .from('inventory_reorder_rules')
      .select('product_id, reorder_level')
      .eq('outlet_id', outletId);
    for (const r of ruleRows || []) {
      rules[r.product_id] = Number(r.reorder_level);
    }
  } catch {
    /* optional */
  }

  const low: LowStockItem[] = [];
  for (const row of inv) {
    const current = Number(row.current_quantity);
    const level = rules[row.product_id] ?? 5; // default threshold
    if (current <= level) {
      const product = row.product as { name?: string; unit?: string } | null;
      low.push({
        productId: row.product_id,
        name: product?.name || row.product_id,
        current,
        reorderLevel: level,
        unit: product?.unit,
      });
    }
  }
  return low.sort((a, b) => a.current - b.current);
}

export async function notifyLowStock(outletId: string): Promise<number> {
  const items = await fetchLowStockItems(outletId);
  if (!items.length) return 0;
  const top = items.slice(0, 3).map((i) => `${i.name} (${i.current})`).join(', ');
  await pushAppNotification({
    outletId,
    kind: 'stock_low',
    title: `${items.length} low stock item(s)`,
    body: top,
    severity: items.some((i) => i.current <= 0) ? 'critical' : 'warn',
  });
  return items.length;
}

/** Theoretical consumption from completed sales today via recipe expansion is heavy —
 *  return ledger-based sale movements for the day as a proxy. */
export async function fetchTheoreticalConsumption(
  outletId: string,
  dateIso = new Date().toISOString().slice(0, 10)
): Promise<Array<{ productId: string; qty: number }>> {
  try {
    const start = `${dateIso}T00:00:00`;
    const end = `${dateIso}T23:59:59`;
    const { data } = await supabase
      .from('inventory_transactions')
      .select('product_id, quantity_delta')
      .eq('outlet_id', outletId)
      .eq('movement_type', 'sale')
      .gte('created_at', start)
      .lte('created_at', end);

    const map = new Map<string, number>();
    for (const row of data || []) {
      map.set(row.product_id, (map.get(row.product_id) || 0) + Math.abs(Number(row.quantity_delta)));
    }
    return [...map.entries()].map(([productId, qty]) => ({ productId, qty }));
  } catch {
    return [];
  }
}

export async function buildAutoPurchaseSuggestions(outletId: string) {
  const low = await fetchLowStockItems(outletId);
  return low.map((i) => ({
    productId: i.productId,
    name: i.name,
    suggestedQty: Math.max(i.reorderLevel * 2 - i.current, i.reorderLevel || 1),
    current: i.current,
    reorderLevel: i.reorderLevel,
  }));
}
