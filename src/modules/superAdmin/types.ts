import type { SubscriptionPlanId } from '@/lib/planLimits';

export type BusinessType =
  | 'Cafe'
  | 'Restaurant'
  | 'Bakery'
  | 'Cloud Kitchen'
  | 'Bar'
  | 'Food Court';

export type OnboardingStepId =
  | 'business'
  | 'provision'
  | 'setup_progress'
  | 'menu'
  | 'layout'
  | 'qr'
  | 'payments'
  | 'printers'
  | 'staff'
  | 'inventory'
  | 'kds'
  | 'hours'
  | 'notifications'
  | 'go_live';

export const ONBOARDING_STEPS: { id: OnboardingStepId; label: string; number: number }[] = [
  { id: 'business', label: 'Business', number: 1 },
  { id: 'provision', label: 'Provision', number: 2 },
  { id: 'setup_progress', label: 'Setup', number: 3 },
  { id: 'menu', label: 'Menu', number: 4 },
  { id: 'layout', label: 'Layout', number: 5 },
  { id: 'qr', label: 'QR', number: 6 },
  { id: 'payments', label: 'Payments', number: 7 },
  { id: 'printers', label: 'Printers', number: 8 },
  { id: 'staff', label: 'Staff', number: 9 },
  { id: 'inventory', label: 'Inventory', number: 10 },
  { id: 'kds', label: 'KDS', number: 11 },
  { id: 'hours', label: 'Hours', number: 12 },
  { id: 'notifications', label: 'Alerts', number: 13 },
  { id: 'go_live', label: 'Go Live', number: 14 },
];

export type BusinessInfoDto = {
  companyName: string;
  businessType: BusinessType;
  ownerName: string;
  mobile: string;
  email?: string;
  gstNumber?: string;
  fssai?: string;
  country: string;
  state?: string;
  city?: string;
  timezone: string;
  currency: string;
  language: string;
  planId: SubscriptionPlanId;
  trialDays: number;
  logoDataUrl?: string | null;
};

export type MenuImportMode = 'ai_scan' | 'excel' | 'manual' | 'clone';

export type MenuItemDraft = {
  id: string;
  category: string;
  name: string;
  description?: string;
  price: number;
  veg?: boolean | null;
  variants?: string[];
  taxRate?: number;
  approved?: boolean;
};

export type LayoutSetupDto = {
  dining: boolean;
  takeaway: boolean;
  delivery: boolean;
  cloudKitchen: boolean;
  floors: number;
  tablesPerFloor: number;
  zones: string[];
};

export type PaymentSetupDto = {
  cash: boolean;
  upi: boolean;
  card: boolean;
  wallet: boolean;
  phonepe: boolean;
  razorpay: boolean;
  cashfree: boolean;
  stripe: boolean;
  defaultMethod: string;
};

export type StaffInviteDto = {
  id: string;
  name: string;
  mobile: string;
  role: string;
};

export type HoursDto = {
  openTime: string;
  closeTime: string;
  weeklyHolidays: string[];
};

export type OnboardingProgress = {
  companyCreated: boolean;
  menuImported: boolean;
  qrGenerated: boolean;
  tablesCreated: boolean;
  staffAdded: boolean;
  taxesConfigured: boolean;
  paymentSetup: boolean;
  printerConnected: boolean;
  inventoryEnabled: boolean;
  kdsEnabled: boolean;
  live: boolean;
};

export type OnboardingDraft = {
  draftId?: string;
  stepIndex: number;
  business: BusinessInfoDto;
  provisionResult?: ProvisionResult | null;
  menuMode?: MenuImportMode;
  menuItems: MenuItemDraft[];
  cloneFromCompanyId?: string | null;
  layout: LayoutSetupDto;
  payments: PaymentSetupDto;
  printersSkipped: boolean;
  staff: StaffInviteDto[];
  inventoryEnabled: boolean;
  kdsEnabled: boolean;
  hours: HoursDto;
  notifications: {
    whatsapp: boolean;
    sms: boolean;
    email: boolean;
    push: boolean;
  };
  progress: OnboardingProgress;
};

export type ProvisionResult = {
  companyId: string;
  companyCode: string;
  outletId: string;
  outletCode: string;
  adminUserId?: string | null;
  kitchenStationId?: string | null;
  cashCounterLabel: string;
};

export const DEFAULT_BUSINESS: BusinessInfoDto = {
  companyName: '',
  businessType: 'Cafe',
  ownerName: '',
  mobile: '',
  email: '',
  gstNumber: '',
  fssai: '',
  country: 'India',
  state: '',
  city: '',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  language: 'en',
  planId: 'lite',
  trialDays: 14,
  logoDataUrl: null,
};

export const DEFAULT_PROGRESS: OnboardingProgress = {
  companyCreated: false,
  menuImported: false,
  qrGenerated: false,
  tablesCreated: false,
  staffAdded: false,
  taxesConfigured: false,
  paymentSetup: false,
  printerConnected: false,
  inventoryEnabled: false,
  kdsEnabled: false,
  live: false,
};

export const DEFAULT_DRAFT: OnboardingDraft = {
  stepIndex: 0,
  business: { ...DEFAULT_BUSINESS },
  provisionResult: null,
  menuMode: 'manual',
  menuItems: [],
  cloneFromCompanyId: null,
  layout: {
    dining: true,
    takeaway: true,
    delivery: false,
    cloudKitchen: false,
    floors: 1,
    tablesPerFloor: 8,
    zones: ['Ground Floor', 'VIP', 'Outdoor'],
  },
  payments: {
    cash: true,
    upi: true,
    card: true,
    wallet: false,
    phonepe: false,
    razorpay: false,
    cashfree: false,
    stripe: false,
    defaultMethod: 'cash',
  },
  printersSkipped: false,
  staff: [],
  inventoryEnabled: false,
  kdsEnabled: true,
  hours: {
    openTime: '09:00',
    closeTime: '23:00',
    weeklyHolidays: [],
  },
  notifications: {
    whatsapp: false,
    sms: false,
    email: true,
    push: true,
  },
  progress: { ...DEFAULT_PROGRESS },
};

export type CompanyOnboardingStatusRow = {
  id: string;
  name: string;
  company_code?: string | null;
  business_type?: string | null;
  city?: string | null;
  onboarding_status?: string | null;
  onboarding_progress?: Partial<OnboardingProgress> | null;
  plan_id?: string | null;
  subscription_status?: string | null;
  created_at?: string;
};

export type SuperAdminDashboardStats = {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  paidCompanies: number;
  revenueLabel: string;
  todayOrders: number;
  todaySales: number;
  totalUsers: number;
  recentCompanies: CompanyOnboardingStatusRow[];
  pendingSetup: CompanyOnboardingStatusRow[];
  recentTrials: Array<{
    id: string;
    business_name: string;
    status: string;
    created_at: string;
  }>;
};
