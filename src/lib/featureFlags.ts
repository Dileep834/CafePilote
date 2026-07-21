/**
 * Configuration-driven feature flags by subscription plan.
 * Single source of truth for sidebar, dashboard, Control Panel, settings, and reports.
 */

import {
  getPlanLimits,
  normalizePlanId,
  type AnySubscriptionPlanId,
  type SubscriptionPlanId,
} from '@/lib/planLimits';

export type FeatureFlagKey =
  | 'dashboard'
  | 'pos'
  | 'tables'
  | 'products'
  | 'inventory'
  | 'reports'
  | 'settings'
  | 'basicSettings'
  | 'kitchen'
  | 'purchase'
  | 'customers'
  | 'payments'
  | 'notifications'
  | 'aiCopilot'
  | 'executiveBI'
  | 'onlineOrders'
  | 'advancedInventory'
  | 'crm'
  | 'shiftManagement'
  | 'auditLogs'
  | 'refundManagement'
  | 'multiOutlet'
  | 'franchise'
  | 'whiteLabel'
  | 'apiPlatform'
  | 'developerTools'
  | 'systemHealth'
  | 'platformOps'
  | 'compliance'
  | 'advancedSecurity'
  | 'floorDesigner'
  | 'recipes'
  | 'staff'
  | 'controlPanel'
  | 'suppliers'
  | 'vouchers'
  | 'liteOnboarding'
  | 'offlineSync';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export type PlanMarketingId = 'lite' | 'standard' | 'professional' | 'enterprise';

const ALL_OFF = Object.fromEntries(
  (
    [
      'dashboard',
      'pos',
      'tables',
      'products',
      'inventory',
      'reports',
      'settings',
      'basicSettings',
      'kitchen',
      'purchase',
      'customers',
      'payments',
      'notifications',
      'aiCopilot',
      'executiveBI',
      'onlineOrders',
      'advancedInventory',
      'crm',
      'shiftManagement',
      'auditLogs',
      'refundManagement',
      'multiOutlet',
      'franchise',
      'whiteLabel',
      'apiPlatform',
      'developerTools',
      'systemHealth',
      'platformOps',
      'compliance',
      'advancedSecurity',
      'floorDesigner',
      'recipes',
      'staff',
      'controlPanel',
      'suppliers',
      'vouchers',
      'liteOnboarding',
      'offlineSync',
    ] as FeatureFlagKey[]
  ).map((k) => [k, false])
) as FeatureFlags;

/** Minimum plan that unlocks each flag (for upgrade CTAs). */
export const FEATURE_MIN_PLAN: Record<FeatureFlagKey, PlanMarketingId> = {
  dashboard: 'lite',
  pos: 'lite',
  tables: 'lite',
  products: 'lite',
  inventory: 'lite',
  reports: 'lite',
  settings: 'lite',
  basicSettings: 'lite',
  liteOnboarding: 'lite',
  kitchen: 'standard',
  purchase: 'standard',
  customers: 'standard',
  payments: 'standard',
  notifications: 'standard',
  staff: 'lite',
  suppliers: 'standard',
  floorDesigner: 'standard',
  aiCopilot: 'professional',
  executiveBI: 'professional',
  onlineOrders: 'professional',
  advancedInventory: 'professional',
  crm: 'professional',
  shiftManagement: 'professional',
  auditLogs: 'professional',
  refundManagement: 'professional',
  recipes: 'professional',
  vouchers: 'professional',
  controlPanel: 'professional',
  offlineSync: 'professional',
  multiOutlet: 'enterprise',
  franchise: 'enterprise',
  whiteLabel: 'enterprise',
  apiPlatform: 'enterprise',
  developerTools: 'enterprise',
  systemHealth: 'enterprise',
  platformOps: 'enterprise',
  compliance: 'enterprise',
  advancedSecurity: 'enterprise',
};

export const PLAN_MARKETING_LABEL: Record<PlanMarketingId, string> = {
  lite: 'Lite',
  standard: 'Standard',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

export function toMarketingPlanId(plan: AnySubscriptionPlanId | string | null | undefined): PlanMarketingId {
  const id = normalizePlanId(plan);
  if (id === 'lite') return 'lite';
  if (id === 'starter') return 'standard';
  if (id === 'professional') return 'professional';
  return 'enterprise';
}

export function fromMarketingPlanId(id: PlanMarketingId): SubscriptionPlanId {
  if (id === 'standard') return 'starter';
  return id;
}

const LITE_FLAGS: FeatureFlags = {
  ...ALL_OFF,
  dashboard: true,
  pos: true,
  tables: true,
  products: true,
  inventory: true,
  reports: true,
  settings: true,
  basicSettings: true,
  staff: true,
  liteOnboarding: true,
};

const STANDARD_FLAGS: FeatureFlags = {
  ...LITE_FLAGS,
  liteOnboarding: false,
  kitchen: true,
  purchase: true,
  customers: true,
  payments: true,
  notifications: true,
  staff: true,
  suppliers: true,
  floorDesigner: true,
};

const PROFESSIONAL_FLAGS: FeatureFlags = {
  ...STANDARD_FLAGS,
  aiCopilot: true,
  executiveBI: true,
  onlineOrders: true,
  advancedInventory: true,
  crm: true,
  shiftManagement: true,
  auditLogs: true,
  refundManagement: true,
  recipes: true,
  vouchers: true,
  controlPanel: true,
  offlineSync: true,
};

const ENTERPRISE_FLAGS: FeatureFlags = {
  ...PROFESSIONAL_FLAGS,
  multiOutlet: true,
  franchise: true,
  whiteLabel: true,
  apiPlatform: true,
  developerTools: true,
  systemHealth: true,
  platformOps: true,
  compliance: true,
  advancedSecurity: true,
};

const BY_PLAN: Record<SubscriptionPlanId, FeatureFlags> = {
  lite: LITE_FLAGS,
  starter: STANDARD_FLAGS,
  professional: PROFESSIONAL_FLAGS,
  enterprise: ENTERPRISE_FLAGS,
};

/** Optional runtime overrides (tenant / env) merge on top of plan defaults. */
export type FeatureFlagOverrides = Partial<FeatureFlags>;

export function getFeatureFlags(
  plan: AnySubscriptionPlanId | string | null | undefined,
  overrides?: FeatureFlagOverrides
): FeatureFlags {
  const base = { ...BY_PLAN[normalizePlanId(plan)] };
  if (!overrides) return base;
  return { ...base, ...overrides };
}

export function hasFeature(
  plan: AnySubscriptionPlanId | string | null | undefined,
  flag: FeatureFlagKey,
  overrides?: FeatureFlagOverrides
): boolean {
  return Boolean(getFeatureFlags(plan, overrides)[flag]);
}

export function requiredPlanForFeature(flag: FeatureFlagKey): PlanMarketingId {
  return FEATURE_MIN_PLAN[flag];
}

export function isPlanAtLeast(
  plan: AnySubscriptionPlanId | string | null | undefined,
  min: PlanMarketingId
): boolean {
  const order: PlanMarketingId[] = ['lite', 'standard', 'professional', 'enterprise'];
  const current = toMarketingPlanId(plan);
  return order.indexOf(current) >= order.indexOf(min);
}
