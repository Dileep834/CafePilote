/** CafePilots subscription plan limits and module gates (tenant = company). */

export type SubscriptionPlanId = 'lite' | 'starter' | 'professional' | 'enterprise';
export type LegacySubscriptionPlanId = 'growth';
export type AnySubscriptionPlanId = SubscriptionPlanId | LegacySubscriptionPlanId;

export type PlanModuleId =
  | 'dashboard'
  | 'pos'
  | 'posCheckout'
  | 'qrMenu'
  | 'receipts'
  | 'paymentTracking'
  | 'products'
  | 'inventory'
  | 'purchase'
  | 'suppliers'
  | 'crm'
  | 'kitchen'
  | 'printer'
  | 'barcode'
  | 'recipes'
  | 'foodCosting'
  | 'expenses'
  | 'staff'
  | 'reports'
  | 'tables'
  | 'floorDesigner'
  | 'multiOutlet'
  | 'franchise'
  | 'centralInventory'
  | 'whiteLabel'
  | 'api'
  | 'aiReports'
  | 'aiCoach'
  | 'prioritySupport'
  | 'settings'
  | 'paymentGatewaySettings';

export type FeatureValue = boolean | number | 'basic' | 'limited' | 'optional' | 'coming-soon' | 'full' | 'email' | 'whatsapp' | 'dedicated';

export type PlanLimits = {
  id: SubscriptionPlanId;
  label: string;
  monthlyPrice: number | null;
  annualPriceLabel: string;
  bestFor: string;
  maxProducts: number | null;
  maxUsers: number | null;
  maxOutlets: number;
  maxFloorsPerOutlet: number;
  maxTablesPerOutlet: number;
  floorDesigner: boolean;
  modules: PlanModuleId[];
  features: Record<string, FeatureValue>;
};

const LITE_MODULES: PlanModuleId[] = [
  'dashboard',
  'pos',
  'posCheckout',
  'qrMenu',
  'receipts',
  'paymentTracking',
  'products',
  'inventory',
  'tables',
  'reports',
  'settings',
  'printer',
  'staff',
];

const STANDARD_MODULES: PlanModuleId[] = [
  ...LITE_MODULES,
  'purchase',
  'suppliers',
  'crm',
  'kitchen',
  'barcode',
  'floorDesigner',
  'staff',
  'paymentGatewaySettings',
];

const PROFESSIONAL_MODULES: PlanModuleId[] = [
  ...STANDARD_MODULES,
  'recipes',
  'foodCosting',
  'expenses',
  'api',
  'aiReports',
  'aiCoach',
];

export const PLAN_LIMITS: Record<SubscriptionPlanId, PlanLimits> = {
  lite: {
    id: 'lite',
    label: 'Lite',
    monthlyPrice: 299,
    annualPriceLabel: '₹2,999/year',
    bestFor: 'Small cafés, tea stalls, and bakeries that need a simple POS.',
    maxProducts: 100,
    maxUsers: 2,
    maxOutlets: 1,
    maxFloorsPerOutlet: 1,
    maxTablesPerOutlet: 12,
    floorDesigner: false,
    modules: LITE_MODULES,
    features: {
      mobileBilling: true,
      qrMenu: true,
      digitalReceipts: true,
      upiPaymentTracking: true,
      basicSalesReport: true,
      productManagement: 100,
      inventoryManagement: true,
      purchaseManagement: false,
      supplierManagement: false,
      customerDatabase: 'basic',
      kot: false,
      thermalPrinter: true,
      barcodeSupport: false,
      recipeManagement: false,
      foodCosting: false,
      expenseTracking: false,
      staffManagement: true,
      multiUser: 2,
      multiOutlet: false,
      franchiseManagement: false,
      centralInventory: false,
      whiteLabel: false,
      apiAccess: false,
      aiReports: false,
      aiBusinessCoach: false,
      prioritySupport: false,
    },
  },
  starter: {
    id: 'starter',
    label: 'Standard',
    monthlyPrice: 699,
    annualPriceLabel: '₹6,999/year',
    bestFor: 'Growing cafés needing kitchen, purchase, customers, and payments.',
    maxProducts: null,
    maxUsers: 5,
    maxOutlets: 1,
    maxFloorsPerOutlet: 2,
    maxTablesPerOutlet: 30,
    floorDesigner: true,
    modules: STANDARD_MODULES,
    features: {
      mobileBilling: true,
      qrMenu: true,
      digitalReceipts: true,
      upiPaymentTracking: true,
      basicSalesReport: true,
      productManagement: 'full',
      inventoryManagement: true,
      purchaseManagement: true,
      supplierManagement: true,
      customerDatabase: true,
      kot: true,
      thermalPrinter: true,
      barcodeSupport: true,
      recipeManagement: false,
      foodCosting: false,
      expenseTracking: false,
      staffManagement: true,
      multiUser: 5,
      multiOutlet: false,
      franchiseManagement: false,
      centralInventory: false,
      whiteLabel: 'optional',
      apiAccess: false,
      aiReports: false,
      aiBusinessCoach: false,
      prioritySupport: 'email',
    },
  },
  professional: {
    id: 'professional',
    label: 'Professional',
    monthlyPrice: 999,
    annualPriceLabel: '₹9,999/year',
    bestFor: 'Busy restaurants needing AI, BI, online orders, shifts, and audit.',
    maxProducts: null,
    maxUsers: 15,
    maxOutlets: 1,
    maxFloorsPerOutlet: 5,
    maxTablesPerOutlet: 80,
    floorDesigner: true,
    modules: PROFESSIONAL_MODULES,
    features: {
      mobileBilling: true,
      qrMenu: true,
      digitalReceipts: true,
      upiPaymentTracking: true,
      basicSalesReport: true,
      productManagement: 'full',
      inventoryManagement: true,
      purchaseManagement: true,
      supplierManagement: true,
      customerDatabase: true,
      kot: true,
      thermalPrinter: true,
      barcodeSupport: true,
      recipeManagement: true,
      foodCosting: true,
      expenseTracking: true,
      staffManagement: true,
      multiUser: 15,
      multiOutlet: 'optional',
      franchiseManagement: false,
      centralInventory: false,
      whiteLabel: true,
      apiAccess: 'limited',
      aiReports: true,
      aiBusinessCoach: true,
      prioritySupport: 'whatsapp',
    },
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    monthlyPrice: 1999,
    annualPriceLabel: 'Custom quotation',
    bestFor: 'Chains and franchises needing multi-outlet, API, and platform control.',
    maxProducts: null,
    maxUsers: null,
    maxOutlets: 999,
    maxFloorsPerOutlet: 999,
    maxTablesPerOutlet: 999,
    floorDesigner: true,
    modules: [
      ...PROFESSIONAL_MODULES,
      'multiOutlet',
      'franchise',
      'centralInventory',
      'whiteLabel',
      'prioritySupport',
    ],
    features: {
      mobileBilling: true,
      qrMenu: true,
      digitalReceipts: true,
      upiPaymentTracking: true,
      basicSalesReport: true,
      productManagement: 'full',
      inventoryManagement: true,
      purchaseManagement: true,
      supplierManagement: true,
      customerDatabase: true,
      kot: true,
      thermalPrinter: true,
      barcodeSupport: true,
      recipeManagement: true,
      foodCosting: true,
      expenseTracking: true,
      staffManagement: true,
      multiUser: 'full',
      multiOutlet: true,
      franchiseManagement: true,
      centralInventory: true,
      whiteLabel: true,
      apiAccess: 'full',
      aiReports: true,
      aiBusinessCoach: true,
      prioritySupport: 'dedicated',
    },
  },
};

export function normalizePlanId(plan: AnySubscriptionPlanId | string | null | undefined): SubscriptionPlanId {
  if (plan === 'lite' || plan === 'starter' || plan === 'professional' || plan === 'enterprise') {
    return plan;
  }
  if (plan === 'standard') return 'starter';
  if (plan === 'growth') return 'professional';
  return 'professional';
}

export function getPlanLimits(plan: AnySubscriptionPlanId | string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlanId(plan)];
}

export function hasPlanModule(
  plan: AnySubscriptionPlanId | string | null | undefined,
  moduleId?: PlanModuleId
): boolean {
  if (!moduleId) return true;
  return getPlanLimits(plan).modules.includes(moduleId);
}

export type LimitCheck =
  | { ok: true }
  | { ok: false; message: string; limit: number; current: number };

function overLimitMessage(label: string, limit: number | null, current: number, unit: string): LimitCheck {
  if (limit === null) return { ok: true };
  if (current >= limit) {
    return {
      ok: false,
      limit,
      current,
      message: `${label} allows ${limit} ${unit}. Upgrade to add more.`,
    };
  }
  return { ok: true };
}

export function checkOutletLimit(plan: AnySubscriptionPlanId, currentOutlets: number): LimitCheck {
  const lim = getPlanLimits(plan);
  return overLimitMessage(lim.label, lim.maxOutlets, currentOutlets, 'branch(es)');
}

export function checkFloorLimit(plan: AnySubscriptionPlanId, floorsOnOutlet: number): LimitCheck {
  const lim = getPlanLimits(plan);
  return overLimitMessage(lim.label, lim.maxFloorsPerOutlet, floorsOnOutlet, 'floor(s) per branch');
}

export function checkTableLimit(plan: AnySubscriptionPlanId, tablesOnOutlet: number): LimitCheck {
  const lim = getPlanLimits(plan);
  return overLimitMessage(lim.label, lim.maxTablesPerOutlet, tablesOnOutlet, 'tables per branch');
}

export function checkProductLimit(plan: AnySubscriptionPlanId, currentProducts: number): LimitCheck {
  const lim = getPlanLimits(plan);
  return overLimitMessage(lim.label, lim.maxProducts, currentProducts, 'product(s)');
}

export function checkUserLimit(plan: AnySubscriptionPlanId, currentUsers: number): LimitCheck {
  const lim = getPlanLimits(plan);
  return overLimitMessage(lim.label, lim.maxUsers, currentUsers, 'staff user(s)');
}
