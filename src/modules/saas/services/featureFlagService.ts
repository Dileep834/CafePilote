import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

type FlagState = {
  flags: Record<string, boolean>;
  hydrate: (companyId?: string | null, outletId?: string | null) => Promise<void>;
  isEnabled: (key: string, fallback?: boolean) => boolean;
  setLocal: (key: string, enabled: boolean) => void;
};

const DEFAULTS: Record<string, boolean> = {
  'bi.executive': true,
  'ai.copilot': true,
  'api.platform': true,
  'offline.billing': false,
  'observability.panel': true,
  'franchise.royalty': false,
  'marketing.automation': false,
};

export const useFeatureFlagStore = create<FlagState>()(
  persist(
    (set, get) => ({
      flags: { ...DEFAULTS },

      hydrate: async (companyId, outletId) => {
        try {
          let q = supabase.from('feature_flags').select('flag_key, enabled, outlet_id');
          if (companyId) q = q.eq('company_id', companyId);
          const { data } = await q;
          if (!data?.length) return;
          const next = { ...get().flags };
          for (const row of data) {
            if (row.outlet_id && outletId && row.outlet_id !== outletId) continue;
            next[row.flag_key] = Boolean(row.enabled);
          }
          set({ flags: next });
        } catch {
          /* optional */
        }
      },

      isEnabled: (key, fallback = false) => {
        const v = get().flags[key];
        if (typeof v === 'boolean') return v;
        return DEFAULTS[key] ?? fallback;
      },

      setLocal: (key, enabled) => set((s) => ({ flags: { ...s.flags, [key]: enabled } })),
    }),
    { name: 'cafepilots-feature-flags' }
  )
);

export async function recordHealthEvent(params: {
  companyId?: string | null;
  outletId?: string | null;
  component: string;
  severity?: 'info' | 'warn' | 'critical';
  message: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from('system_health_events').insert([
      {
        company_id: params.companyId || null,
        outlet_id: params.outletId || null,
        component: params.component,
        severity: params.severity || 'info',
        message: params.message,
        meta: params.meta || null,
      },
    ]);
  } catch {
    /* optional */
  }
}

export async function fetchRecentHealthEvents(limit = 40) {
  try {
    const { data } = await supabase
      .from('system_health_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  } catch {
    return [];
  }
}
