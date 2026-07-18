import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';
import {
  getPlanLimits,
  type SubscriptionPlanId,
  type PlanLimits,
} from '@/lib/planLimits';

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
      planId: 'growth',
      isLoading: false,
      lastError: null,

      canSwitchBranch: (user) => {
        if (!user) return false;
        return user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Outlet Owner';
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

        const companyId = user.companyId || 'default-company';
        set({ isLoading: true, lastError: null, companyId });

        let outlets: TenantOutlet[] = [];
        let companyName: string | null = null;
        let planId: SubscriptionPlanId = get().planId || 'growth';

        try {
          const { data: company } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', companyId)
            .maybeSingle();
          if (company?.name) companyName = company.name;
        } catch {
          /* offline */
        }

        try {
          const { data: sub } = await supabase
            .from('company_subscriptions')
            .select('plan_id')
            .eq('company_id', companyId)
            .maybeSingle();
          if (sub?.plan_id === 'starter' || sub?.plan_id === 'growth' || sub?.plan_id === 'enterprise') {
            planId = sub.plan_id;
          }
        } catch {
          /* table may not exist yet */
        }

        try {
          let query = supabase.from('outlets').select('*').eq('is_active', true).order('name');
          // Prefer company filter when column exists
          const { data, error } = await query;
          if (error) throw error;
          const rows = (data || []) as any[];
          outlets = rows
            .filter((r) => !r.company_id || r.company_id === companyId || user.role === 'Super Admin')
            .map((r) => ({
              id: String(r.id),
              name: r.name || r.code || 'Branch',
              location: r.location || undefined,
              companyId: r.company_id || companyId,
              isActive: r.is_active !== false,
            }));
        } catch {
          outlets = [];
        }

        if (outlets.length === 0) {
          outlets = demoOutlets(companyId, user.outletId);
          companyName = companyName || 'CafePilots Demo';
        }

        // Staff locked to their outlet when set
        const canSwitch = get().canSwitchBranch(user);
        let activeOutletId = get().activeOutletId;
        if (!canSwitch && user.outletId) {
          activeOutletId = user.outletId;
        } else if (!activeOutletId || !outlets.some((o) => o.id === activeOutletId)) {
          activeOutletId =
            (user.outletId && outlets.find((o) => o.id === user.outletId)?.id) ||
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
  return useTenantStore.getState().companyId || user?.companyId || 'default-company';
}
