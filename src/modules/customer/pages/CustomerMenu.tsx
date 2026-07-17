import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useCustomerOrderStore } from '../store/useCustomerOrderStore';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import { formatCurrency } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Coffee, Plus, Minus, ShoppingBag, UtensilsCrossed, Leaf, Drumstick, Droplet, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerCartModal } from './CustomerCartModal';

export function CustomerMenu() {
  const { outletId, qrToken } = useParams();
  const navigate = useNavigate();
  
  // Stores
  const { tables } = useTableStore();
  const { setSession, addItem, getItemCount, getCartTotal } = useCustomerOrderStore();
  
  // Local state
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Validate QR Token and get Table info
  const table = tables.find(t => t.qrCodeToken === qrToken && t.outletId === outletId);

  useEffect(() => {
    if (outletId && qrToken) {
      setSession(outletId, qrToken);
    }
  }, [outletId, qrToken, setSession]);

  // Fetch Products
  const { data: products, isLoading } = useQuery({
    queryKey: ['public-products', outletId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (name)
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <UtensilsCrossed className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Invalid QR Code</h2>
        <p className="text-slate-500">Please scan the QR code on your table again, or ask a staff member for assistance.</p>
      </div>
    );
  }

  // Categories extraction
  const categories = ['All', ...Array.from(new Set(products?.map((p: any) => p.categories?.name).filter(Boolean)))];
  
  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products?.filter((p: any) => p.categories?.name === activeCategory);

  const safePrice = (p: any) => p.selling_price || p.sellingPrice || 0;

  const getDietaryIcon = (pref: string) => {
    const p = (pref || 'veg').toLowerCase();
    if (p === 'veg') return <Leaf className="w-3.5 h-3.5 text-green-600" />;
    if (p === 'non-veg') return <Drumstick className="w-3.5 h-3.5 text-red-500" />;
    if (p === 'jain') return <Droplet className="w-3.5 h-3.5 text-orange-500" />;
    if (p === 'egg') return <Leaf className="w-3.5 h-3.5 text-yellow-500" />;
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative pb-24">
      
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">CafePilot</h1>
            <p className="text-sm font-medium text-slate-500">Ordering for <span className="text-purple-600 font-bold">{table.tableNumber}</span></p>
          </div>
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <Coffee className="w-6 h-6" />
          </div>
        </div>

        {/* Categories (Horizontal Scroll) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
          {categories.map((cat: any) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                activeCategory === cat 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-10"><span className="animate-pulse">Loading menu...</span></div>
        ) : (
          filteredProducts?.map((product: any) => (
            <div key={product.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex gap-4">
              
              <div className="w-28 h-28 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <UtensilsCrossed className="w-8 h-8 opacity-40" />
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5 bg-white rounded p-0.5 shadow-sm">
                  {getDietaryIcon(product.dietary_preference)}
                </div>
              </div>

              <div className="flex flex-col flex-1 py-1">
                <h3 className="font-bold text-slate-800 leading-tight mb-1">{product.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed opacity-80">
                  {product.categories?.name}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-black text-purple-700">{formatCurrency(safePrice(product))}</span>
                  
                  <button 
                    onClick={() => addItem(product)}
                    className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold hover:bg-purple-600 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Sticky Cart Button */}
      {getItemCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 max-w-md mx-auto z-50">
          <Button 
            onClick={() => setIsCartOpen(true)}
            className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-[0_10px_30px_rgba(147,51,234,0.3)] flex items-center justify-between px-6 animate-in slide-in-from-bottom-5"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                {getItemCount()}
              </div>
              <span className="font-bold text-lg">View Order</span>
            </div>
            <span className="font-black text-xl">{formatCurrency(getCartTotal())}</span>
          </Button>
        </div>
      )}

      {/* Cart Modal */}
      <CustomerCartModal 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        table={table}
      />
    </div>
  );
}
