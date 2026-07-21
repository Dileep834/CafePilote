import { useMemo } from 'react';
import { useTenantStore } from '@/store/useTenantStore';
import { isSuperAdmin } from '@/lib/access';
import { useAuthStore } from '@/store/useAuthStore';
import {
  getFeatureFlags,
  hasFeature,
  requiredPlanForFeature,
  toMarketingPlanId,
  type FeatureFlagKey,
  type FeatureFlags,
  type PlanMarketingId,
} from '@/lib/featureFlags';
import { PLAN_MARKETING_LABEL } from '@/lib/featureFlags';

/**
 * Plan-driven feature flags for the current tenant.
 * Super Admin sees all flags enabled.
 */
export function useFeatureFlags() {
  const planId = useTenantStore((s) => s.planId);
  const user = useAuthStore((s) => s.user);
  const sa = isSuperAdmin(user);

  const flags = useMemo(() => {
    const base = getFeatureFlags(planId);
    if (!sa) return base;
    const allOn = { ...base };
    (Object.keys(allOn) as FeatureFlagKey[]).forEach((k) => {
      allOn[k] = true;
    });
    return allOn;
  }, [planId, sa]);

  const marketingPlan = toMarketingPlanId(planId);

  return {
    planId,
    marketingPlan,
    planLabel: PLAN_MARKETING_LABEL[marketingPlan],
    flags,
    has: (flag: FeatureFlagKey) => (sa ? true : hasFeature(planId, flag)),
    requiredPlan: (flag: FeatureFlagKey) => requiredPlanForFeature(flag),
    requiredPlanLabel: (flag: FeatureFlagKey) => PLAN_MARKETING_LABEL[requiredPlanForFeature(flag)],
  };
}

export type { FeatureFlagKey, FeatureFlags, PlanMarketingId };
