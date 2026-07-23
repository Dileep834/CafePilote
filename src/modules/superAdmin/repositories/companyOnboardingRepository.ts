import { supabase } from '@/lib/supabase';
import type { BusinessInfoDto, OnboardingDraft, OnboardingProgress } from '../types';
import { generateCompanyCode, generateOutletCode } from '../lib/companyCode';
import type { ProvisionResult } from '../types';
import { Role } from '@/constants';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TAXES = [
  { name: 'CGST', rate: 2.5 },
  { name: 'SGST', rate: 2.5 },
  { name: 'GST 5%', rate: 5 },
];

const DEFAULT_ROLES = [
  Role.ADMIN,
  Role.OUTLET_MANAGER,
  Role.CASHIER,
  Role.KITCHEN_STAFF,
  Role.STAFF,
];

/**
 * Best-effort transactional provisioning via sequential writes + compensating cleanup.
 * Prefer running scripts/super_admin_onboarding_schema.sql first.
 */
export const CompanyOnboardingRepository = {
  async ensureUniqueCompanyCode(name: string): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const code = generateCompanyCode(name);
      const { data } = await supabase
        .from('companies')
        .select('id')
        .eq('company_code', code)
        .maybeSingle();
      if (!data) return code;
    }
    return generateCompanyCode(name, () => Date.now() % 1);
  },

  async createCompanyBundle(
    business: BusinessInfoDto,
    createdBy?: string | null
  ): Promise<ProvisionResult> {
    const companyId = uuidv4();
    const companyCode = await this.ensureUniqueCompanyCode(business.companyName);
    const outletCode = generateOutletCode(business.companyName);
    const created: { company?: boolean; outletId?: string; sub?: boolean; userId?: string } = {};

    try {
      const companyRow: Record<string, unknown> = {
        id: companyId,
        name: business.companyName.trim(),
        subdomain: companyCode.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        is_active: true,
        business_type: business.businessType,
        owner_name: business.ownerName,
        mobile: business.mobile,
        email: business.email || null,
        gst_number: business.gstNumber || null,
        fssai: business.fssai || null,
        country: business.country,
        state: business.state || null,
        city: business.city || null,
        timezone: business.timezone,
        currency: business.currency,
        language: business.language,
        company_code: companyCode,
        logo_url: business.logoDataUrl || null,
        onboarding_status: 'setup',
        onboarding_progress: {
          companyCreated: true,
          taxesConfigured: true,
          paymentSetup: false,
          menuImported: false,
          qrGenerated: false,
          tablesCreated: false,
          staffAdded: false,
          printerConnected: false,
          inventoryEnabled: false,
          kdsEnabled: false,
          live: false,
        },
      };

      const { error: companyError } = await supabase.from('companies').insert([companyRow]);
      if (companyError) {
        // Fallback minimal row for older schemas
        const { error: legacyErr } = await supabase.from('companies').insert([
          {
            id: companyId,
            name: business.companyName.trim(),
            subdomain: companyCode.toLowerCase(),
            is_active: true,
          },
        ]);
        if (legacyErr) throw legacyErr;
      }
      created.company = true;

      const trialEnds =
        business.trialDays > 0
          ? new Date(Date.now() + business.trialDays * 86400000).toISOString()
          : null;

      const { error: subError } = await supabase.from('company_subscriptions').upsert(
        {
          company_id: companyId,
          plan_id: business.planId === 'growth' ? 'professional' : business.planId,
          status: business.trialDays > 0 ? 'trialing' : 'active',
          trial_ends_at: trialEnds,
          billing_status: business.trialDays > 0 ? 'trial' : 'paid',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );
      if (subError) {
        // Minimal subscription without trial columns
        const { error: subLegacy } = await supabase.from('company_subscriptions').upsert(
          {
            company_id: companyId,
            plan_id: business.planId === 'growth' ? 'professional' : business.planId,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id' }
        );
        if (subLegacy) throw subLegacy;
      }
      created.sub = true;

      const outletId = uuidv4();
      const outletPayload: Record<string, unknown> = {
        id: outletId,
        name: `${business.companyName.trim()} Main`,
        location: [business.city, business.state, business.country].filter(Boolean).join(', ') || 'Main Branch',
        code: outletCode,
        is_active: true,
        company_id: companyId,
      };
      const { error: outletError } = await supabase.from('outlets').insert([outletPayload]);
      if (outletError) {
        const { data: outletData, error: outletLegacy } = await supabase
          .from('outlets')
          .insert([
            {
              name: `${business.companyName.trim()} Main`,
              location: business.city || 'Main Branch',
              code: outletCode,
              is_active: true,
              company_id: companyId,
            },
          ])
          .select('id')
          .single();
        if (outletLegacy) throw outletLegacy;
        created.outletId = outletData.id;
      } else {
        created.outletId = outletId;
      }

      // Seed settings cache row (best-effort; columns match phase1 / product_availability)
      try {
        await supabase.from('outlet_ops_settings').upsert(
          {
            outlet_id: created.outletId,
            inventory_tracking_enabled: false,
            allow_negative_stock: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'outlet_id' }
        );
      } catch {
        /* optional */
      }

      // Admin user invite placeholder (email may not create auth user without service role)
      let adminUserId: string | null = null;
      if (business.email) {
        try {
          const userId = uuidv4();
          const { error: userErr } = await supabase.from('users').insert([
            {
              id: userId,
              name: business.ownerName,
              email: business.email,
              phone: business.mobile,
              role: Role.ADMIN,
              company_id: companyId,
              outlet_id: created.outletId,
              is_active: true,
            },
          ]);
          if (!userErr) {
            adminUserId = userId;
            created.userId = userId;
          }
        } catch {
          /* users table shape varies */
        }
      }

      // Soft seed markers for taxes / order types via onboarding_progress + optional tables
      try {
        await supabase.from('onboarding_drafts').insert([
          {
            company_id: companyId,
            created_by: createdBy || null,
            status: 'setup',
            current_step: 3,
            draft_json: {
              seeded: {
                roles: DEFAULT_ROLES,
                taxes: DEFAULT_TAXES,
                payments: ['cash', 'upi', 'card'],
                orderTypes: ['dine_in', 'takeaway', 'delivery'],
                kitchen: 'Main Kitchen',
                cashCounter: 'Cash Counter 1',
              },
            },
          },
        ]);
      } catch {
        /* optional table */
      }

      return {
        companyId,
        companyCode,
        outletId: created.outletId!,
        outletCode,
        adminUserId,
        kitchenStationId: null,
        cashCounterLabel: 'Cash Counter 1',
      };
    } catch (err) {
      // Compensating cleanup
      try {
        if (created.userId) await supabase.from('users').delete().eq('id', created.userId);
        if (created.outletId) await supabase.from('outlets').delete().eq('id', created.outletId);
        if (created.sub) await supabase.from('company_subscriptions').delete().eq('company_id', companyId);
        if (created.company) await supabase.from('companies').delete().eq('id', companyId);
      } catch {
        /* best effort */
      }
      throw err;
    }
  },

  async updateOnboardingProgress(companyId: string, progress: Partial<OnboardingProgress>, live = false) {
    const patch: Record<string, unknown> = {
      onboarding_progress: progress,
      onboarding_status: live ? 'live' : 'setup',
    };
    await supabase.from('companies').update(patch).eq('id', companyId);
  },

  async saveDraft(draft: OnboardingDraft, createdBy?: string | null): Promise<string> {
    const payload = {
      company_id: draft.provisionResult?.companyId || null,
      created_by: createdBy || null,
      current_step: draft.stepIndex + 1,
      status: draft.provisionResult ? 'setup' : 'draft',
      draft_json: draft,
      updated_at: new Date().toISOString(),
    };
    if (draft.draftId) {
      const { error } = await supabase.from('onboarding_drafts').update(payload).eq('id', draft.draftId);
      if (error) throw error;
      return draft.draftId;
    }
    const { data, error } = await supabase.from('onboarding_drafts').insert([payload]).select('id').single();
    if (error) throw error;
    return data.id as string;
  },

  async listCompaniesWithOnboarding(): Promise<any[]> {
    const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const ids = (data || []).map((c) => String(c.id));
    let subs = new Map<string, any>();
    if (ids.length) {
      const { data: subData } = await supabase
        .from('company_subscriptions')
        .select('company_id, plan_id, status, billing_status, trial_ends_at')
        .in('company_id', ids);
      subs = new Map((subData || []).map((s: any) => [String(s.company_id), s]));
    }
    return (data || []).map((c) => {
      const s = subs.get(String(c.id));
      return {
        ...c,
        plan_id: s?.plan_id,
        subscription_status: s?.status,
        billing_status: s?.billing_status,
      };
    });
  },

  async listTrialRequests() {
    try {
      const { data, error } = await supabase
        .from('trial_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  async updateTrialStatus(id: string, status: string, convertedCompanyId?: string | null) {
    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (convertedCompanyId) payload.converted_company_id = convertedCompanyId;
    const { error } = await supabase.from('trial_requests').update(payload).eq('id', id);
    if (error) throw error;
  },

  async createTablesForOutlet(params: {
    outletId: string;
    floors: number;
    tablesPerFloor: number;
    zones: string[];
    companyId?: string | null;
  }): Promise<number> {
    // Matches scripts/dining_tables_schema.sql:
    // outlet_id, table_number, capacity, status, sort_order, is_active, company_id, qr_code_token
    const rows: Record<string, unknown>[] = [];
    let n = 1;
    for (let f = 1; f <= Math.max(1, params.floors); f++) {
      const zone = params.zones[f - 1] || `Floor ${f}`;
      for (let t = 1; t <= Math.max(1, params.tablesPerFloor); t++) {
        const tableNumber = params.floors > 1 ? `${zone.replace(/\s+/g, '')}-T${t}` : `T${n}`;
        rows.push({
          id: uuidv4(),
          outlet_id: params.outletId,
          company_id: params.companyId || null,
          table_number: tableNumber,
          capacity: 4,
          status: 'available',
          sort_order: n,
          is_active: true,
          qr_code_token: uuidv4().replace(/-/g, '').slice(0, 16),
        });
        n += 1;
      }
    }
    const { error } = await supabase.from('dining_tables').insert(rows);
    if (error) {
      const minimal = rows.map((r) => ({
        outlet_id: r.outlet_id,
        table_number: r.table_number,
        capacity: 4,
        status: 'available',
        is_active: true,
      }));
      const { error: e2 } = await supabase.from('dining_tables').insert(minimal);
      if (e2) throw e2;
      return minimal.length;
    }
    return rows.length;
  },

  async importMenuItems(params: {
    companyId: string;
    outletId: string;
    items: Array<{ category: string; name: string; price: number; description?: string; veg?: boolean | null }>;
  }): Promise<number> {
    if (!params.items.length) return 0;
    // Ensure categories
    const catNames = [...new Set(params.items.map((i) => i.category || 'General'))];
    const catIdByName = new Map<string, string>();
    for (const name of catNames) {
      const id = uuidv4();
      const { data, error } = await supabase
        .from('categories')
        .insert([{ id, name, company_id: params.companyId, is_active: true }])
        .select('id')
        .maybeSingle();
      if (!error && data?.id) catIdByName.set(name, data.id);
      else {
        const { data: existing } = await supabase
          .from('categories')
          .select('id')
          .eq('name', name)
          .eq('company_id', params.companyId)
          .maybeSingle();
        if (existing?.id) catIdByName.set(name, existing.id);
        else catIdByName.set(name, id);
      }
    }

    const products = params.items.map((item) => ({
      id: uuidv4(),
      name: item.name,
      selling_price: item.price,
      category_id: catIdByName.get(item.category || 'General') || null,
      company_id: params.companyId,
      is_active: true,
      item_type: 'ready_product',
      description: item.description || null,
    }));

    const { error } = await supabase.from('products').insert(products);
    if (error) throw error;
    return products.length;
  },

  async cloneMenuFromCompany(sourceCompanyId: string, targetCompanyId: string): Promise<number> {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', sourceCompanyId)
      .eq('is_active', true)
      .limit(5000);
    if (error) throw error;
    if (!products?.length) return 0;

    const clones = products.map((p: any) => ({
      ...p,
      id: uuidv4(),
      company_id: targetCompanyId,
      created_at: undefined,
      updated_at: undefined,
    }));
    // strip undefined
    const cleaned = clones.map((p) => {
      const row = { ...p };
      delete row.created_at;
      delete row.updated_at;
      return row;
    });
    const { error: insErr } = await supabase.from('products').insert(cleaned);
    if (insErr) {
      // minimal clone
      const minimal = products.map((p: any) => ({
        id: uuidv4(),
        name: p.name,
        selling_price: p.selling_price,
        company_id: targetCompanyId,
        is_active: true,
        item_type: p.item_type || 'ready_product',
      }));
      const { error: e2 } = await supabase.from('products').insert(minimal);
      if (e2) throw e2;
      return minimal.length;
    }
    return cleaned.length;
  },
};
