import { supabase } from '@/lib/supabase';
import type { InventoryMovementType } from '../types';

export type LedgerWriteInput = {
  outletId: string;
  productId: string;
  movementType: InventoryMovementType;
  quantityDelta: number;
  referenceType?: string;
  referenceId?: string | null;
  notes?: string;
  createdBy?: string | null;
};

export type StockMutationResult = {
  productId: string;
  before: number;
  after: number;
  delta: number;
};

/**
 * Atomically (best-effort) adjust inventory and write ledger row.
 * Returns null if inventory table unavailable.
 */
export async function applyInventoryDelta(
  input: LedgerWriteInput
): Promise<StockMutationResult | null> {
  const { data: invData, error: readErr } = await supabase
    .from('inventory')
    .select('current_quantity')
    .eq('outlet_id', input.outletId)
    .eq('product_id', input.productId)
    .maybeSingle();

  if (readErr) {
    console.warn('[inventory] read failed', readErr.message);
  }

  const before = invData ? Number(invData.current_quantity) : 0;
  const after = before + input.quantityDelta;

  const { error: upsertErr } = await supabase.from('inventory').upsert(
    {
      outlet_id: input.outletId,
      product_id: input.productId,
      current_quantity: after,
    },
    { onConflict: 'outlet_id, product_id' }
  );

  if (upsertErr) {
    console.warn('[inventory] upsert failed', upsertErr.message);
    throw new Error(upsertErr.message || 'Inventory update failed');
  }

  try {
    await supabase.from('inventory_transactions').insert([
      {
        outlet_id: input.outletId,
        product_id: input.productId,
        movement_type: input.movementType,
        quantity_delta: input.quantityDelta,
        quantity_before: before,
        quantity_after: after,
        reference_type: input.referenceType || null,
        reference_id: input.referenceId || null,
        notes: input.notes || null,
        created_by: input.createdBy || null,
      },
    ]);
  } catch (err) {
    console.warn('[inventory] ledger insert skipped', err);
  }

  return { productId: input.productId, before, after, delta: input.quantityDelta };
}

export async function getStockLevels(
  outletId: string,
  productIds: string[]
): Promise<Record<string, number>> {
  if (!productIds.length) return {};
  const { data, error } = await supabase
    .from('inventory')
    .select('product_id, current_quantity')
    .eq('outlet_id', outletId)
    .in('product_id', productIds);

  if (error) {
    console.warn('[inventory] stock levels', error.message);
    return {};
  }

  const map: Record<string, number> = {};
  for (const row of data || []) {
    map[row.product_id] = Number(row.current_quantity);
  }
  return map;
}
