import { supabase } from '@/lib/supabase';
import { writeAuditLog } from '@/modules/ops';
import type {
  ManualAvailabilityStatus,
  ProductAvailabilityLogEntry,
  ProductOutletAvailability,
} from './types';

export async function setManualProductAvailability(params: {
  outletId: string;
  productId: string;
  status: ManualAvailabilityStatus;
  reason?: string | null;
  validUntil?: string | null;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
}): Promise<void> {
  await supabase.from('product_outlet_availability').upsert(
    {
      outlet_id: params.outletId,
      product_id: params.productId,
      manual_status: params.status,
      manual_reason: params.reason || null,
      manual_until: params.validUntil || null,
      manual_by: params.userId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'outlet_id,product_id' }
  );

  await supabase.from('product_manual_override').insert([
    {
      outlet_id: params.outletId,
      product_id: params.productId,
      manual_status: params.status,
      reason: params.reason || null,
      valid_until: params.validUntil || null,
      created_by: params.userId || null,
    },
  ]);

  await logAvailabilityChange({
    outletId: params.outletId,
    productId: params.productId,
    newStatus: params.status,
    reason: params.reason || 'Manual override',
    source: 'manual',
    userId: params.userId || null,
  });

  await writeAuditLog({
    outletId: params.outletId,
    userId: params.userId || null,
    userName: params.userName || null,
    userRole: params.userRole || null,
    action: 'manager_override',
    entityType: 'product_availability',
    entityId: params.productId,
    newValue: { manualStatus: params.status, reason: params.reason || null, validUntil: params.validUntil || null },
    reason: params.reason || 'Manual product availability override',
  });
}

export async function clearManualProductAvailability(params: {
  outletId: string;
  productId: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
}): Promise<void> {
  await supabase.from('product_outlet_availability').upsert(
    {
      outlet_id: params.outletId,
      product_id: params.productId,
      manual_status: null,
      manual_reason: null,
      manual_until: null,
      manual_by: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'outlet_id,product_id' }
  );

  await supabase
    .from('product_manual_override')
    .update({
      cleared_at: new Date().toISOString(),
      cleared_by: params.userId || null,
    })
    .eq('outlet_id', params.outletId)
    .eq('product_id', params.productId)
    .is('cleared_at', null);

  await logAvailabilityChange({
    outletId: params.outletId,
    productId: params.productId,
    newStatus: 'available',
    reason: 'Manual override cleared',
    source: 'manual',
    userId: params.userId || null,
  });

  await writeAuditLog({
    outletId: params.outletId,
    userId: params.userId || null,
    userName: params.userName || null,
    userRole: params.userRole || null,
    action: 'manager_override',
    entityType: 'product_availability',
    entityId: params.productId,
    newValue: { manualStatus: null },
    reason: 'Manual product availability override cleared',
  });
}

export async function loadProductAvailabilityState(
  outletId: string | null | undefined,
  productIds: string[]
): Promise<Map<string, ProductOutletAvailability>> {
  const map = new Map<string, ProductOutletAvailability>();
  if (!outletId || productIds.length === 0) return map;

  try {
    // Chunk .in() to avoid PostgREST URL/size failures on large menus
    const chunkSize = 120;
    for (let i = 0; i < productIds.length; i += chunkSize) {
      const chunk = productIds.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('product_outlet_availability')
        .select('*')
        .eq('outlet_id', outletId)
        .in('product_id', chunk);

      if (error) {
        console.warn('[availability] state chunk failed', error.message);
        continue;
      }

      for (const row of data || []) {
        const productId = String((row as { product_id?: string }).product_id || '');
        if (!productId) continue;
        map.set(productId, {
          outletId: String((row as { outlet_id?: string }).outlet_id || outletId),
          productId,
          computedStatus: String(
            (row as { computed_status?: string }).computed_status || 'available'
          ) as ProductOutletAvailability['computedStatus'],
          manualStatus: ((row as { manual_status?: string | null }).manual_status ||
            null) as ProductOutletAvailability['manualStatus'],
          manualReason: (row as { manual_reason?: string | null }).manual_reason || null,
          manualUntil: (row as { manual_until?: string | null }).manual_until || null,
          manualBy: (row as { manual_by?: string | null }).manual_by || null,
          availableServings: Number((row as { available_servings?: number | null }).available_servings ?? NaN),
          lowStockAt: Number((row as { low_stock_at?: number | null }).low_stock_at ?? NaN),
          effectiveStatus: String(
            (row as { effective_status?: string }).effective_status || 'available'
          ) as ProductOutletAvailability['effectiveStatus'],
          updatedAt: (row as { updated_at?: string | null }).updated_at || null,
        });
      }
    }
  } catch {
    return map;
  }

  return map;
}

export async function logAvailabilityChange(entry: ProductAvailabilityLogEntry): Promise<void> {
  try {
    await supabase.from('product_availability_log').insert([
      {
        outlet_id: entry.outletId,
        product_id: entry.productId,
        old_status: entry.oldStatus || null,
        new_status: entry.newStatus,
        reason: entry.reason || null,
        source: entry.source,
        channel: entry.channel || null,
        user_id: entry.userId || null,
        meta: entry.meta || null,
      },
    ]);
  } catch {
    /* optional table */
  }
}
