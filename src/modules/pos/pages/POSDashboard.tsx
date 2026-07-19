import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ProductGrid } from '../components/ProductGrid';
import { Cart } from '../components/Cart';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { usePOSStore } from '../store/usePOSStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { usePOSFavoritesStore } from '../store/usePOSFavoritesStore';
import { formatCurrency } from '@/utils/format';
import { ShoppingCart, Search, ChevronRight, X, ArrowUp } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { POSToolRail, type PosView } from '../components/POSToolRail';
import { POSOrderHistory } from '../components/POSOrderHistory';
import { POSHeldOrders } from '../components/POSHeldOrders';
import { cn } from '@/lib/utils';
import { useVisualViewportBottom } from '@/hooks/useVisualViewportBottom';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function parsePosView(raw: string | null): PosView {
  if (raw === 'favorites' || raw === 'history' || raw === 'held' || raw === 'menu') return raw;
  return 'menu';
}

export function POSDashboard() {
  useVisualViewportBottom();
  const { cart, heldOrders, taxRate, clearCart, searchQuery, setSearchQuery, reloadActiveTableBill } =
    usePOSStore();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const mobileScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMobileGreeting, setShowMobileGreeting] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.sessionStorage.getItem('cafepilots-pos-greeting-hidden') !== '1';
  });
  const [posView, setPosView] = useState<PosView>(() =>
    parsePosView(searchParams.get('view'))
  );
  const hydrateOpenBills = useTableBillStore((s) => s.hydrateOpenBills);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const outletId = getTenantOutletId(user);
  const byUser = usePOSFavoritesStore((s) => s.byUser);
  const userKey = user?.id || user?.email || 'local-staff';
  const favoritesCount = (byUser[userKey] || []).length;

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

  const subtotal = cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const firstName = user?.name?.split(' ')[0] || 'Chef';

  const showMobileSearch = posView === 'menu' || posView === 'favorites';

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
    if (posView === 'history') return <POSOrderHistory variant="panel" />;
    if (posView === 'held')
      return <POSHeldOrders onResumed={() => handleViewChange('menu')} />;
    if (posView === 'favorites') return <ProductGrid favoritesOnly />;
    return <ProductGrid />;
  }, [posView, handleViewChange]);

  return (
    /*
     * POS is a full-bleed page — escape the main container's padding via absolute inset-0
     * so we control 100% of the viewport below the header.
     */
    <div className="absolute inset-0 flex flex-col md:flex-row bg-slate-100 font-sans pos-crisp-text overflow-hidden">

      {/* ── Left pane: tool rail + filters + product grid ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

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

        {/* Tool rail (Menu / Favorites / History / Held + New Order) */}
        <div className="px-3 pb-2 shrink-0">
          <POSToolRail
            view={posView}
            onViewChange={handleViewChange}
            heldCount={heldOrders?.length || 0}
            favoritesCount={favoritesCount}
            onNewOrder={clearCart}
          />
        </div>

        {/* Mobile search — only shown on menu/favorites */}
        {showMobileSearch && (
          <div className="sm:hidden px-3 pb-2 shrink-0">
            <div className="relative h-9">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                inputMode="search"
                placeholder={posView === 'favorites' ? 'Search favorites…' : 'Search menu…'}
                className="w-full h-full pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Product grid / history / held — fills all remaining vertical space */}
        <div
          ref={mobileScrollRef}
          onScroll={handleMobileContentScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 scroll-smooth xl:overflow-hidden"
        >
          <Card className="flex h-auto flex-col overflow-visible border-none bg-white p-0 shadow-none sm:border sm:border-slate-200 sm:p-4 sm:shadow-sm xl:h-full xl:overflow-hidden">
            {leftPane}
          </Card>
        </div>

        {/* Compact/tablet cart bottom bar anchored in the POS layout */}
        <div className="shrink-0 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 xl:hidden">
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
              side="bottom"
              showCloseButton={false}
              className="h-[92svh] max-h-[92svh] gap-0 overflow-hidden rounded-t-3xl border-none p-0"
            >
              <Cart
                onOpenHeld={() => handleViewChange('held')}
                onClose={() => setIsCartOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollMobileToTop}
          className="absolute right-4 z-[65] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/15 transition active:scale-95 xl:hidden"
          style={{
            bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))',
          }}
          aria-label="Scroll menu to top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      {/* ── Desktop right pane: Cart ── */}
      <div className="hidden w-96 flex-col p-4 pl-0 xl:flex">
        <Card className="flex-1 border-slate-200 bg-white overflow-hidden shadow-sm">
          <CardContent className="p-0 h-full">
            <Cart onOpenHeld={() => handleViewChange('held')} />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
