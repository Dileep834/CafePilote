import { supabase } from '@/lib/supabase';
import { loadOpsSettings, saveOpsSettings } from '@/modules/ops';
import {
  DEFAULT_PRODUCT_AVAILABILITY_POLICY,
  type ProductAvailabilityPolicy,
} from './types';

function mapPolicyRow(
  outletId: string,
  row: Record<string, unknown> | null | undefined,
  inventoryTrackingEnabled: boolean,
  inventoryEnforcement: string
): ProductAvailabilityPolicy {
  return {
    outletId,
    inventoryTrackingEnabled,
    availabilityMode: (row?.availability_mode as ProductAvailabilityPolicy['availabilityMode']) ||
      (inventoryTrackingEnabled ? 'show_oos' : 'manual'),
    inventoryEnforcement:
      (row?.inventory_enforcement as ProductAvailabilityPolicy['inventoryEnforcement']) ||
      (inventoryEnforcement as ProductAvailabilityPolicy['inventoryEnforcement']) ||
      'strict',
    lowStockThresholdPct: Number(row?.low_stock_threshold_pct ?? DEFAULT_PRODUCT_AVAILABILITY_POLICY.lowStockThresholdPct),
    lowStockServings: Number(row?.low_stock_servings ?? DEFAULT_PRODUCT_AVAILABILITY_POLICY.lowStockServings),
    outOfStockCategoryId: (row?.out_of_stock_category_id as string | null) || null,
    autoMarkUnavailable: row?.auto_mark_unavailable !== false,
    autoRestore: row?.auto_restore !== false,
    autoNotify: row?.auto_notify !== false,
    autoSync: Boolean(row?.auto_sync),
    autoCategoryMove: Boolean(row?.auto_category_move),
    warnSaleRequiresPin: Boolean(row?.warn_sale_requires_pin),
  };
}

export async function loadAvailabilityPolicy(
  outletId: string | null | undefined
): Promise<ProductAvailabilityPolicy> {
  const fallbackOutletId = outletId || 'local';
  const ops = await loadOpsSettings(outletId);

  if (!outletId) {
    return {
      outletId: fallbackOutletId,
      ...DEFAULT_PRODUCT_AVAILABILITY_POLICY,
      inventoryTrackingEnabled: ops.inventoryTrackingEnabled,
      inventoryEnforcement:
        (ops as { inventoryEnforcementMode?: ProductAvailabilityPolicy['inventoryEnforcement'] })
          .inventoryEnforcementMode || 'strict',
      availabilityMode: ops.inventoryTrackingEnabled ? 'show_oos' : 'manual',
    };
  }

  try {
    const { data, error } = await supabase
      .from('product_availability_policy')
      .select('*')
      .eq('outlet_id', outletId)
      .maybeSingle();

    if (error || !data) {
      return mapPolicyRow(
        outletId,
        null,
        ops.inventoryTrackingEnabled,
        (ops as { inventoryEnforcementMode?: string }).inventoryEnforcementMode || 'strict'
      );
    }

    return mapPolicyRow(
      outletId,
      data as Record<string, unknown>,
      ops.inventoryTrackingEnabled,
      (ops as { inventoryEnforcementMode?: string }).inventoryEnforcementMode || 'strict'
    );
  } catch {
    return mapPolicyRow(
      fallbackOutletId,
      null,
      ops.inventoryTrackingEnabled,
      (ops as { inventoryEnforcementMode?: string }).inventoryEnforcementMode || 'strict'
    );
  }
}

export async function saveAvailabilityPolicy(
  outletId: string | null | undefined,
  patch: Partial<ProductAvailabilityPolicy>,
  userId?: string | null
): Promise<ProductAvailabilityPolicy> {
  const current = await loadAvailabilityPolicy(outletId);
  const next: ProductAvailabilityPolicy = {
    ...current,
    ...patch,
    outletId: current.outletId,
  };

  await saveOpsSettings(
    outletId,
    {
      inventoryTrackingEnabled: next.inventoryTrackingEnabled,
      allowNegativeStock: next.inventoryEnforcement === 'track',
      inventoryEnforcementMode: next.inventoryEnforcement,
    } as never,
    userId
  );

  if (!outletId) return next;

  await supabase.from('product_availability_policy').upsert(
    {
      outlet_id: outletId,
      inventory_tracking_enabled: next.inventoryTrackingEnabled,
      availability_mode: next.availabilityMode,
      inventory_enforcement: next.inventoryEnforcement,
      low_stock_threshold_pct: next.lowStockThresholdPct,
      low_stock_servings: next.lowStockServings,
      out_of_stock_category_id: next.outOfStockCategoryId || null,
      auto_mark_unavailable: next.autoMarkUnavailable,
      auto_restore: next.autoRestore,
      auto_notify: next.autoNotify,
      auto_sync: next.autoSync,
      auto_category_move: next.autoCategoryMove,
      warn_sale_requires_pin: next.warnSaleRequiresPin,
      updated_at: new Date().toISOString(),
      updated_by: userId || null,
    },
    { onConflict: 'outlet_id' }
  );

  return next;
}
