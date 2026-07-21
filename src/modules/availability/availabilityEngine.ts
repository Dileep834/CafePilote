import { pushAppNotification } from '@/modules/ops';
import { supabase } from '@/lib/supabase';
import { getStockLevels } from '@/modules/ops/services/inventoryLedgerService';
import { loadAvailabilityPolicy } from './policyService';
import { getAvailableServings } from './recipeServingsService';
import { loadProductAvailabilityState, logAvailabilityChange } from './manualOverrideService';
import type { ProductAvailabilityStatus } from './types';

function stockBasedStatus(qty: number, minStock: number, thresholdPct: number): ProductAvailabilityStatus {
  if (qty <= 0) return 'out_of_stock';
  const lowAt = minStock > 0 ? minStock : qty * (thresholdPct / 100);
  return qty <= lowAt ? 'low_stock' : 'available';
}

async function deriveComputedStatus(params: {
  outletId: string;
  productId: string;
  minStock: number;
  itemType: string;
  policyThresholdPct: number;
  policyServings: number;
}): Promise<{ status: ProductAvailabilityStatus; availableServings: number | null; lowStockAt: number | null }> {
  const servings = await getAvailableServings(params.outletId, params.productId);
  if (servings !== null) {
    if (servings <= 0) return { status: 'out_of_stock', availableServings: servings, lowStockAt: params.policyServings };
    if (servings <= params.policyServings) {
      return { status: 'low_stock', availableServings: servings, lowStockAt: params.policyServings };
    }
    return { status: 'available', availableServings: servings, lowStockAt: params.policyServings };
  }

  const levels = await getStockLevels(params.outletId, [params.productId]);
  const qty = Number(levels[params.productId] || 0);
  return {
    status: stockBasedStatus(qty, params.minStock, params.policyThresholdPct),
    availableServings: null,
    lowStockAt: params.minStock > 0 ? params.minStock : null,
  };
}

export async function recalculateProductAvailability(params: {
  outletId: string | null | undefined;
  productIds: string[];
  source?: 'automatic' | 'sale' | 'refund' | 'purchase' | 'adjustment' | 'transfer' | 'waste' | 'recipe_update' | 'opening' | 'system';
  userId?: string | null;
}): Promise<void> {
  if (!params.outletId || params.productIds.length === 0) return;

  const outletId = params.outletId;
  const policy = await loadAvailabilityPolicy(outletId);
  if (!policy.inventoryTrackingEnabled) return;

  const { data: products } = await supabase
    .from('products')
    .select('id, name, min_stock, item_type, is_active')
    .in('id', params.productIds);

  const current = await loadProductAvailabilityState(outletId, params.productIds);

  for (const product of products || []) {
    const productId = String((product as { id?: string }).id || '');
    if (!productId) continue;

    const derived = await deriveComputedStatus({
      outletId,
      productId,
      minStock: Number((product as { min_stock?: number }).min_stock || 0),
      itemType: String((product as { item_type?: string }).item_type || ''),
      policyThresholdPct: policy.lowStockThresholdPct,
      policyServings: policy.lowStockServings,
    });

    let effectiveStatus: ProductAvailabilityStatus =
      derived.status === 'out_of_stock' && policy.availabilityMode === 'hide'
        ? 'hidden'
        : derived.status;

    if ((product as { is_active?: boolean }).is_active === false) {
      effectiveStatus = 'inactive';
    }

    const prev = current.get(productId);
    await supabase.from('product_outlet_availability').upsert(
      {
        outlet_id: outletId,
        product_id: productId,
        computed_status: derived.status,
        effective_status: effectiveStatus,
        available_servings: derived.availableServings,
        low_stock_at: derived.lowStockAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'outlet_id,product_id' }
    );

    if (!prev || prev.effectiveStatus !== effectiveStatus) {
      await logAvailabilityChange({
        outletId,
        productId,
        oldStatus: prev?.effectiveStatus || null,
        newStatus: effectiveStatus,
        reason: 'Availability recalculated',
        source: params.source || 'automatic',
        userId: params.userId || null,
      });

      if (policy.autoNotify) {
        await pushAppNotification({
          outletId,
          userId: params.userId || null,
          kind: effectiveStatus === 'available' ? 'product_restored' : 'product_unavailable',
          title: effectiveStatus === 'available' ? 'Product restored' : 'Product availability changed',
          body: `${String((product as { name?: string }).name || 'Product')} is now ${effectiveStatus.replace(/_/g, ' ')}.`,
          entityType: 'product',
          entityId: productId,
          severity: effectiveStatus === 'available' ? 'info' : effectiveStatus === 'low_stock' ? 'warn' : 'critical',
        });
      }
    }
  }
}
