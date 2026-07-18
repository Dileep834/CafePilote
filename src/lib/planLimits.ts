/** CafePilots subscription plan limits (tenant = company) */

export type SubscriptionPlanId = 'starter' | 'growth' | 'enterprise';

export type PlanLimits = {
  id: SubscriptionPlanId;
  label: string;
  maxOutlets: number;
  maxFloorsPerOutlet: number;
  maxTablesPerOutlet: number;
  floorDesigner: boolean;
};

export const PLAN_LIMITS: Record<SubscriptionPlanId, PlanLimits> = {
  starter: {
    id: 'starter',
    label: 'Starter',
    maxOutlets: 1,
    maxFloorsPerOutlet: 2,
    maxTablesPerOutlet: 20,
    floorDesigner: true,
  },
  growth: {
    id: 'growth',
    label: 'Growth',
    maxOutlets: 3,
    maxFloorsPerOutlet: 5,
    maxTablesPerOutlet: 60,
    floorDesigner: true,
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    maxOutlets: 999,
    maxFloorsPerOutlet: 999,
    maxTablesPerOutlet: 999,
    floorDesigner: true,
  },
};

export function getPlanLimits(plan: SubscriptionPlanId | string | null | undefined): PlanLimits {
  if (plan === 'growth' || plan === 'enterprise' || plan === 'starter') {
    return PLAN_LIMITS[plan];
  }
  return PLAN_LIMITS.growth; // default for existing tenants
}

export type LimitCheck =
  | { ok: true }
  | { ok: false; message: string; limit: number; current: number };

export function checkOutletLimit(plan: SubscriptionPlanId, currentOutlets: number): LimitCheck {
  const lim = getPlanLimits(plan);
  if (currentOutlets >= lim.maxOutlets) {
    return {
      ok: false,
      limit: lim.maxOutlets,
      current: currentOutlets,
      message: `${lim.label} allows ${lim.maxOutlets} branch(es). Upgrade to add more.`,
    };
  }
  return { ok: true };
}

export function checkFloorLimit(plan: SubscriptionPlanId, floorsOnOutlet: number): LimitCheck {
  const lim = getPlanLimits(plan);
  if (floorsOnOutlet >= lim.maxFloorsPerOutlet) {
    return {
      ok: false,
      limit: lim.maxFloorsPerOutlet,
      current: floorsOnOutlet,
      message: `${lim.label} allows ${lim.maxFloorsPerOutlet} floor(s) per branch. Upgrade to add more.`,
    };
  }
  return { ok: true };
}

export function checkTableLimit(plan: SubscriptionPlanId, tablesOnOutlet: number): LimitCheck {
  const lim = getPlanLimits(plan);
  if (tablesOnOutlet >= lim.maxTablesPerOutlet) {
    return {
      ok: false,
      limit: lim.maxTablesPerOutlet,
      current: tablesOnOutlet,
      message: `${lim.label} allows ${lim.maxTablesPerOutlet} tables per branch. Upgrade to add more.`,
    };
  }
  return { ok: true };
}
