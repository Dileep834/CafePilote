import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '../components/ProductGrid';
import { Cart } from '../components/Cart';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { usePOSStore } from '../store/usePOSStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { formatCurrency } from '@/utils/format';
import { ShoppingCart, Search, Plus, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function POSDashboard() {
  const { cart, heldOrders, taxRate, clearCart, searchQuery, setSearchQuery } = usePOSStore();
  const { user } = useAuthStore();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const hydrateOpenBills = useTableBillStore((s) => s.hydrateOpenBills);

  useEffect(() => {
    void hydrateOpenBills(user?.outletId);
  }, [user?.outletId, hydrateOpenBills]);

  const subtotal = cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const firstName = user?.name?.split(' ')[0] || 'Chef';

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row gap-3 md:gap-4 -m-4 sm:-m-6 lg:-m-8 p-3 sm:p-6 lg:p-6 bg-brand-gray font-sans pos-crisp-text relative pb-[5.5rem] md:pb-6">
      <div className="flex-1 flex flex-col gap-2.5 sm:gap-4 overflow-hidden relative z-0 min-h-0">
        {/* Mobile greeting — compact */}
        <div className="md:hidden px-0.5 pt-0.5">
          <h2 className="text-lg font-bold tracking-tight text-brand-navy leading-tight">
            {greetingForHour(new Date().getHours())}, {firstName}
          </h2>
          <p className="text-slate-500 text-xs font-medium mt-0.5">Ready to take the next order</p>
        </div>

        {/* Mobile search + new order */}
        <div className="flex sm:hidden items-center gap-2">
          <div className="relative flex-1 min-w-0 h-11">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-orange/70 pointer-events-none" />
            <input
              type="search"
              inputMode="search"
              placeholder="Search menu…"
              className="w-full h-full pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={clearCart}
            className="shrink-0 h-11 px-3.5 rounded-xl bg-brand-orange hover:bg-[#e55f00] text-white font-bold shadow-md shadow-brand-orange/25"
            aria-label="New order"
          >
            <Plus className="w-5 h-5 mr-1" />
            <span className="text-sm">New</span>
          </Button>
        </div>

        <Card className="flex-1 flex flex-col border-none sm:border-solid border-slate-200 bg-transparent sm:bg-slate-50/50 overflow-hidden p-0 sm:p-4 shadow-none sm:shadow-sm min-h-0">
          <ProductGrid />
        </Card>
      </div>

      <div className="hidden md:flex w-96 flex-col h-full overflow-hidden">
        <Card className="flex-1 border-slate-200 bg-white overflow-hidden shadow-sm">
          <CardContent className="p-0 h-full">
            <Cart />
          </CardContent>
        </Card>
      </div>

      {/* Mobile cart dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {(cart.length > 0 || (heldOrders && heldOrders.length > 0)) && (
          <div className="px-3 pointer-events-auto animate-in slide-in-from-bottom-5">
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger
                render={
                  <button
                    type="button"
                    className="w-full h-14 rounded-2xl bg-brand-navy flex items-center justify-between p-1.5 pr-3 shadow-[0_10px_40px_rgba(13,27,42,0.35)] border border-brand-steel"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-brand-orange flex items-center justify-center relative shadow-lg shadow-brand-orange/40 shrink-0">
                        <ShoppingCart className="w-5 h-5 text-white" />
                        <div className="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] px-0.5 bg-white rounded-full flex items-center justify-center border-2 border-brand-orange">
                          <span className="text-[10px] font-bold text-brand-orange leading-none">{cart.length}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-white font-bold text-sm leading-tight">View Cart</span>
                        <span className="text-brand-orange-light font-medium text-[10px] truncate">
                          {cart.length} item{cart.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="text-white font-bold text-sm tabular-nums">{formatCurrency(total)}</span>
                      <ChevronRight className="w-5 h-5 text-brand-orange-light" />
                    </div>
                  </button>
                }
              />
              <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-3xl border-none">
                <Cart />
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </div>
  );
}
