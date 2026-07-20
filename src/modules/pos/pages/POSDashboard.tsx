import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductGrid } from '../components/ProductGrid';
import { Cart } from '../components/Cart';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { usePOSStore } from '../store/usePOSStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { usePOSFavoritesStore } from '../store/usePOSFavoritesStore';
import { formatCurrency } from '@/utils/format';
import { ShoppingCart, ChevronRight, X, ArrowUp } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { POSToolRail, type PosView } from '../components/POSToolRail';
import { POSOrderHistory } from '../components/POSOrderHistory';
import { POSHeldOrders } from '../components/POSHeldOrders';
import {
  OnlineOrderBar,
  OnlineOrderHub,
  OnlineOrderToasts,
  useOnlineOrdersStore,
  type OnlinePlatformId,
} from '../onlineOrders';
import { cn } from '@/lib/utils';
import { useVisualViewportBottom } from '@/hooks/useVisualViewportBottom';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function parsePosView(raw: string | null): PosView {
  if (
    raw === 'favorites' ||
    raw === 'history' ||
    raw === 'held' ||
    raw === 'menu' ||
    raw === 'online'
  )
    return raw;
  return 'menu';
}

export function POSDashboard() {
  useVisualViewportBottom();
  const { cart, heldOrders, taxRate, clearCart, reloadActiveTableBill } =
    usePOSStore();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : true
  );
  const mobileScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMobileGreeting, setShowMobileGreeting] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.sessionStorage.getItem('cafepilots-pos-greeting-hidden') !== '1';
  });
  const [posView, setPosView] = useState<PosView>(() =>
    parsePosView(searchParams.get('view'))
  );
  const [onlinePlatformFilter, setOnlinePlatformFilter] = useState<
    OnlinePlatformId | 'all'
  >('all');

  // Keep view in sync when navigating via sidebar / deep links (?view=online)
  useEffect(() => {
    setPosView(parsePosView(searchParams.get('view')));
  }, [searchParams]);
  const hydrateOpenBills = useTableBillStore((s) => s.hydrateOpenBills);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const outletId = getTenantOutletId(user);
  const byUser = usePOSFavoritesStore((s) => s.byUser);
  const userKey = user?.id || user?.email || 'local-staff';
  const favoritesCount = (byUser[userKey] || []).length;
  const onlineOrders = useOnlineOrdersStore((s) => s.orders);
  const onlineActiveCount = useMemo(
    () =>
      onlineOrders.filter((o) =>
        ['new', 'accepted', 'preparing', 'ready'].includes(o.status)
      ).length,
    [onlineOrders]
  );
  const tickTimeouts = useOnlineOrdersStore((s) => s.tickTimeouts);
  const pushIncomingOrder = useOnlineOrdersStore((s) => s.pushIncomingOrder);
  const simulatorOn = useOnlineOrdersStore((s) => s.simulatorOn);

  useEffect(() => {
    const t = window.setInterval(() => tickTimeouts(), 1000);
    return () => window.clearInterval(t);
  }, [tickTimeouts]);

  useEffect(() => {
    if (!simulatorOn) return;
    const t = window.setInterval(() => {
      if (Math.random() > 0.78) pushIncomingOrder();
    }, 32000);
    return () => window.clearInterval(t);
  }, [simulatorOn, pushIncomingOrder]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const pull = async () => {
      await hydrateOpenBills(outletId);
      usePOSStore.getState().reloadActiveTableBill();
    };
    void pull();
    const onFocus = () => void pull();
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => void pull(), 15000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [outletId, activeOutletId, hydrateOpenBills, reloadActiveTableBill]);

  useEffect(() => {
    void usePOSStore.getState().fetchHeldOrders();
  }, []);

  const handleViewChange = useCallback(
    (view: PosView) => {
      setPosView(view);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (view === 'menu') next.delete('view');
          else next.set('view', view);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const openOnlineHub = useCallback(
    (platform: OnlinePlatformId | 'all' = 'all') => {
      setOnlinePlatformFilter(platform);
      useOnlineOrdersStore.getState().setFilters({
        platform: platform === 'all' ? 'all' : platform,
      });
      handleViewChange('online');
    },
    [handleViewChange]
  );

  const subtotal = cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const firstName = user?.name?.split(' ')[0] || 'Chef';

  const dismissMobileGreeting = () => {
    setShowMobileGreeting(false);
    window.sessionStorage.setItem('cafepilots-pos-greeting-hidden', '1');
  };

  const handleMobileContentScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(event.currentTarget.scrollTop > 220);
  };

  const scrollMobileToTop = () => {
    mobileScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const leftPane = useMemo(() => {
    if (posView === 'online')
      return (
        <OnlineOrderHub
          initialPlatform={onlinePlatformFilter}
          onBack={() => handleViewChange('menu')}
        />
      );
    if (posView === 'history') return <POSOrderHistory variant="panel" />;
    if (posView === 'held')
      return <POSHeldOrders onResumed={() => handleViewChange('menu')} />;
    if (posView === 'favorites')
      return (
        <ProductGrid
          favoritesOnly
          onBrowseMenu={() => handleViewChange('menu')}
        />
      );
    return (
      <ProductGrid onOpenFavorites={() => handleViewChange('favorites')} />
    );
  }, [posView, handleViewChange, onlinePlatformFilter]);

  const showCartPane = posView !== 'online';

  return (
    /*
     * POS fills the full-bleed main area (no ERP padding). Keep overflow clipped
     * so the cart footer and product grid stay within the viewport.
     */
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-100 font-sans pos-crisp-text xl:flex-row">
      <OnlineOrderToasts />

      {/* ── Left pane: tool rail + filters + product grid ── */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <OnlineOrderBar onOpenHub={openOnlineHub} />

        {/* Mobile greeting bar */}
        <div
          className={cn(
            'flex shrink-0 items-start justify-between gap-3 px-3 pb-1 pt-3 md:hidden',
            !showMobileGreeting && 'hidden'
          )}
        >
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold leading-none tracking-tight text-slate-800">
              {greetingForHour(new Date().getHours())}, {firstName} 👋
            </h2>
            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">Ready to take the next order</p>
          </div>
          <button
            type="button"
            onClick={dismissMobileGreeting}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm active:bg-slate-50"
            aria-label="Hide greeting"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Tool rail (Menu / Favorites / Online / History / Held + New Order) */}
        <div className="px-3 pb-2 pt-2 shrink-0">
          <POSToolRail
            view={posView}
            onViewChange={handleViewChange}
            heldCount={heldOrders?.length || 0}
            favoritesCount={favoritesCount}
            onlineCount={onlineActiveCount}
            onNewOrder={clearCart}
          />
        </div>

        {/* Product grid / history / held — fills all remaining vertical space */}
        <div
          ref={mobileScrollRef}
          onScroll={handleMobileContentScroll}
          className="min-h-0 flex-1 basis-0 overflow-y-auto overscroll-contain px-3 pb-3 scroll-smooth xl:overflow-hidden"
        >
          <div className="flex h-auto flex-col overflow-visible bg-transparent p-0 xl:h-full xl:overflow-hidden">
            {leftPane}
          </div>
        </div>

        {/* Compact/tablet cart bottom bar anchored in the POS layout */}
        {showCartPane && (
        <div className="sticky bottom-0 z-20 mt-auto shrink-0 bg-slate-100 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] xl:hidden">
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 flex items-center justify-between p-1.5 pr-3 shadow-[0_10px_40px_rgba(13,27,42,0.35)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center relative shadow-lg shrink-0",
                      cart.length > 0 ? "bg-orange-500 shadow-orange-500/40" : "bg-slate-700 shadow-transparent"
                    )}>
                      <ShoppingCart className={cn("w-5 h-5", cart.length > 0 ? "text-white" : "text-slate-400")} />
                      {cart.length > 0 && (
                        <div className="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] px-0.5 bg-white rounded-full flex items-center justify-center border-2 border-orange-500">
                          <span className="text-[10px] font-bold text-orange-500 leading-none">
                            {cart.length}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-white font-bold text-sm leading-tight">View Cart</span>
                      <span className={cn("font-medium text-[10px] truncate", cart.length > 0 ? "text-orange-300" : "text-slate-400")}>
                        {cart.length === 0 ? 'Cart is empty' : `${cart.length} item${cart.length === 1 ? '' : 's'}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className={cn("font-bold text-sm tabular-nums", cart.length > 0 ? "text-white" : "text-slate-400")}>
                      {formatCurrency(total)}
                    </span>
                    <ChevronRight className={cn("w-5 h-5", cart.length > 0 ? "text-orange-300" : "text-slate-500")} />
                  </div>
                </button>
              }
            />
            <SheetContent
              side={isNarrow ? 'bottom' : 'right'}
              showCloseButton={false}
              className={cn(
                'gap-0 overflow-hidden border-none p-0',
                isNarrow
                  ? 'h-[96svh] max-h-[96svh] rounded-t-3xl'
                  : 'h-full w-full max-w-[420px] md:max-w-[430px]'
              )}
            >
              <Cart
                onOpenHeld={() => handleViewChange('held')}
                onClose={() => setIsCartOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
        )}
      </div>

      {showScrollTop && showCartPane && (
        <button
          type="button"
          onClick={scrollMobileToTop}
          className="absolute right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/15 transition active:scale-95 xl:hidden"
          style={{
            bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))',
          }}
          aria-label="Scroll menu to top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      {/* ── Desktop right pane: Cart (420px) — hidden on Online Hub for full-width ops ── */}
      {showCartPane && (
      <div className="hidden w-[420px] shrink-0 flex-col py-4 pr-4 xl:flex">
        <div className="h-full overflow-hidden rounded-2xl bg-white shadow-sm">
          <Cart onOpenHeld={() => handleViewChange('held')} />
        </div>
      </div>
      )}

    </div>
  );
}
