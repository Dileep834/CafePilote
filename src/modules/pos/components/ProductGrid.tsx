import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePOSStore } from '../store/usePOSStore';
import { usePOSFavoritesStore, type FavoriteSort } from '../store/usePOSFavoritesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  UtensilsCrossed,
  Heart,
  Plus,
  Minus,
  Search,
  Clock3,
  PackageX,
  HeartOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductAddonModal } from './ProductAddonModal';
import { useProductAvailabilityMap } from '@/modules/availability';
import { resolveCatalogItemType } from '@/modules/menu/lib/fetchCatalog';

const NEW_HIDE_AFTER_SALES = 5;

function isPosSellable(product: any): boolean {
  if (!product || product.is_active === false) return false;
  return resolveCatalogItemType(product) === 'ready_product';
}

const fetchProducts = async (companyId: string) => {
  const { ConnectivityService } = await import('@/modules/offline/services/ConnectivityService');
  const { CacheService } = await import('@/modules/offline/services/CacheService');
  const online = ConnectivityService.isOnline();
  const outletId = useTenantStore.getState().activeOutletId;

  const loadFromServer = async () => {
    // Prefer ready_product; many tenants still have null/legacy item_type
    // Include null company_id rows (legacy catalog) for the active company scope
    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_active', true)
      .order('name');
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    let { data, error } = await query;
    if (error) {
      // or() unsupported / RLS — plain company filter
      let plain = supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_active', true)
        .order('name');
      if (companyId) plain = plain.eq('company_id', companyId);
      const fb = await plain;
      if (fb.error) throw fb.error;
      data = fb.data;
    }

    const rows = (data || []).filter(isPosSellable);
    // If company scope returned nothing, try unscoped active sellables once
    if (!rows.length && companyId) {
      const { data: allActive, error: allErr } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_active', true)
        .order('name')
        .limit(5000);
      if (!allErr && allActive?.length) {
        return allActive.filter(isPosSellable);
      }
    }
    return rows;
  };

  if (online) {
    try {
      const data = await loadFromServer();
      // Warm cache in background — never block POS render on IndexedDB write
      if (data.length) {
        queueMicrotask(() => {
          void CacheService.putProducts(
            outletId,
            data.map((p: any) => ({ id: p.id, data: p }))
          ).then(() =>
            CacheService.putSetting('catalog_last_refreshed_at', new Date().toISOString(), outletId)
          );
        });
      }
      return data;
    } catch (err) {
      const cached = await CacheService.getPosProducts(companyId || null);
      if (cached.length) return cached;
      throw err;
    }
  }

  const cached = await CacheService.getPosProducts(companyId || null);
  if (!cached.length) {
    throw new Error(
      'No offline product cache. Go online once, open Sync Center → Refresh catalog, then try again.'
    );
  }
  return cached;
};

function prepMinutes(product: any) {
  const raw = Number(product.preparation_time ?? product.prep_time ?? product.prep_minutes);
  if (Number.isFinite(raw) && raw > 0) return Math.round(raw);
  const category = String((product.categories as any)?.name || '').toLowerCase();
  if (category.includes('beverage') || category.includes('coffee') || category.includes('shake'))
    return 5;
  if (category.includes('bread') || category.includes('fries') || category.includes('appetizer'))
    return 8;
  return 12;
}

function shouldOpenModifierSheet(product: any) {
  if (product.has_modifiers || product.allow_customization || product.is_combo) return true;
  if (Array.isArray(product.modifier_groups) && product.modifier_groups.length > 0) return true;
  if (Array.isArray(product.variants) && product.variants.length > 0) return true;
  const category = String((product.categories as any)?.name || '').toLowerCase();
  return ['pizza', 'burger', 'pasta', 'maggi', 'sandwich', 'fries', 'bread'].some((term) =>
    category.includes(term)
  );
}

function showNewBadge(product: any, soldCount: number) {
  if (soldCount >= NEW_HIDE_AFTER_SALES) return false;
  const dbSold = Number(product.sales_count ?? product.times_sold ?? 0);
  if (dbSold >= NEW_HIDE_AFTER_SALES) return false;
  const createdAt = product.created_at ? new Date(product.created_at).getTime() : 0;
  return Boolean(product.is_new || (createdAt && Date.now() - createdAt < 1000 * 60 * 60 * 24 * 21));
}

type ProductGridProps = {
  favoritesOnly?: boolean;
  onBrowseMenu?: () => void;
  onOpenFavorites?: () => void;
};

export function ProductGrid({
  favoritesOnly = false,
  onBrowseMenu,
  onOpenFavorites,
}: ProductGridProps) {
  const cart = usePOSStore((s) => s.cart);
  const addItem = usePOSStore((s) => s.addItem);
  const adjustProductQuantity = usePOSStore((s) => s.adjustProductQuantity);
  const searchQuery = usePOSStore((s) => s.searchQuery);
  const setSearchQuery = usePOSStore((s) => s.setSearchQuery);
  const byUser = usePOSFavoritesStore((s) => s.byUser);
  const pinnedByUser = usePOSFavoritesStore((s) => s.pinnedByUser);
  const metaByUser = usePOSFavoritesStore((s) => s.metaByUser);
  const isFavorite = usePOSFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = usePOSFavoritesStore((s) => s.toggleFavorite);
  const bumpOrderCount = usePOSFavoritesStore((s) => s.bumpOrderCount);
  const user = useAuthStore((s) => s.user);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const companyId = getScopedCompanyId(user);
  const outletId = activeOutletId || user?.outletId || null;
  const userKey = user?.id || user?.email || 'local-staff';
  const favList = useMemo(() => byUser[userKey] || [], [byUser, userKey]);
  const pinnedList = useMemo(() => pinnedByUser[userKey] || [], [pinnedByUser, userKey]);
  const favMeta = useMemo(() => metaByUser[userKey] || {}, [metaByUser, userKey]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFavoritesFilter, setShowFavoritesFilter] = useState(favoritesOnly);
  const [favSort, setFavSort] = useState<FavoriteSort>('recent');
  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState('');
  const [selectedProductForAddons, setSelectedProductForAddons] = useState<any | null>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const catSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowFavoritesFilter(favoritesOnly);
  }, [favoritesOnly]);

  useEffect(() => {
    if (!catOpen) return;
    catSearchRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      if (!catRef.current?.contains(e.target as Node)) setCatOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [catOpen]);

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['pos-products', companyId, activeOutletId],
    queryFn: () => fetchProducts(companyId),
  });

  const { map: availabilityMap } = useProductAvailabilityMap(
    outletId,
    (products as any[]) || [],
    'pos'
  );

  const qtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart) {
      map.set(item.productId, (map.get(item.productId) || 0) + item.quantity);
    }
    return map;
  }, [cart]);

  const handleQuickAdd = (product: any) => {
    const availability = availabilityMap.get(product.id);
    // While availability is still loading, allow sell (fail-open for POS speed)
    if (availability && !availability.canSell) return;
    if (shouldOpenModifierSheet(product) && !(qtyByProduct.get(product.id) || 0)) {
      setSelectedProductForAddons(product);
      return;
    }
    addItem(product);
    bumpOrderCount(product.id);
  };

  const categoryNames = useMemo(() => {
    if (!products) return [] as string[];
    const cats = new Set<string>();
    products.forEach((p) => {
      const name = (p.categories as any)?.name;
      if (name) cats.add(name);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredCategories = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    if (!q) return categoryNames;
    return categoryNames.filter((c) => c.toLowerCase().includes(q));
  }, [categoryNames, catQuery]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const favSet = new Set(favList);
    const pinnedSet = new Set(pinnedList);
    const wantFav = favoritesOnly || showFavoritesFilter;

    let list = products.filter((p) => {
      if (wantFav && !favSet.has(p.id)) return false;
      if (!wantFav && selectedCategory !== 'All' && (p.categories as any)?.name !== selectedCategory)
        return false;
      const searchLower = searchQuery.toLowerCase().trim();
      if (
        searchLower &&
        !p.name.toLowerCase().includes(searchLower) &&
        !(p.barcode && p.barcode.toLowerCase().includes(searchLower))
      ) {
        return false;
      }
      return true;
    });

    if (wantFav) {
      list = [...list].sort((a, b) => {
        const ap = pinnedSet.has(a.id) ? 0 : 1;
        const bp = pinnedSet.has(b.id) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        if (favSort === 'az') return a.name.localeCompare(b.name);
        if (favSort === 'price') return Number(a.selling_price || 0) - Number(b.selling_price || 0);
        if (favSort === 'ordered')
          return (favMeta[b.id]?.orderCount || 0) - (favMeta[a.id]?.orderCount || 0);
        return favList.indexOf(b.id) - favList.indexOf(a.id);
      });
    }

    return list;
  }, [
    products,
    selectedCategory,
    searchQuery,
    favoritesOnly,
    showFavoritesFilter,
    favList,
    pinnedList,
    favSort,
    favMeta,
  ]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 p-1 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white p-1.5">
            <div className="mb-1.5 aspect-[5/3] rounded-lg bg-slate-100" />
            <div className="mb-1 h-3 w-3/4 rounded bg-slate-100" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-red-600">
        <p className="font-medium">Error loading products</p>
        <p className="max-w-md text-xs text-red-500/90">
          {(error as Error)?.message || 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col xl:h-full xl:overflow-hidden">
      {/* Sticky chrome: filters + single search */}
      <div className="sticky top-0 z-20 space-y-2 bg-slate-100/95 pb-2 backdrop-blur-md">
        {favoritesOnly && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-slate-900">Favourites</p>
            <select
              className="h-8 rounded-lg bg-white px-2 text-xs font-medium text-slate-600 outline-none ring-1 ring-slate-200"
              value={favSort}
              onChange={(e) => setFavSort(e.target.value as FavoriteSort)}
            >
              <option value="recent">Recently Added</option>
              <option value="ordered">Most Ordered</option>
              <option value="price">Price</option>
              <option value="az">A–Z</option>
            </select>
          </div>
        )}

        {!favoritesOnly && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setShowFavoritesFilter(false);
                setSelectedCategory('All');
              }}
              className={cn(
                'h-9 rounded-lg px-3 text-sm font-semibold transition',
                !showFavoritesFilter && selectedCategory === 'All'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenFavorites) onOpenFavorites();
                else setShowFavoritesFilter(true);
              }}
              className={cn(
                'h-9 rounded-lg px-3 text-sm font-semibold transition',
                showFavoritesFilter
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              Favourites
            </button>

            <div className="relative" ref={catRef}>
              <button
                type="button"
                onClick={() => {
                  setShowFavoritesFilter(false);
                  setCatOpen((o) => !o);
                  setCatQuery('');
                }}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition',
                  !showFavoritesFilter && selectedCategory !== 'All'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {selectedCategory !== 'All' ? selectedCategory : 'Categories'}
                <ChevronDown className={cn('h-4 w-4', catOpen && 'rotate-180')} />
              </button>

              {catOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-64 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
                  <div className="border-b border-slate-100 p-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={catSearchRef}
                        type="search"
                        value={catQuery}
                        onChange={(e) => setCatQuery(e.target.value)}
                        placeholder="Search categories…"
                        className="h-9 w-full rounded-lg bg-slate-50 pl-8 pr-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-orange/25"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setCatOpen(false);
                          if (e.key === 'Enter' && filteredCategories[0]) {
                            setSelectedCategory(filteredCategories[0]);
                            setShowFavoritesFilter(false);
                            setCatOpen(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    <button
                      type="button"
                      className="flex w-full px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setSelectedCategory('All');
                        setShowFavoritesFilter(false);
                        setCatOpen(false);
                      }}
                    >
                      All categories
                    </button>
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={cn(
                          'flex w-full px-3 py-2 text-left text-sm hover:bg-slate-50',
                          selectedCategory === cat
                            ? 'font-semibold text-brand-orange'
                            : 'font-medium text-slate-700'
                        )}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setShowFavoritesFilter(false);
                          setCatOpen(false);
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                    {filteredCategories.length === 0 && (
                      <p className="px-3 py-4 text-center text-xs text-slate-400">No matches</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={showFavoritesFilter || favoritesOnly ? 'Search favourites…' : 'Search menu…'}
            className="h-10 w-full rounded-xl bg-white pl-10 pr-3 text-sm font-medium text-slate-800 shadow-sm outline-none ring-1 ring-slate-200/80 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-orange/25"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
        {filteredProducts.length === 0 ? (
          favoritesOnly || showFavoritesFilter ? (
            <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-14 text-center">
              <HeartOff className="mb-3 h-10 w-10 text-slate-300" strokeWidth={1.5} />
              <p className="text-base font-semibold text-slate-900">No favourites yet</p>
              <p className="mt-1 text-sm text-slate-500">Tap the heart on any menu item.</p>
              <Button
                type="button"
                className="mt-5 h-10 rounded-xl bg-brand-orange px-5 font-semibold text-white hover:bg-[#e55f00]"
                onClick={() => {
                  setShowFavoritesFilter(false);
                  onBrowseMenu?.();
                }}
              >
                Browse Menu
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <UtensilsCrossed className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm font-medium text-slate-500">
                {!products?.length
                  ? 'No products loaded'
                  : searchQuery.trim()
                    ? 'No products match your search'
                    : 'No products match'}
              </p>
              {!products?.length ? (
                <p className="mt-2 max-w-sm text-xs text-slate-500">
                  Open Sync Center → Refresh catalog while online, or check Products master for this
                  company.
                </p>
              ) : null}
            </div>
          )
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7">
            {filteredProducts.map((product) => {
              const availability = availabilityMap.get(product.id);
              // Fail-open: only block when we know canSell is false (never while loading)
              const blocked = Boolean(availability && !availability.canSell);
              const hiddenByPolicy = availability ? !availability.canShow : false;
              if (hiddenByPolicy) return null;
              const minutes = prepMinutes(product);
              const qty = qtyByProduct.get(product.id) || 0;
              const fav = isFavorite(product.id);
              const sold = favMeta[product.id]?.orderCount || 0;
              const isNew = showNewBadge(product, sold);

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => handleQuickAdd(product)}
                  className={cn(
                    'group relative flex flex-col rounded-xl bg-white p-1.5 text-left shadow-sm transition',
                    blocked
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:shadow-md active:scale-[0.98]'
                  )}
                >
                  <div className="relative mb-1.5 aspect-[5/3] w-full overflow-hidden rounded-lg bg-slate-100">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <UtensilsCrossed className="h-5 w-5 opacity-40" />
                      </div>
                    )}
                    {isNew && (
                      <span className="absolute left-1 top-1 rounded bg-emerald-500 px-1 py-px text-[8px] font-bold uppercase text-white">
                        New
                      </span>
                    )}
                    {availability && availability.badge !== 'Available' && (
                      <span className="absolute bottom-1 left-1 rounded bg-white/95 px-1.5 py-px text-[8px] font-bold uppercase text-slate-700 shadow-sm">
                        {availability.badge}
                      </span>
                    )}
                    {blocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                        <PackageX className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      className={cn(
                        'absolute right-1 top-1 rounded-full bg-white/90 p-1',
                        fav ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                      aria-label={fav ? 'Remove favourite' : 'Add favourite'}
                    >
                      <Heart className={cn('h-3.5 w-3.5', fav && 'fill-rose-500')} />
                    </button>
                  </div>

                  <p className="line-clamp-2 min-h-[2.25em] px-0.5 text-sm font-medium leading-snug text-slate-900">
                    {product.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-1 px-0.5">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold tabular-nums text-brand-orange">
                        {formatCurrency(product.selling_price || 0)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-0.5 text-xs text-slate-400">
                        <Clock3 className="h-3 w-3" />
                        {minutes} min
                      </p>
                    </div>
                    {blocked ? (
                      <Badge variant="outline" className="border-rose-200 text-[10px] text-rose-600">
                        {availability?.badge || 'Unavailable'}
                      </Badge>
                    ) : qty > 0 ? (
                      <div
                        className="flex h-8 items-center rounded-full bg-slate-900 px-0.5 text-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          role="button"
                          tabIndex={0}
                          className="flex h-7 w-7 items-center justify-center"
                          onClick={() => adjustProductQuantity(product.id, -1)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && adjustProductQuantity(product.id, -1)
                          }
                          aria-label={`Decrease ${product.name}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-[1rem] text-center text-xs font-bold">{qty}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange"
                          onClick={() => {
                            adjustProductQuantity(product.id, 1);
                            bumpOrderCount(product.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              adjustProductQuantity(product.id, 1);
                              bumpOrderCount(product.id);
                            }
                          }}
                          aria-label={`Increase ${product.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    ) : (
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white"
                        aria-hidden
                      >
                        <Plus className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ProductAddonModal
        isOpen={!!selectedProductForAddons}
        onClose={() => setSelectedProductForAddons(null)}
        product={selectedProductForAddons}
        allProducts={products || []}
      />
    </div>
  );
}
