import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCustomerOrderStore } from '../store/useCustomerOrderStore';
import { useGuestAuthStore } from '../store/useGuestAuthStore';
import { resolveTableByQrDetailed } from '@/modules/tables/lib/resolveTableByQr';
import { formatCurrency } from '@/utils/format';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { APP_TAGLINE, BRAND } from '@/constants';
import {
  Plus,
  ShoppingBag,
  UtensilsCrossed,
  Leaf,
  Drumstick,
  Droplet,
  Loader2,
  Clock3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useProductAvailabilityMap } from '@/modules/availability';
import { CustomerCartModal } from './CustomerCartModal';
import { GuestLogin } from './GuestLogin';
import { GuestOrderStatus } from './GuestOrderStatus';
import type { Table } from '@/types';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import { FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

function safePrice(p: any) {
  return Number(p.selling_price || p.sellingPrice || 0);
}

function dietaryIcon(pref: string) {
  const p = (pref || 'veg').toLowerCase();
  if (p === 'veg') return <Leaf className="w-3.5 h-3.5 text-green-600" />;
  if (p === 'non-veg') return <Drumstick className="w-3.5 h-3.5 text-red-500" />;
  if (p === 'jain') return <Droplet className="w-3.5 h-3.5" style={{ color: BRAND.orange }} />;
  if (p === 'egg') return <Leaf className="w-3.5 h-3.5 text-amber-500" />;
  return null;
}

function ProductListCard({
  product,
  onAdd,
  blocked,
  badge,
}: {
  product: any;
  onAdd: () => void;
  blocked?: boolean;
  badge?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-3 flex gap-3 border border-black/[0.04] shadow-[0_4px_16px_rgba(13,27,42,0.04)]">
      <div
        className="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative"
        style={{ backgroundColor: BRAND.cream }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: BRAND.steel }}>
            <UtensilsCrossed className="w-7 h-7 opacity-30" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 bg-white/95 rounded-md p-0.5 shadow-sm">
          {dietaryIcon(product.dietary_preference)}
        </div>
      </div>
      <div className="flex flex-col flex-1 min-w-0 py-0.5">
        <h3 className="font-bold leading-snug mb-0.5" style={{ color: BRAND.navy }}>
          {product.name}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{product.categories?.name || 'Menu'}</p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="font-extrabold text-lg" style={{ color: BRAND.orange }}>
            {formatCurrency(safePrice(product))}
          </span>
          {blocked ? (
            <Badge variant="outline" className="border-rose-200 text-rose-600">
              {badge || 'Out Of Stock'}
            </Badge>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              aria-label={`Add ${product.name}`}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white active:scale-95 shadow-md"
              style={{ backgroundColor: BRAND.orange, boxShadow: `0 6px 16px ${BRAND.orange}40` }}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductGridCard({
  product,
  onAdd,
  blocked,
  badge,
}: {
  product: any;
  onAdd: () => void;
  blocked?: boolean;
  badge?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-2.5 flex flex-col border border-black/[0.04] shadow-[0_4px_16px_rgba(13,27,42,0.04)]">
      <div
        className="relative w-full aspect-square rounded-xl overflow-hidden mb-2"
        style={{ backgroundColor: BRAND.cream }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: BRAND.steel }}>
            <UtensilsCrossed className="w-8 h-8 opacity-30" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 bg-white/95 rounded-md p-0.5 shadow-sm">
          {dietaryIcon(product.dietary_preference)}
        </div>
      </div>
      <h3 className="font-bold text-[12px] leading-snug line-clamp-2 min-h-[2.4em]" style={{ color: BRAND.navy }}>
        {product.name}
      </h3>
      <p className="text-[10px] text-slate-500 truncate mt-0.5 mb-2">{product.categories?.name || 'Menu'}</p>
      <div className="mt-auto flex items-center justify-between gap-1">
        <span className="font-extrabold text-sm tabular-nums" style={{ color: BRAND.orange }}>
          {formatCurrency(safePrice(product))}
        </span>
        {blocked ? (
          <Badge variant="outline" className="border-rose-200 px-1.5 text-[10px] text-rose-600">
            {badge || 'OOS'}
          </Badge>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${product.name}`}
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white active:scale-95 shadow-md"
            style={{ backgroundColor: BRAND.orange, boxShadow: `0 6px 16px ${BRAND.orange}40` }}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function CustomerMenu() {
  const { outletId, qrToken } = useParams();
  const { setSession, addItem, getItemCount, getCartTotal } = useCustomerOrderStore();
  const { guest, isReady, initFromSupabase, signOut } = useGuestAuthStore();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [table, setTable] = useState<Table | null>(null);
  const [resolving, setResolving] = useState(true);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [view, setView] = useState<'menu' | 'status'>('menu');
  const [authGateOpen, setAuthGateOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem('cafepilots-guest-menu-layout');
      return saved === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  });
  const pageSwiperRef = useRef<SwiperInstance | null>(null);
  const chipSwiperRef = useRef<SwiperInstance | null>(null);

  const setLayout = (mode: 'list' | 'grid') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('cafepilots-guest-menu-layout', mode);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void initFromSupabase();
  }, [initFromSupabase]);

  // Register table context as soon as QR resolves so login can write guest_sessions
  useEffect(() => {
    if (!table) return;
    const publishCtx = async () => {
      let companyId: string | null = null;
      if (table.outletId && table.outletId !== 'current-outlet') {
        const { data: outletRow } = await supabase
          .from('outlets')
          .select('company_id')
          .eq('id', table.outletId)
          .maybeSingle();
        companyId = outletRow?.company_id ? String(outletRow.company_id) : null;
      }
      const ctx = {
        outletId: table.outletId,
        tableId: table.id,
        tableNumber: table.tableNumber,
        companyId,
      };
      useGuestAuthStore.getState().setSessionContext(ctx);
      if (useGuestAuthStore.getState().guest) {
        void useGuestAuthStore.getState().registerPresence(ctx);
      }
    };
    void publishCtx();
  }, [table]);

  // When guest is signed in with a table, publish / refresh presence
  useEffect(() => {
    if (!guest || !table) return;
    const tick = async () => {
      const ctx = useGuestAuthStore.getState().sessionContext || {
        outletId: table.outletId,
        tableId: table.id,
        tableNumber: table.tableNumber,
      };
      // Ensure company_id is set for CRM isolation
      if (!ctx.companyId && table.outletId) {
        const { data: outletRow } = await supabase
          .from('outlets')
          .select('company_id')
          .eq('id', table.outletId)
          .maybeSingle();
        ctx.companyId = outletRow?.company_id ? String(outletRow.company_id) : null;
        useGuestAuthStore.getState().setSessionContext(ctx);
      }
      void useGuestAuthStore.getState().registerPresence(ctx);
    };
    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 45000);
    return () => window.clearInterval(timer);
  }, [guest?.id, table?.id, table?.outletId, table?.tableNumber]);

  useEffect(() => {
    if (guest) setAuthGateOpen(false);
  }, [guest]);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!qrToken) {
        setResolving(false);
        setResolveError('Missing QR token');
        return;
      }
      setResolving(true);
      setResolveError(null);
      try {
        const result = await resolveTableByQrDetailed(qrToken, outletId);
        if (cancelled) return;
        if (!result.ok) {
          setTable(null);
          setResolveError(result.reason === 'cloud_error' ? 'error' : 'invalid');
        } else {
          setTable(result.table);
          setSession(result.table.outletId, result.table.qrCodeToken || qrToken);
        }
      } catch {
        if (!cancelled) {
          setTable(null);
          setResolveError('error');
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [outletId, qrToken, setSession]);

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href.split('#')[0];
  }, []);

  const onSignedIn = useCallback(() => {
    setAuthGateOpen(false);
  }, []);

  const { data: products, isLoading } = useQuery({
    queryKey: ['public-products', table?.outletId || outletId],
    enabled: !!table && !!guest,
    queryFn: async () => {
      const oid = table?.outletId || outletId;
      let companyId: string | null = null;
      if (oid && oid !== 'current-outlet') {
        const { data: outletRow } = await supabase
          .from('outlets')
          .select('company_id')
          .eq('id', oid)
          .maybeSingle();
        companyId = outletRow?.company_id ? String(outletRow.company_id) : null;
      }

      // Prefer POS-aligned catalog (ready_product); fall back to all active sellables
      let query = supabase
        .from('products')
        .select(`*, categories (name)`)
        .eq('is_active', true)
        .eq('item_type', 'ready_product')
        .order('name');
      if (companyId) query = query.eq('company_id', companyId);

      let { data, error } = await query;

      if (error || !data?.length) {
        let fallback = supabase
          .from('products')
          .select(`*, categories (name)`)
          .eq('is_active', true)
          .order('name');
        if (companyId) fallback = fallback.eq('company_id', companyId);
        ({ data, error } = await fallback);
      }

      if (error) throw error;
      return data ?? [];
    },
  });
  const { map: availabilityMap, ready: availabilityReady } = useProductAvailabilityMap(
    table?.outletId || outletId || null,
    (products as any[]) || [],
    'qr'
  );

  const menuProducts = useMemo(() => {
    return (products ?? []).filter((p: any) => {
      const resolved = availabilityMap.get(String(p.id || ''));
      if (resolved && !resolved.canShow) return false;
      const price = Number(p.selling_price ?? p.sellingPrice ?? p.price ?? 0);
      const type = (p.item_type || '').toLowerCase();
      const isRaw = type === 'raw_material' || type === 'raw';
      if (isRaw) return false;
      if (price <= 0) return false;
      // Allow empty type (some catalogs omit it) and common sellable aliases
      if (!type || type === 'ready_product' || type === 'finished' || type === 'menu' || type === 'sellable') {
        return true;
      }
      return false;
    });
  }, [availabilityMap, products]);

  const categories = useMemo(() => {
    const names = Array.from(
      new Set(menuProducts.map((p: any) => p.categories?.name).filter(Boolean))
    ) as string[];
    return ['All', ...names];
  }, [menuProducts]);

  const productsByCategory = useMemo(() => {
    const map: Record<string, any[]> = { All: menuProducts };
    for (const cat of categories) {
      if (cat === 'All') continue;
      map[cat] = menuProducts.filter((p: any) => p.categories?.name === cat);
    }
    return map;
  }, [menuProducts, categories]);

  const activeIndex = Math.max(0, categories.indexOf(activeCategory));

  const goToCategory = useCallback(
    (cat: string, index?: number) => {
      setActiveCategory(cat);
      const idx = index ?? categories.indexOf(cat);
      if (idx >= 0) {
        pageSwiperRef.current?.slideTo(idx);
        chipSwiperRef.current?.slideTo(Math.max(0, idx - 1));
      }
    },
    [categories]
  );

  if (resolving || !isReady) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-8 text-center gap-3"
        style={{ background: `linear-gradient(180deg, ${BRAND.gray} 0%, #fff 100%)` }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND.orange }} />
        <p className="text-sm font-semibold text-slate-500">Opening your table…</p>
      </div>
    );
  }

  if (!table) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-8 text-center"
        style={{ background: `linear-gradient(180deg, ${BRAND.gray} 0%, #fff 100%)` }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: BRAND.navy }}
        >
          <UtensilsCrossed className="w-8 h-8 text-white/80" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: BRAND.navy }}>
          {resolveError === 'error' ? 'Could not open menu' : 'Invalid QR Code'}
        </h2>
        <p className="text-slate-500 max-w-xs">
          {resolveError === 'error'
            ? 'Network or table directory error. Try again, or ask staff to check dining_tables sync.'
            : 'This QR is not linked to an active table. Ask staff to regenerate it from Table Management or Floor Designer.'}
        </p>
      </div>
    );
  }

  if (!guest || authGateOpen) {
    return <GuestLogin table={table} redirectTo={redirectTo} onSignedIn={onSignedIn} />;
  }

  if (view === 'status') {
    return <GuestOrderStatus table={table} onBack={() => setView('menu')} />;
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden relative" style={{ backgroundColor: BRAND.gray }}>
      {/* Fixed header — does not scroll */}
      <div className="shrink-0 bg-white px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-3 z-40 border-b border-black/5 shadow-[0_8px_24px_rgba(13,27,42,0.06)]">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="min-w-0">
            <CafePilotsLogo size={36} withWordmark withDivider />
            <p className="text-xs text-slate-500 mt-1.5">
              Hi{' '}
              <span className="font-bold" style={{ color: BRAND.navy }}>
                {guest.name.split(' ')[0]}
              </span>
              {' · '}
              Ordering for{' '}
              <span className="font-bold" style={{ color: BRAND.orange }}>
                {table.tableNumber}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setView('status')}
              className="h-9 px-3 rounded-full text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700"
            >
              <Clock3 className="w-3.5 h-3.5" style={{ color: BRAND.orange }} />
              Status
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 bg-white text-slate-500"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mb-2.5">{APP_TAGLINE}</p>

        {/* Category chips + layout toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => pageSwiperRef.current?.slidePrev()}
            className="guest-cat-prev shrink-0 w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center disabled:opacity-30 shadow-sm"
            aria-label="Previous category"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <Swiper
            slidesPerView="auto"
            spaceBetween={8}
            freeMode
            onSwiper={(sw) => {
              chipSwiperRef.current = sw;
            }}
            modules={[FreeMode]}
            className="w-full min-w-0 !overflow-hidden"
          >
            {categories.map((cat, idx) => {
              const active = activeCategory === cat;
              return (
                <SwiperSlide key={cat} className="!w-auto">
                  <button
                    type="button"
                    onClick={() => goToCategory(cat, idx)}
                    className={cn(
                      'px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border',
                      active
                        ? 'text-white shadow-md border-transparent'
                        : 'bg-white text-slate-600 border-slate-200'
                    )}
                    style={active ? { backgroundColor: BRAND.navy } : undefined}
                  >
                    {cat}
                  </button>
                </SwiperSlide>
              );
            })}
          </Swiper>

          <button
            type="button"
            onClick={() => pageSwiperRef.current?.slideNext()}
            className="guest-cat-next shrink-0 w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center disabled:opacity-30 shadow-sm"
            aria-label="Next category"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="shrink-0 flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5 ml-0.5">
            <button
              type="button"
              onClick={() => setLayout('list')}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                layoutMode === 'list' ? 'bg-white text-[#0D1B2A] shadow-sm' : 'text-slate-400'
              )}
              aria-label="List view"
              aria-pressed={layoutMode === 'list'}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayout('grid')}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                layoutMode === 'grid' ? 'bg-white text-[#0D1B2A] shadow-sm' : 'text-slate-400'
              )}
              aria-label="Grid view"
              aria-pressed={layoutMode === 'grid'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen category pages — swipe left/right */}
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="flex justify-center p-10 text-slate-400 animate-pulse">Loading menu…</div>
        ) : (
          <Swiper
            className="h-full w-full guest-menu-page-swiper"
            style={{ height: '100%' }}
            initialSlide={activeIndex}
            onSwiper={(sw) => {
              pageSwiperRef.current = sw;
            }}
            onSlideChange={(sw) => {
              const cat = categories[sw.activeIndex];
              if (cat) {
                setActiveCategory(cat);
                chipSwiperRef.current?.slideTo(Math.max(0, sw.activeIndex - 1));
              }
            }}
            resistanceRatio={0.65}
          >
            {categories.map((cat) => {
              const items = productsByCategory[cat] || [];
              return (
                <SwiperSlide key={cat} className="!h-full overflow-hidden">
                  <div className="h-full overflow-y-auto overscroll-contain px-4 py-4 pb-28">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <ShoppingBag className="w-12 h-12 mb-3 opacity-30" style={{ color: BRAND.navy }} />
                        <p className="font-semibold" style={{ color: BRAND.navy }}>
                          No items in {cat}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">Swipe to another category</p>
                      </div>
                    ) : layoutMode === 'list' ? (
                      <div className="space-y-3">
                        {items.map((product: any) => {
                          const availability = availabilityMap.get(String(product.id || ''));
                          const blocked =
                            !availabilityReady || (availability ? !availability.canSell : false);
                          return (
                            <ProductListCard
                              key={product.id}
                              product={product}
                              blocked={blocked}
                              badge={availability?.badge}
                              onAdd={() => {
                                if (blocked) return;
                                addItem(product);
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        {items.map((product: any) => {
                          const availability = availabilityMap.get(String(product.id || ''));
                          const blocked =
                            !availabilityReady || (availability ? !availability.canSell : false);
                          return (
                            <ProductGridCard
                              key={product.id}
                              product={product}
                              blocked={blocked}
                              badge={availability?.badge}
                              onAdd={() => {
                                if (blocked) return;
                                addItem(product);
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}

        {/* Page dots */}
        {categories.length > 1 && (
          <div className="pointer-events-none absolute bottom-[5.5rem] left-0 right-0 flex justify-center gap-1.5 z-20">
            {categories.map((cat, i) => (
              <span
                key={cat}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === activeIndex ? 'w-4 bg-[#FF6A00]' : 'w-1.5 bg-slate-300'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {getItemCount() > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto w-full h-14 text-white rounded-2xl flex items-center justify-between px-5 transition-transform active:scale-[0.99]"
            style={{
              backgroundColor: BRAND.navy,
              boxShadow: `0 12px 28px ${BRAND.navy}40`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: BRAND.orange }}
              >
                {getItemCount()}
              </div>
              <span className="font-bold text-base">View Order</span>
            </div>
            <span className="font-extrabold text-lg" style={{ color: BRAND.orangeLight }}>
              {formatCurrency(getCartTotal())}
            </span>
          </button>
        </div>
      )}

      <CustomerCartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        table={table}
        onViewStatus={() => setView('status')}
      />
    </div>
  );
}
