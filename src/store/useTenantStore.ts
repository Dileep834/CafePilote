import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';
import {
  getPlanLimits,
  normalizePlanId,
  type SubscriptionPlanId,
  type PlanLimits,
} from '@/lib/planLimits';
import { HQ_COMPANY_ID, HQ_COMPANY_NAME } from '@/constants';
import { canSwitchBranchesByRole, isSuperAdmin } from '@/lib/access';

/**
 * Super Admin always belongs to CafePilots HQ (platform owner).
 * Never inherit a customer company (e.g. Backbenchers) from a stale login cache.
 */
function resolveCompanyId(user: User): string {
  if (isSuperAdmin(user)) return HQ_COMPANY_ID;
  const raw = user.companyId;
  if (!raw || raw === 'SYSTEM' || raw === 'default-company') {
    return HQ_COMPANY_ID;
  }
  return raw;
}

export type TenantOutlet = {
  id: string;
  name: string;
  location?: string;
  companyId: string;
  isActive: boolean;
};

interface TenantState {
  companyId: string | null;
  companyName: string | null;
  activeOutletId: string | null;
  outlets: TenantOutlet[];
  planId: SubscriptionPlanId;
  isLoading: boolean;
  lastError: string | null;

  /** Call after login / on ERP mount */
  hydrateFromUser: (user: User | null) => Promise<void>;
  setActiveOutletId: (outletId: string) => void;
  setPlanId: (planId: SubscriptionPlanId) => void;
  clear: () => void;

  canSwitchBranch: (user: User | null) => boolean;
  plan: () => PlanLimits;
  /** Resolved outlet for data queries */
  resolvedOutletId: (user?: User | null) => string;
}

function demoOutlets(companyId: string, userOutletId?: string): TenantOutlet[] {
  const mainId = userOutletId && userOutletId !== 'current-outlet' ? userOutletId : 'current-outlet';
  return [
    {
      id: mainId,
      name: 'Main Branch',
      location: 'Primary location',
      companyId,
      isActive: true,
    },
  ];
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      companyId: null,
      companyName: null,
      activeOutletId: null,
      outlets: [],
      planId: 'professional',
      isLoading: false,
      lastError: null,

      canSwitchBranch: (user) => {
        if (!user) return false;
        return canSwitchBranchesByRole(user);
      },

      plan: () => getPlanLimits(get().planId),

      resolvedOutletId: (user) => {
        const active = get().activeOutletId;
        if (active) return active;
        if (user?.outletId) return user.outletId;
        return 'current-outlet';
      },

      setActiveOutletId: (outletId) => {
        const hit = get().outlets.find((o) => o.id === outletId);
        if (!hit && get().outlets.length > 0) return;
        set({ activeOutletId: outletId });
      },

      setPlanId: (planId) => set({ planId }),

      clear: () =>
        set({
          companyId: null,
          companyName: null,
          activeOutletId: null,
          outlets: [],
          lastError: null,
        }),

      hydrateFromUser: async (user) => {
        if (!user) {
          get().clear();
          return;
        }

        const companyId = resolveCompanyId(user);
        const sa = isSuperAdmin(user);
        set({ isLoading: true, lastError: null, companyId });

        // Fix stale auth-storage that still has Backbenchers (or SYSTEM) on Super Admin
        if (sa && user.companyId !== HQ_COMPANY_ID) {
          try {
            const { useAuthStore } = await import('@/store/useAuthStore');
            const cur = useAuthStore.getState().user;
            if (cur && cur.id === user.id) {
              useAuthStore.setState({
                user: { ...cur, companyId: HQ_COMPANY_ID },
              });
            }
          } catch {
            /* ignore */
          }
        }

        let outlets: TenantOutlet[] = [];
        let companyName: string | null = sa ? HQ_COMPANY_NAME : null;
        // Do not keep a stale persisted plan when hydrating — prefer DB
        let planId: SubscriptionPlanId = sa ? 'enterprise' : 'professional';

        try {
          const { data: company } = await supabase
            .from('companies')
            .select('id, name, subdomain')
            .eq('id', companyId)
            .maybeSingle();

          if (company?.name) {
            companyName = company.name;
          } else if (companyId === HQ_COMPANY_ID) {
            companyName = HQ_COMPANY_NAME;
            void supabase.from('companies').upsert(
              {
                id: HQ_COMPANY_ID,
                name: HQ_COMPANY_NAME,
                subdomain: 'cafepilots-hq',
                is_active: true,
              },
              { onConflict: 'id' }
            );
          }
        } catch {
          /* offline */
        }

        if (sa) companyName = HQ_COMPANY_NAME;
        if (!companyName) {
          companyName = companyId === HQ_COMPANY_ID ? HQ_COMPANY_NAME : 'Company';
        }

        try {
          const { data: sub } = await supabase
            .from('company_subscriptions')
            .select('plan_id')
            .eq('company_id', companyId)
            .maybeSingle();
          if (sub?.plan_id) {
            planId = normalizePlanId(sub.plan_id);
          } else if (sa) {
            planId = 'enterprise';
          }
        } catch {
          if (sa) planId = 'enterprise';
        }

        try {
          let query = supabase.from('outlets').select('*').eq('is_active', true).order('name');
          // Tenant admins only need their company's branches; Super Admin sees all.
          if (!sa) query = query.eq('company_id', companyId);
          const { data, error } = await query;
          if (error) throw error;
          const rows = (data || []) as any[];
          outlets = rows
            .filter((r) => sa || !r.company_id || r.company_id === companyId)
            .map((r) => ({
              id: String(r.id),
              name: r.name || r.code || 'Branch',
              location: r.location || undefined,
              companyId: r.company_id || companyId,
              isActive: r.is_active !== false,
            }));
          // Super Admin: prefer HQ outlets first in the branch list
          if (sa) {
            outlets.sort((a, b) => {
              const aHq = a.companyId === HQ_COMPANY_ID ? 0 : 1;
              const bHq = b.companyId === HQ_COMPANY_ID ? 0 : 1;
              if (aHq !== bHq) return aHq - bHq;
              return a.name.localeCompare(b.name);
            });
          }
        } catch {
          outlets = [];
        }

        if (outlets.length === 0) {
          outlets = demoOutlets(companyId, user.outletId);
        }

        const canSwitch = get().canSwitchBranch(user);
        let activeOutletId = get().activeOutletId;
        if (!canSwitch && user.outletId) {
          activeOutletId = user.outletId;
        } else if (!activeOutletId || !outlets.some((o) => o.id === activeOutletId)) {
          // Prefer user's outlet, else first HQ outlet for Super Admin
          const hqFirst = outlets.find((o) => o.companyId === HQ_COMPANY_ID)?.id;
          activeOutletId =
            (user.outletId && outlets.find((o) => o.id === user.outletId)?.id) ||
            (sa ? hqFirst : null) ||
            outlets[0]?.id ||
            null;
        }

        set({
          companyId,
          companyName,
          outlets,
          activeOutletId,
          planId,
          isLoading: false,
        });
      },
    }),
    {
      name: 'cafepilots-tenant',
      partialize: (s) => ({
        companyId: s.companyId,
        activeOutletId: s.activeOutletId,
        planId: s.planId,
      }),
    }
  )
);

/** Hook-friendly outlet id for modules */
export function getTenantOutletId(user?: User | null): string {
  return useTenantStore.getState().resolvedOutletId(user);
}

export function getTenantCompanyId(user?: User | null): string {
  const fromStore = useTenantStore.getState().companyId;
  if (fromStore) return fromStore;
  if (user?.companyId && user.companyId !== 'SYSTEM' && user.companyId !== 'default-company') {
    return user.companyId;
  }
  return HQ_COMPANY_ID;
}
