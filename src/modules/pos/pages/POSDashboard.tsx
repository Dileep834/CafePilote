import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '../components/ProductGrid';
import { Cart } from '../components/Cart';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { usePOSStore } from '../store/usePOSStore';
import { formatCurrency } from '@/utils/format';
import { ShoppingCart, Search, Plus, Menu, Heart, LayoutList, MoreHorizontal, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export function POSDashboard() {
  const { cart, heldOrders, taxRate, clearCart, searchQuery, setSearchQuery } = usePOSStore();
  const { user } = useAuthStore();
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const subtotal = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row gap-4 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-6 bg-slate-50 relative pb-24 md:pb-6">
      {/* Product Grid Area */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden relative z-0">
        
        {/* Mobile Header Greeting */}
        <div className="md:hidden flex flex-col gap-1 px-1 pt-2 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800">Good Morning, {user?.name?.split(' ')[0] || 'Chef'} <span className="text-2xl">👋</span></h2>
          </div>
          <p className="text-slate-400 text-sm font-medium">Let's serve something delicious today!</p>
        </div>

        {/* Action Bar (Search & New Order) - Mobile Only */}
        <div className="flex sm:hidden items-center justify-end gap-3 bg-transparent pb-1 sm:pb-0">
          
          <div className="flex w-full sm:w-auto gap-3">
            <div className="flex-1 sm:flex-none relative h-12 sm:h-10">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-purple-600/60" />
              </div>
              <input 
                type="text" 
                placeholder="Search products..." 
                className="w-full h-full pl-10 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-bold text-slate-700 shadow-sm sm:w-64 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="default" className="shrink-0 h-12 sm:h-10 px-4 sm:px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-[0_8px_20px_rgba(147,51,234,0.2)]" onClick={clearCart}>
              <Plus className="w-5 h-5 sm:mr-1" />
              <span className="hidden sm:inline font-bold">New Order</span>
              <span className="sm:hidden font-bold">New Order</span>
            </Button>
          </div>
        </div>
        
        <Card className="flex-1 flex flex-col border-none sm:border-solid border-slate-200 bg-transparent sm:bg-slate-50/50 overflow-hidden p-0 sm:p-4 shadow-none sm:shadow-sm">
          <ProductGrid />
        </Card>
      </div>

      {/* Desktop Cart Area */}
      <div className="hidden md:flex w-96 flex-col h-full overflow-hidden">
        <Card className="flex-1 border-slate-200 bg-white overflow-hidden shadow-sm">
          <CardContent className="p-0 h-full">
            <Cart />
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cart Floating Pill */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-4">
        
        {/* Cart Pill */}
        {(cart.length > 0 || (heldOrders && heldOrders.length > 0)) && (
          <div className="px-4 pointer-events-auto animate-in slide-in-from-bottom-5">
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger render={
                <button className="w-full h-16 rounded-2xl bg-purple-50 flex items-center justify-between p-2 pr-4 shadow-[0_10px_40px_rgba(147,51,234,0.3)] border border-purple-200 transition-transform active:scale-95 group relative z-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center relative shadow-lg shadow-purple-600/40">
                      <ShoppingCart className="w-5 h-5 text-white" />
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center border-[2px] border-purple-600">
                        <span className="text-[10px] font-black text-purple-600">{cart.length}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-purple-800 font-black text-sm">View Cart</span>
                      <span className="text-purple-500 font-bold text-[10px] tracking-wide">{cart.length} items added</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-purple-800 font-black text-base">{formatCurrency(total)}</span>
                    <ChevronRight className="w-5 h-5 text-purple-400 group-hover:text-purple-600 transition-colors" />
                  </div>
                </button>
              } />
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
