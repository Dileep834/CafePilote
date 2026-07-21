import type { AnySubscriptionPlanId } from '@/lib/planLimits';
import { normalizePlanId } from '@/lib/planLimits';
import type { OfflineCapability, OfflinePaymentPolicy } from '../types/entities';
import { DEFAULT_OFFLINE_PAYMENT_POLICY } from '../types/entities';
import { useFeatureFlagStore } from '@/modules/saas/services/featureFlagService';

/**
 * Plan → offline capability
 * Lite / Standard → online only
 * Professional → offline billing
 * Enterprise → full offline
 */
export function getOfflineCapability(
  plan: AnySubscriptionPlanId | string | null | undefined
): OfflineCapability {
  const id = normalizePlanId(plan);
  if (id === 'enterprise') return 'full_offline';
  if (id === 'professional') return 'offline_billing';
  return 'online_only';
}

export function isOfflineBillingAllowed(
  plan: AnySubscriptionPlanId | string | null | undefined
): boolean {
  const capability = getOfflineCapability(plan);
  if (capability === 'online_only') return false;
  // Runtime kill-switch: explicit false disables even on Pro/Enterprise
  return useFeatureFlagStore.getState().isEnabled('offline.billing', true);
}

export function isFullOfflineAllowed(
  plan: AnySubscriptionPlanId | string | null | undefined
): boolean {
  return getOfflineCapability(plan) === 'full_offline' && isOfflineBillingAllowed(plan);
}

export function resolveOfflinePaymentPolicy(
  online: boolean,
  overrides?: Partial<OfflinePaymentPolicy>
): OfflinePaymentPolicy {
  const base = { ...DEFAULT_OFFLINE_PAYMENT_POLICY, ...overrides };
  if (online) {
    return { ...base, upi: true };
  }
  return {
    ...base,
    cash: true,
    card: base.card && !base.cardRequiresOnline,
    upi: base.upi && !base.upiRequiresOnlineGateway,
    split: base.split,
  };
}

export function paymentMethodAvailableOffline(
  method: string,
  policy: OfflinePaymentPolicy
): { ok: boolean; warning?: string } {
  const m = method.toLowerCase();
  if (m === 'cash') return { ok: policy.cash };
  if (m === 'card') {
    if (!policy.card) {
      return { ok: false, warning: 'Card payments require connectivity (or offline card mode).' };
    }
    return { ok: true };
  }
  if (m === 'upi') {
    if (!policy.upi) {
      return {
        ok: false,
        warning: 'UPI is disabled offline unless the gateway supports offline capture.',
      };
    }
    return { ok: true };
  }
  if (m === 'split') return { ok: policy.split };
  return { ok: false, warning: `Payment method "${method}" is not available offline.` };
}
