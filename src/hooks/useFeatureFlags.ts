import { useCallback, useMemo } from 'react';
import { useTenantStore } from '@/store/useTenantStore';
import {
  getFeatureFlags,
  hasFeature,
  requiredPlanForFeature,
  toMarketingPlanId,
  PLAN_MARKETING_LABEL,
  type FeatureFlagKey,
  type FeatureFlags,
  type PlanMarketingId,
} from '@/lib/featureFlags';

/**
 * Plan-driven feature flags for the current tenant planId.
 * Always respects the selected subscription (including when Super Admin
 * previews Lite / Standard) so the sidebar and dashboards simplify correctly.
 */
export function useFeatureFlags() {
  const planId = useTenantStore((s) => s.planId);

  const flags = useMemo(() => getFeatureFlags(planId), [planId]);
  const marketingPlan = toMarketingPlanId(planId);

  const has = useCallback((flag: FeatureFlagKey) => hasFeature(planId, flag), [planId]);
  const requiredPlan = useCallback((flag: FeatureFlagKey) => requiredPlanForFeature(flag), []);
  const requiredPlanLabel = useCallback(
    (flag: FeatureFlagKey) => PLAN_MARKETING_LABEL[requiredPlanForFeature(flag)],
    []
  );

  return {
    planId,
    marketingPlan,
    planLabel: PLAN_MARKETING_LABEL[marketingPlan],
    flags,
    has,
    requiredPlan,
    requiredPlanLabel,
  };
}

export type { FeatureFlagKey, FeatureFlags, PlanMarketingId };
