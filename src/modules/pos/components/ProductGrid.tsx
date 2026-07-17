import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePOSStore } from '../store/usePOSStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/format';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Mousewheel, Navigation } from 'swiper/modules';
import { ChevronLeft, ChevronRight, Pizza, Coffee, UtensilsCrossed, Settings, Leaf, Drumstick, Droplet, Heart, Plus, Search, Check, ListChecks } from 'lucide-react';
import { ProductAddonModal } from './ProductAddonModal';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';

// Fetch products from Supabase
const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('is_active', true)
    .eq('item_type', 'ready_product')
    .order('name');
  
  if (error) throw error;
  return data;
};

// Icons for Dietary Preferences
const getDietaryIcon = (pref: string) => {
  switch (pref?.toLowerCase()) {
    case 'non-veg': return <NonVegIcon />;
    case 'egg': return <EggIcon />;
    case 'jain': return <JainIcon />;
    default: return <VegIcon />;
  }
};

// FSSAI Veg Icon
const VegIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block shrink-0">
    <rect x="1" y="1" width="14" height="14" stroke="#16A34A" strokeWidth="1.5" rx="2"/>
    <circle cx="8" cy="8" r="4" fill="#16A34A"/>
  </svg>
);

// FSSAI Non-Veg Icon
const NonVegIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block shrink-0" title="Non-Veg">
    <rect x="1" y="1" width="14" height="14" stroke="#DC2626" strokeWidth="1.5" rx="2"/>
    <polygon points="8,4 12,11 4,11" fill="#DC2626"/>
  </svg>
);

// Egg Icon
const EggIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block shrink-0" title="Contains Egg">
    <rect x="1" y="1" width="14" height="14" stroke="#EAB308" strokeWidth="1.5" rx="2"/>
    <polygon points="8,4 12,11 4,11" fill="#EAB308"/>
  </svg>
);

// Jain Icon
const JainIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block shrink-0" title="Jain Food">
    <rect x="1" y="1" width="14" height="14" stroke="#F97316" strokeWidth="1.5" rx="2"/>
    <circle cx="8" cy="8" r="4" fill="#F97316"/>
  </svg>
);

export function ProductGrid() {
  const addItem = usePOSStore(state => state.addItem);
  const searchQuery = usePOSStore(state => state.searchQuery);
  const setSearchQuery = usePOSStore(state => state.setSearchQuery);
  const clearCart = usePOSStore(state => state.clearCart);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDiet, setSelectedDiet] = useState<string>('All');
  const [selectedProductForAddons, setSelectedProductForAddons] = useState<any | null>(null);
  const diets = ['All', 'Veg', 'Non-Veg', 'Egg', 'Jain'];
  
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['pos-products'],
    queryFn: fetchProducts
  });

  const handleProductClick = (product: any) => {
    // Temporarily disabled Add-on modal logic per user request.
    // Instantly add to cart instead.
    addItem(product);
  };

  // Derive unique categories from products
  const categories = useMemo(() => {
    if (!products) return ['All'];
    const cats = new Set<string>();
    products.forEach(p => {
      const catName = (p.categories as any)?.name;
      if (catName) cats.add(catName);
    });
    return ['All', ...Array.from(cats)].sort((a, b) => {
      if (a === 'All') return -1;
      if (b === 'All') return 1;
      return a.localeCompare(b);
    });
  }, [products]);

  // Filter products by selected category and diet
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || (p.categories as any)?.name === selectedCategory;
      const pref = p.dietary_preference?.toLowerCase() || 'veg';
      const matchesDiet = selectedDiet === 'All' || pref === selectedDiet.toLowerCase();
      
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        p.name.toLowerCase().includes(searchLower) || 
        (p.barcode && p.barcode.toLowerCase().includes(searchLower));
      
      return matchesCategory && matchesDiet && matchesSearch;
    });
  }, [products, selectedCategory, selectedDiet, searchQuery]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center p-8 text-slate-500">Loading products...</div>;
  }

  if (error) {
    return <div className="h-full flex items-center justify-center p-8 text-red-500">Error loading products</div>;
  }

  return (
    <div className="flex flex-col h-full gap-4 sm:gap-6 bg-white sm:bg-transparent rounded-t-3xl sm:rounded-none px-2 sm:px-0 pt-4 sm:pt-0 pb-32 sm:pb-0 -mx-4 sm:mx-0 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] sm:shadow-none">
      {/* Category Selector */}
      <div className="relative -mx-2 px-2 sm:mx-0 sm:px-0 flex items-center gap-2">
        <button className="cat-prev shrink-0 h-10 w-10 hidden sm:flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-purple-600 hover:border-purple-300 disabled:opacity-50 z-10 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <Swiper
          slidesPerView="auto"
          spaceBetween={12}
          freeMode={true}
          observer={true}
          observeParents={true}
          navigation={{
            prevEl: '.cat-prev',
            nextEl: '.cat-next',
          }}
          modules={[FreeMode, Navigation]}
          className="w-full py-2"
        >
          {categories.map((category) => {
            let Icon = ListChecks;
            let iconColor = 'text-slate-600';
            if(category.toLowerCase().includes('pizza') || category.toLowerCase().includes('appetizer')) { Icon = Pizza; iconColor = 'text-orange-500'; }
            else if(category.toLowerCase().includes('beverage') || category.toLowerCase().includes('coffee')) { Icon = Coffee; iconColor = 'text-amber-700'; }
            else if(category.toLowerCase().includes('main') || category.toLowerCase().includes('course')) { Icon = UtensilsCrossed; iconColor = 'text-blue-500'; }
            else if(category.toLowerCase().includes('bread')) { Icon = Pizza; iconColor = 'text-yellow-600'; } // fallback bread
            
            const isSelected = selectedCategory === category;
            
            return (
              <SwiperSlide key={category} className="!w-auto">
                <button
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "flex flex-col sm:flex-row items-center justify-center gap-2 w-[72px] h-[80px] sm:w-auto sm:h-11 sm:px-5 rounded-2xl sm:rounded-full transition-all duration-300 border shadow-sm group",
                    isSelected 
                      ? "bg-purple-50/50 sm:bg-purple-600 border-purple-500 sm:border-purple-600 shadow-md" 
                      : "bg-white border-slate-100 hover:border-purple-200"
                  )}
                >
                  <div className={cn("w-8 h-8 sm:w-5 sm:h-5 rounded-full flex items-center justify-center transition-transform group-hover:scale-110", isSelected ? "bg-white shadow-sm sm:bg-transparent sm:shadow-none" : "bg-slate-50 sm:bg-transparent")}>
                    <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", isSelected ? "text-purple-600 sm:text-white" : iconColor)} />
                  </div>
                  <span className={cn("text-[10px] sm:text-sm font-bold leading-tight px-1 text-center whitespace-nowrap", isSelected ? "text-purple-700 sm:text-white" : "text-slate-600")}>
                    {category}
                  </span>
                </button>
              </SwiperSlide>
            );
          })}
        </Swiper>

        <button className="cat-next shrink-0 h-10 w-10 hidden sm:flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-purple-600 hover:border-purple-300 disabled:opacity-50 z-10 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dietary Filters & Desktop Search */}
      <div className="flex items-center justify-between -mt-1 sm:-mt-2 mb-2 px-2 sm:px-0 gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide flex-none">
          {diets.map((diet) => {
            let DietIcon = null;
            if(diet === 'Veg') DietIcon = Leaf;
            else if(diet === 'Non-Veg') DietIcon = Drumstick;
            else if(diet === 'Egg') DietIcon = Leaf; // fallback egg
            else if(diet === 'Jain') DietIcon = Droplet;
            
            const isSelected = selectedDiet === diet;
            
            return (
              <button
                key={diet}
                onClick={() => setSelectedDiet(diet)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap border",
                  isSelected
                    ? "bg-slate-100 text-slate-800 border-slate-300 shadow-inner"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 shadow-sm"
                )}
              >
                {DietIcon && <DietIcon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", 
                  diet === 'Veg' ? 'text-green-600' : 
                  diet === 'Non-Veg' ? 'text-red-500' : 
                  diet === 'Egg' ? 'text-yellow-500' : 
                  diet === 'Jain' ? 'text-orange-500' : 'text-slate-400'
                )} />}
                {diet}
              </button>
            );
          })}
        </div>
        
        {/* Desktop Search & New Order */}
        <div className="hidden sm:flex items-center gap-3 ml-auto flex-1 justify-end max-w-2xl">
          <div className="relative h-10 flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full h-full pl-10 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-semibold text-slate-700 shadow-sm bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="default" className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-[0_4px_15px_rgba(147,51,234,0.15)]" onClick={clearCart}>
            <Plus className="w-5 h-5 mr-1" />
            <span className="font-bold">New Order</span>
          </Button>
        </div>

        <button className="sm:hidden shrink-0 ml-2 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Product Grid */}
      <div className="flex-1 min-h-0 relative px-2 sm:px-0">
        <Swiper
          direction="vertical"
          slidesPerView="auto"
          freeMode={true}
          observer={true}
          observeParents={true}
          mousewheel={{
            forceToAxis: true,
            sensitivity: 1,
            releaseOnEdges: true,
          }}
          modules={[FreeMode, Mousewheel]}
          className="h-full w-full !absolute inset-0"
        >
          <SwiperSlide className="!h-auto pb-32 md:pb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts?.map((product) => (
                <Card 
                  key={product.id}
                  className="group overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col pt-3 pb-3 px-3 relative cursor-pointer active:scale-95"
                  onClick={() => handleProductClick(product)}
                >
                  {/* Top Icons */}
                  <div className="flex items-start justify-between z-10 w-full mb-2">
                    <div className="bg-white rounded p-0.5 shadow-sm border border-slate-100">
                      {getDietaryIcon(product.dietary_preference || 'veg')}
                    </div>
                    <button className="text-slate-300 hover:text-red-500 transition-colors p-1" onClick={(e) => { e.stopPropagation(); }}>
                      <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  
                  {/* Image */}
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-3 shadow-[0_8px_20px_rgba(0,0,0,0.06)] group-hover:shadow-[0_12px_25px_rgba(0,0,0,0.12)] transition-shadow bg-slate-50">
                    {product.image_url ? (
                      <>
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback');
                            if (fallback) {
                              fallback.classList.remove('hidden');
                              fallback.classList.add('flex');
                            }
                          }}
                        />
                        <div className="image-fallback hidden absolute inset-0 w-full h-full items-center justify-center bg-slate-100 text-slate-400">
                          <UtensilsCrossed className="w-12 h-12 opacity-20" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                        <UtensilsCrossed className="w-12 h-12 opacity-20" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1">
                    <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight line-clamp-2 mb-2">{product.name}</h3>
                    
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-sm sm:text-lg font-black text-purple-700">
                        {formatCurrency(product.selling_price || 0)}
                      </span>
                      <button className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-purple-200 text-purple-600 flex items-center justify-center hover:bg-purple-50 transition-colors" onClick={(e) => { e.stopPropagation(); addItem(product); }}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </SwiperSlide>
        </Swiper>
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
