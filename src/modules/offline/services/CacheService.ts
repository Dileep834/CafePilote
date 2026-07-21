import { getOfflineDB } from '../db/CafePilotsOfflineDB';
import { createSyncableBase, nowIso } from '../lib/ids';
import { ConnectivityService } from './ConnectivityService';
import { supabase } from '@/lib/supabase';

export type CatalogCacheStatus = {
  products: number;
  recipes: number;
  taxes: number;
  settings: number;
  lastRefreshedAt: string | null;
  ready: boolean;
};

/**
 * CacheService — products, recipes, taxes, settings for offline POS.
 * Refresh while online; POS falls back to this cache when offline.
 */
export const CacheService = {
  async putProducts(outletId: string | null, products: Array<{ id: string; data: unknown }>) {
    const db = getOfflineDB();
    const rows = products.map((p) => ({
      ...createSyncableBase({ sync_status: 'SYNCED' }),
      outlet_id: outletId,
      product_id: p.id,
      data: p.data,
    }));
    await db.products_cache.bulkPut(rows);
  },

  async getProducts(outletId?: string | null) {
    const all = await getOfflineDB().products_cache.toArray();
    if (!outletId) return all;
    return all.filter((p) => !p.outlet_id || p.outlet_id === outletId);
  },

  /** POS-ready product rows (same shape as online fetch when possible). */
  async getPosProducts(companyId?: string | null): Promise<any[]> {
    const { resolveCatalogItemType } = await import('@/modules/menu/lib/fetchCatalog');
    const rows = await getOfflineDB().products_cache.toArray();
    return rows
      .map((r) => r.data as any)
      .filter((p) => {
        if (!p || p.is_active === false) return false;
        if (companyId && p.company_id && String(p.company_id) !== String(companyId)) return false;
        return resolveCatalogItemType(p) === 'ready_product';
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  },

  async putSetting(cacheKey: string, value: unknown, outletId?: string | null) {
    const existing = await getOfflineDB().settings_cache.where('cache_key').equals(cacheKey).first();
    await getOfflineDB().settings_cache.put({
      ...(existing || createSyncableBase({ sync_status: 'SYNCED' })),
      cache_key: cacheKey,
      value,
      outlet_id: outletId ?? null,
      updated_at: nowIso(),
      sync_status: 'SYNCED',
      version: (existing?.version || 0) + 1,
    });
  },

  async getSetting<T = unknown>(cacheKey: string): Promise<T | null> {
    const row = await getOfflineDB().settings_cache.where('cache_key').equals(cacheKey).first();
    return (row?.value as T) ?? null;
  },

  async getStatus(): Promise<CatalogCacheStatus> {
    const db = getOfflineDB();
    const [products, recipes, taxes, settings, meta] = await Promise.all([
      db.products_cache.count(),
      db.recipes_cache.count(),
      db.tax_cache.count(),
      db.settings_cache.count(),
      this.getSetting<string>('catalog_last_refreshed_at'),
    ]);
    return {
      products,
      recipes,
      taxes,
      settings,
      lastRefreshedAt: meta,
      ready: products > 0,
    };
  },

  async refreshFromServer(options?: {
    outletId?: string | null;
    companyId?: string | null;
  }): Promise<CatalogCacheStatus> {
    if (!ConnectivityService.isOnline()) {
      return this.getStatus();
    }

    const outletId = options?.outletId ?? null;
    const companyId = options?.companyId ?? null;

    try {
      // Prefer all active sellables; resolve ready vs raw client-side (legacy null item_type)
      let q = supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_active', true)
        .order('name')
        .limit(10000);
      if (companyId) {
        q = q.or(`company_id.eq.${companyId},company_id.is.null`);
      }

      let { data, error } = await q;
      if (error) {
        let plain = supabase
          .from('products')
          .select('*, categories(name)')
          .eq('is_active', true)
          .order('name')
          .limit(10000);
        if (companyId) plain = plain.eq('company_id', companyId);
        const fb = await plain;
        if (fb.error) throw fb.error;
        data = fb.data;
      }

      const { resolveCatalogItemType } = await import('@/modules/menu/lib/fetchCatalog');
      let sellable = (data || []).filter((p) => resolveCatalogItemType(p) === 'ready_product');

      if (!sellable.length && companyId) {
        const { data: allActive } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('is_active', true)
          .order('name')
          .limit(10000);
        sellable = (allActive || []).filter((p) => resolveCatalogItemType(p) === 'ready_product');
      }

      if (sellable.length) {
        const db = getOfflineDB();
        const existing = await db.products_cache.toArray();
        const toDelete = existing
          .filter((row) => {
            const p = row.data as { company_id?: string } | null;
            if (!companyId) return true;
            return !p?.company_id || p.company_id === companyId;
          })
          .map((r) => r.id);
        if (toDelete.length) await db.products_cache.bulkDelete(toDelete);

        await this.putProducts(
          outletId,
          sellable.map((p) => ({ id: p.id, data: p }))
        );
      }
    } catch {
      /* cache refresh best-effort */
    }

    try {
      const { data: recipes, error: recipesErr } = await supabase
        .from('recipes')
        .select('*')
        .limit(5000);
      if (!recipesErr && recipes?.length) {
        const db = getOfflineDB();
        await db.recipes_cache.bulkPut(
          recipes.map((r) => ({
            ...createSyncableBase({ sync_status: 'SYNCED' }),
            outlet_id: outletId,
            recipe_id: r.id,
            data: r,
          }))
        );
      }
    } catch {
      /* optional */
    }

    // Tax lives in client settings store (no tax_settings table) — cache local snapshot
    try {
      const { useSettingsStore } = await import('@/store/useSettingsStore');
      const tax = useSettingsStore.getState();
      await this.putSetting(
        'tax_snapshot',
        {
          taxMode: tax.taxMode,
          defaultTaxRate: tax.defaultTaxRate,
          taxInclusive: tax.taxInclusive,
          serviceChargeMode: tax.serviceChargeMode,
          serviceChargeValue: tax.serviceChargeValue,
          roundingRule: tax.roundingRule,
        },
        outletId
      );
    } catch {
      /* optional */
    }

    await this.putSetting('catalog_last_refreshed_at', nowIso(), outletId);
    return this.getStatus();
  },
};
