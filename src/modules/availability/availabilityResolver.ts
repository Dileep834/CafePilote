import type { ProductAvailabilityPolicy, ResolvedAvailability } from './types';
import { applyChannelVisibility } from './channelVisibilityService';

function manualBadge(status: string) {
  switch (status) {
    case 'seasonal':
      return 'Seasonal';
    case 'discontinued':
      return 'Discontinued';
    case 'hidden':
      return 'Hidden';
    case 'out_of_stock':
      return 'Out Of Stock';
    default:
      return 'Available';
  }
}

export function resolveProductAvailability(params: {
  product: Record<string, unknown>;
  policy: ProductAvailabilityPolicy;
  channel: 'pos' | 'qr' | 'website' | 'swiggy' | 'zomato' | 'ondc' | 'whatsapp' | 'api' | 'kitchen';
  channelMode?: 'inherit' | 'show' | 'hide' | 'oos_badge' | 'unavailable_api';
  state?: {
    effectiveStatus?: string | null;
    computedStatus?: string | null;
    manualStatus?: string | null;
    manualReason?: string | null;
    availableServings?: number | null;
  } | null;
}): ResolvedAvailability {
  const productId = String(params.product.id || '');
  const isActive = params.product.is_active !== false;
  const manualStatus = params.state?.manualStatus || null;
  const effectiveStatus = params.state?.effectiveStatus || null;
  const computedStatus = params.state?.computedStatus || null;
  const availableServings = params.state?.availableServings ?? null;

  if (!isActive) {
    return {
      productId,
      status: 'inactive',
      source: 'product',
      canShow: false,
      canSell: false,
      badge: 'Inactive',
      reason: 'Product is inactive',
      availableServings,
    };
  }

  if (manualStatus) {
    const canShow = manualStatus !== 'hidden' && manualStatus !== 'discontinued';
    const canSell = manualStatus === 'available';
    return {
      productId,
      status: manualStatus as ResolvedAvailability['status'],
      source: 'manual',
      canShow,
      canSell,
      badge: manualBadge(manualStatus),
      reason: params.state?.manualReason || 'Manual manager override',
      availableServings,
    };
  }

  let status = (effectiveStatus || computedStatus || 'available') as ResolvedAvailability['status'];
  let canShow = true;
  let canSell = true;
  let badge = 'Available';
  let reason = '';
  let requireManagerApproval = false;

  if (!params.policy.inventoryTrackingEnabled) {
    status = 'available';
    badge = 'Available';
    reason = 'Inventory tracking is disabled';
  } else if (!effectiveStatus && !computedStatus) {
    const qty = Number(
      params.product.current_stock ??
        params.product.stock_quantity ??
        params.product.stock ??
        params.product.quantity ??
        NaN
    );
    if (Number.isFinite(qty) && qty <= 0) {
      status = 'out_of_stock';
      badge = 'Out Of Stock';
      reason = 'Insufficient stock';
      canSell = params.policy.availabilityMode === 'always_available' || params.policy.availabilityMode === 'warn_sale';
      if (params.policy.availabilityMode === 'warn_sale') {
        requireManagerApproval = params.policy.warnSaleRequiresPin;
      }
      if (params.policy.availabilityMode === 'hide' || params.policy.availabilityMode === 'move_category') {
        canShow = false;
      }
    } else {
      status = 'available';
      badge = 'Available';
      reason = 'Awaiting availability recalculation';
    }
  } else {
    switch (status) {
      case 'low_stock':
        badge = 'Low Stock';
        reason = 'Inventory running low';
        if (params.policy.availabilityMode === 'warn_sale') {
          requireManagerApproval = params.policy.warnSaleRequiresPin;
        }
        break;
      case 'out_of_stock':
        badge = 'Out Of Stock';
        reason = 'Insufficient stock or servings';
        canSell = params.policy.availabilityMode === 'always_available';
        if (params.policy.availabilityMode === 'warn_sale') {
          canSell = true;
          requireManagerApproval = params.policy.warnSaleRequiresPin;
        }
        if (params.policy.availabilityMode === 'hide' || params.policy.availabilityMode === 'move_category') {
          canShow = false;
        }
        break;
      case 'hidden':
        badge = 'Hidden';
        canShow = false;
        canSell = false;
        reason = 'Hidden by availability policy';
        break;
      default:
        status = 'available';
        badge = 'Available';
        reason = 'Available to sell';
    }
  }

  if (params.channel === 'kitchen') {
    return {
      productId,
      status,
      source: 'inventory',
      canShow: true,
      canSell,
      badge,
      reason,
      requireManagerApproval,
      availableServings,
    };
  }

  const channelRules = applyChannelVisibility(status, params.channelMode);
  canShow = canShow && channelRules.canShow;
  canSell = canSell && channelRules.canSell;

  return {
    productId,
    status,
    source: 'inventory',
    canShow,
    canSell,
    badge,
    reason,
    requireManagerApproval,
    availableServings,
  };
}
