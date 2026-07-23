import { CompanyOnboardingRepository } from '../repositories/companyOnboardingRepository';
import { validateBusinessInfo } from '../validation';
import type {
  BusinessInfoDto,
  MenuItemDraft,
  OnboardingDraft,
  OnboardingProgress,
  ProvisionResult,
  SuperAdminDashboardStats,
} from '../types';
import { progressPercent } from '../lib/companyCode';
import { supabase } from '@/lib/supabase';

export const CompanyProvisioningService = {
  async provision(business: BusinessInfoDto, createdBy?: string | null): Promise<ProvisionResult> {
    const parsed = validateBusinessInfo(business);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(', ');
      throw new Error(msg || 'Invalid business information');
    }
    return CompanyOnboardingRepository.createCompanyBundle(parsed.data as BusinessInfoDto, createdBy);
  },

  async autosaveDraft(draft: OnboardingDraft, createdBy?: string | null): Promise<string> {
    try {
      return await CompanyOnboardingRepository.saveDraft(draft, createdBy);
    } catch {
      // IndexedDB / local fallback key
      const key = `cafepilots-onboarding-draft-${draft.provisionResult?.companyId || 'new'}`;
      localStorage.setItem(key, JSON.stringify(draft));
      return draft.draftId || key;
    }
  },

  loadLocalDraft(companyId?: string | null): OnboardingDraft | null {
    try {
      const key = `cafepilots-onboarding-draft-${companyId || 'new'}`;
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as OnboardingDraft) : null;
    } catch {
      return null;
    }
  },

  async createTables(draft: OnboardingDraft): Promise<number> {
    if (!draft.provisionResult?.outletId) throw new Error('Provision company first');
    return CompanyOnboardingRepository.createTablesForOutlet({
      outletId: draft.provisionResult.outletId,
      floors: draft.layout.floors,
      tablesPerFloor: draft.layout.tablesPerFloor,
      zones: draft.layout.zones,
      companyId: draft.provisionResult.companyId,
    });
  },

  async importApprovedMenu(draft: OnboardingDraft): Promise<number> {
    if (!draft.provisionResult) throw new Error('Provision company first');
    const approved = draft.menuItems.filter((m) => m.approved !== false);
    if (draft.menuMode === 'clone' && draft.cloneFromCompanyId) {
      return CompanyOnboardingRepository.cloneMenuFromCompany(
        draft.cloneFromCompanyId,
        draft.provisionResult.companyId
      );
    }
    return CompanyOnboardingRepository.importMenuItems({
      companyId: draft.provisionResult.companyId,
      outletId: draft.provisionResult.outletId,
      items: approved.map((m) => ({
        category: m.category,
        name: m.name,
        price: m.price,
        description: m.description,
        veg: m.veg,
      })),
    });
  },

  async markProgress(companyId: string, progress: OnboardingProgress, live = false) {
    await CompanyOnboardingRepository.updateOnboardingProgress(companyId, progress, live);
  },

  async getDashboardStats(): Promise<SuperAdminDashboardStats> {
    const companies = await CompanyOnboardingRepository.listCompaniesWithOnboarding();
    const trials = await CompanyOnboardingRepository.listTrialRequests();

    let todayOrders = 0;
    let todaySales = 0;
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('pos_orders')
        .select('total_amount, status')
        .gte('created_at', start.toISOString())
        .in('status', ['completed', 'paid', 'settled'])
        .limit(5000);
      todayOrders = data?.length || 0;
      todaySales = (data || []).reduce((s, r: any) => s + Number(r.total_amount || 0), 0);
    } catch {
      /* optional */
    }

    let totalUsers = 0;
    try {
      const { count } = await supabase.from('users').select('id', { count: 'exact', head: true });
      totalUsers = count || 0;
    } catch {
      /* optional */
    }

    const activeCompanies = companies.filter((c) => c.is_active !== false).length;
    const trialCompanies = companies.filter(
      (c) => c.subscription_status === 'trialing' || c.billing_status === 'trial'
    ).length;
    const paidCompanies = companies.filter(
      (c) => c.subscription_status === 'active' && c.billing_status !== 'trial'
    ).length;

    const pendingSetup = companies
      .filter((c) => c.onboarding_status !== 'live')
      .slice(0, 8)
      .map((c) => ({
        id: String(c.id),
        name: c.name,
        company_code: c.company_code,
        business_type: c.business_type,
        city: c.city,
        onboarding_status: c.onboarding_status,
        onboarding_progress: c.onboarding_progress,
        plan_id: c.plan_id,
        subscription_status: c.subscription_status,
        created_at: c.created_at,
      }));

    return {
      totalCompanies: companies.length,
      activeCompanies,
      trialCompanies,
      paidCompanies,
      revenueLabel: 'See Billing',
      todayOrders,
      todaySales,
      totalUsers,
      recentCompanies: companies.slice(0, 8).map((c) => ({
        id: String(c.id),
        name: c.name,
        company_code: c.company_code,
        business_type: c.business_type,
        city: c.city,
        onboarding_status: c.onboarding_status,
        onboarding_progress: c.onboarding_progress,
        plan_id: c.plan_id,
        subscription_status: c.subscription_status,
        created_at: c.created_at,
      })),
      pendingSetup,
      recentTrials: trials.slice(0, 8).map((t: any) => ({
        id: String(t.id),
        business_name: t.business_name,
        status: t.status,
        created_at: t.created_at,
      })),
    };
  },
};

/** Naive AI menu scanner: OCR-less heuristic from pasted text / filename labels. */
export function parseMenuTextToItems(raw: string): MenuItemDraft[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const items: MenuItemDraft[] = [];
  let category = 'General';
  for (const line of lines) {
    if (/^[A-Z][A-Z\s&]{2,}$/.test(line) && !/\d/.test(line)) {
      category = line.replace(/\s+/g, ' ');
      continue;
    }
    const m = line.match(/^(.*?)[\s\-–—]+(?:₹|Rs\.?\s*)?(\d+(?:\.\d{1,2})?)\s*$/i);
    if (m) {
      items.push({
        id: crypto.randomUUID(),
        category,
        name: m[1]!.trim(),
        price: Number(m[2]),
        approved: true,
        veg: null,
      });
    }
  }
  return items;
}

export function onboardingHealth(progress?: Partial<OnboardingProgress> | null) {
  const flags = {
    companyCreated: Boolean(progress?.companyCreated),
    menuImported: Boolean(progress?.menuImported),
    qrGenerated: Boolean(progress?.qrGenerated),
    tablesCreated: Boolean(progress?.tablesCreated),
    staffAdded: Boolean(progress?.staffAdded),
    taxesConfigured: Boolean(progress?.taxesConfigured),
    paymentSetup: Boolean(progress?.paymentSetup),
    live: Boolean(progress?.live),
  };
  const percent = progressPercent(flags);
  return { flags, percent };
}
