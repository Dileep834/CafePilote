import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePOSStore } from '../store/usePOSStore';
import { usePOSFavoritesStore } from '../store/usePOSFavoritesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Pizza,
  Coffee,
  UtensilsCrossed,
  Leaf,
  Drumstick,
  Droplet,
  Heart,
  Plus,
  Search,
  ListChecks,
} from 'lucide-react';
import { ProductAddonModal } from './ProductAddonModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';

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

const VegIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline-block shrink-0">
    <rect x="1" y="1" width="14" height="14" stroke="#16A34A" strokeWidth="1.5" rx="2" />
    <circle cx="8" cy="8" r="4" fill="#16A34A" />
  </svg>
);

const NonVegIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline-block shrink-0">
    <rect x="1" y="1" width="14" height="14" stroke="#DC2626" strokeWidth="1.5" rx="2" />
    <polygon points="8,4 12,11 4,11" fill="#DC2626" />
  </svg>
);

const EggIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline-block shrink-0">
    <rect x="1" y="1" width="14" height="14" stroke="#EAB308" strokeWidth="1.5" rx="2" />
    <polygon points="8,4 12,11 4,11" fill="#EAB308" />
  </svg>
);

const JainIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline-block shrink-0">
    <rect x="1" y="1" width="14" height="14" stroke="#F97316" strokeWidth="1.5" rx="2" />
    <circle cx="8" cy="8" r="4" fill="#F97316" />
  </svg>
);

const getDietaryIcon = (pref: string) => {
  switch (pref?.toLowerCase()) {
    case 'non-veg':
      return <NonVegIcon />;
    case 'egg':
      return <EggIcon />;
    case 'jain':
      return <JainIcon />;
    default:
      return <VegIcon />;
  }
};

function categoryIcon(category: string) {
  const c = category.toLowerCase();
  if (c.includes('pizza') || c.includes('appetizer')) return { Icon: Pizza, color: 'text-orange-500' };
  if (c.includes('beverage') || c.includes('coffee') || c.includes('cold'))
    return { Icon: Coffee, color: 'text-amber-700' };
  if (c.includes('main') || c.includes('course')) return { Icon: UtensilsCrossed, color: 'text-blue-500' };
  if (c.includes('bread')) return { Icon: Pizza, color: 'text-yellow-600' };
  return { Icon: ListChecks, color: 'text-slate-600' };
}

type ProductGridProps = {
  /** When true, only show favorited products (POS Favorites workspace) */
  favoritesOnly?: boolean;
};

export function ProductGrid({ favoritesOnly = false }: ProductGridProps) {
  const addItem = usePOSStore((state) => state.addItem);
  const searchQuery = usePOSStore((state) => state.searchQuery);
  const setSearchQuery = usePOSStore((state) => state.setSearchQuery);
  const byUser = usePOSFavoritesStore((s) => s.byUser);
  const isFavorite = usePOSFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = usePOSFavoritesStore((s) => s.toggleFavorite);
  const userKey = useAuthStore((s) => s.user?.id || s.user?.email || 'local-staff');
  const favList = byUser[userKey] || [];
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDiet, setSelectedDiet] = useState<string>('All');
  const [selectedProductForAddons, setSelectedProductForAddons] = useState<any | null>(null);
  const diets = ['All', 'Veg', 'Non-Veg', 'Egg', 'Jain'];

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['pos-products'],
    queryFn: fetchProducts,
  });

  const handleProductClick = (product: any) => {
    addItem(product);
  };

  const categories = useMemo(() => {
    if (!products) return ['All'];
    const cats = new Set<string>();
    products.forEach((p) => {
      const catName = (p.categories as any)?.name;
      if (catName) cats.add(catName);
    });
    return ['All', ...Array.from(cats)].sort((a, b) => {
      if (a === 'All') return -1;
      if (b === 'All') return 1;
      return a.localeCompare(b);
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const favSet = new Set(favList);
    return products.filter((p) => {
      const matchesFav = !favoritesOnly || favSet.has(p.id);
      const matchesCategory =
        favoritesOnly ||
        selectedCategory === 'All' ||
        (p.categories as any)?.name === selectedCategory;
      const pref = p.dietary_preference?.toLowerCase() || 'veg';
      const matchesDiet =
        favoritesOnly || selectedDiet === 'All' || pref === selectedDiet.toLowerCase();
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        p.name.toLowerCase().includes(searchLower) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchLower));
      return matchesFav && matchesCategory && matchesDiet && matchesSearch;
    });
  }, [products, selectedCategory, selectedDiet, searchQuery, favoritesOnly, favList]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-slate-500 text-sm">
        Loading products…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-red-500 text-sm">
        Error loading products
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2.5 sm:gap-5 bg-white sm:bg-transparent rounded-t-2xl sm:rounded-none px-1 sm:px-0 pt-2 sm:pt-0 pb-28 sm:pb-0 -mx-1 sm:mx-0 min-h-0">
      {favoritesOnly && (
        <div className="px-0.5 sm:px-0">
          <p className="text-sm font-bold text-brand-navy">Your favorites</p>
          <p className="text-[11px] text-slate-500">
            Tap the heart on Menu items to add or remove
          </p>
        </div>
      )}

      {!favoritesOnly && (
        <div className="relative flex items-center gap-2 -mx-0.5 px-0.5 sm:mx-0 sm:px-0">
          <button
            type="button"
            className="cat-prev shrink-0 h-9 w-9 hidden sm:flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-brand-orange hover:border-brand-orange/50 disabled:opacity-50 z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <Swiper
            slidesPerView="auto"
            spaceBetween={8}
            freeMode
            observer
            observeParents
            navigation={{ prevEl: '.cat-prev', nextEl: '.cat-next' }}
            modules={[FreeMode, Navigation]}
            className="w-full !overflow-visible"
          >
            {categories.map((category) => {
              const { Icon, color } = categoryIcon(category);
              const isSelected = selectedCategory === category;
              return (
                <SwiperSlide key={category} className="!w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'flex items-center gap-1.5 h-9 sm:h-11 px-3 sm:px-5 rounded-full border transition-all duration-200 shadow-sm max-w-[11rem]',
                      isSelected
                        ? 'bg-brand-navy border-brand-navy text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-brand-orange/40'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0',
                        isSelected ? 'text-brand-orange' : color
                      )}
                    />
                    <span className="text-xs sm:text-sm font-semibold truncate">{category}</span>
                  </button>
                </SwiperSlide>
              );
            })}
          </Swiper>

          <button
            type="button"
            className="cat-next shrink-0 h-9 w-9 hidden sm:flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-brand-orange hover:border-brand-orange/50 disabled:opacity-50 z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-4 px-0.5 sm:px-0">
        {!favoritesOnly && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0 -mx-0.5 px-0.5 snap-x">
            {diets.map((diet) => {
              let DietIcon: typeof Leaf | null = null;
              if (diet === 'Veg') DietIcon = Leaf;
              else if (diet === 'Non-Veg') DietIcon = Drumstick;
              else if (diet === 'Egg') DietIcon = Leaf;
              else if (diet === 'Jain') DietIcon = Droplet;

              const isSelected = selectedDiet === diet;

              return (
                <button
                  key={diet}
                  type="button"
                  onClick={() => setSelectedDiet(diet)}
                  className={cn(
                    'snap-start flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold transition-colors whitespace-nowrap border shrink-0',
                    isSelected
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 active:bg-slate-50'
                  )}
                >
                  {DietIcon && (
                    <DietIcon
                      className={cn(
                        'w-3.5 h-3.5',
                        isSelected
                          ? 'text-white'
                          : diet === 'Veg'
                            ? 'text-green-600'
                            : diet === 'Non-Veg'
                              ? 'text-red-500'
                              : diet === 'Egg'
                                ? 'text-yellow-500'
                                : diet === 'Jain'
                                  ? 'text-orange-500'
                                  : 'text-slate-400'
                      )}
                    />
                  )}
                  {diet}
                </button>
              );
            })}
          </div>
        )}

        <div
          className={cn(
            'hidden sm:flex items-center gap-3 ml-auto flex-1 justify-end',
            favoritesOnly ? 'max-w-md w-full' : 'max-w-xl'
          )}
        >
          <div className="relative h-10 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={favoritesOnly ? 'Search favorites…' : 'Search products…'}
              className="w-full h-full pl-10 pr-4 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/25 font-semibold text-slate-700 shadow-sm bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-0.5 sm:px-0 pb-4 md:pb-2">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <UtensilsCrossed className="w-10 h-10 opacity-30 mb-2" />
            <p className="text-sm font-semibold text-slate-500">
              {favoritesOnly ? 'No favorites yet' : 'No products match'}
            </p>
            <p className="text-xs mt-1">
              {favoritesOnly
                ? 'Open Menu and tap the heart on any product'
                : 'Try another category or clear search'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="group overflow-hidden bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm active:scale-[0.98] transition-transform flex flex-col p-2.5 sm:p-3 relative cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <div className="flex items-start justify-between z-10 w-full mb-1.5">
                  <div className="bg-white rounded p-0.5 shadow-sm border border-slate-100">
                    {getDietaryIcon(product.dietary_preference || 'veg')}
                  </div>
                  <button
                    type="button"
                    className={cn(
                      'p-1 -mr-1 -mt-1 rounded-full transition-colors',
                      isFavorite(product.id) ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product.id);
                    }}
                    aria-label={isFavorite(product.id) ? 'Remove favorite' : 'Add favorite'}
                    aria-pressed={isFavorite(product.id)}
                  >
                    <Heart
                      className={cn('w-4 h-4', isFavorite(product.id) && 'fill-rose-500')}
                    />
                  </button>
                </div>

                <div className="relative w-full aspect-square sm:aspect-[4/3] rounded-xl sm:rounded-2xl overflow-hidden mb-2 bg-slate-50">
                  {product.image_url ? (
                    <>
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback =
                            e.currentTarget.parentElement?.querySelector('.image-fallback');
                          if (fallback) {
                            fallback.classList.remove('hidden');
                            fallback.classList.add('flex');
                          }
                        }}
                      />
                      <div className="image-fallback hidden absolute inset-0 items-center justify-center bg-slate-100 text-slate-400">
                        <UtensilsCrossed className="w-8 h-8 opacity-20" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                      <UtensilsCrossed className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col flex-1 min-w-0 gap-1.5">
                  <h3 className="font-semibold text-brand-navy text-[11px] sm:text-sm leading-snug line-clamp-2 tracking-tight min-h-[2.2em]">
                    {product.name}
                  </h3>
                  <div className="mt-auto flex items-center justify-between gap-1">
                    <span className="text-sm font-bold text-brand-orange tabular-nums truncate">
                      {formatCurrency(product.selling_price || 0)}
                    </span>
                    <button
                      type="button"
                      className="w-8 h-8 shrink-0 rounded-full bg-brand-orange text-white flex items-center justify-center active:bg-[#e55f00] shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(product);
                      }}
                      aria-label={`Add ${product.name}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
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
