import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { usePOSStore } from '../store/usePOSStore';
import { usePOSFavoritesStore } from '../store/usePOSFavoritesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
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
  Clock3,
  BadgeCheck,
  Sparkles,
  PackageX,
} from 'lucide-react';
import { ProductAddonModal } from './ProductAddonModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';

const fetchProducts = async (companyId: string) => {
  let query = supabase
    .from('products')
    .select('*, categories(name)')
    .eq('is_active', true)
    .eq('item_type', 'ready_product')
    .order('name');

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;
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

function productStockQuantity(product: any) {
  return Number(
    product.current_stock ??
      product.stock_quantity ??
      product.stock ??
      product.quantity ??
      product.available_quantity ??
      0
  );
}

function isProductOutOfStock(product: any) {
  const explicit =
    product.is_out_of_stock === true ||
    String(product.stock_status || '').toLowerCase() === 'out_of_stock' ||
    String(product.status || '').toLowerCase() === 'out_of_stock';
  if (explicit) return true;
  if (product.track_stock === false || product.item_type !== 'ready_product') return false;
  const qty = productStockQuantity(product);
  return qty <= 0 && (product.current_stock !== undefined || product.stock_quantity !== undefined);
}

function prepMinutes(product: any) {
  const raw = Number(product.preparation_time ?? product.prep_time ?? product.prep_minutes);
  if (Number.isFinite(raw) && raw > 0) return Math.round(raw);
  const category = String((product.categories as any)?.name || '').toLowerCase();
  if (category.includes('beverage') || category.includes('coffee') || category.includes('shake')) return 5;
  if (category.includes('bread') || category.includes('fries') || category.includes('appetizer')) return 8;
  return 12;
}

function productBadges(product: any) {
  const badges: Array<{ label: string; className: string; icon?: typeof BadgeCheck }> = [];
  if (product.is_popular || product.is_featured) {
    badges.push({ label: 'Popular', className: 'bg-orange-500 text-white', icon: BadgeCheck });
  }
  if (product.is_chef_special || product.chef_special) {
    badges.push({ label: 'Chef special', className: 'bg-slate-900 text-white', icon: Sparkles });
  }
  const createdAt = product.created_at ? new Date(product.created_at).getTime() : 0;
  const isNew = product.is_new || (createdAt && Date.now() - createdAt < 1000 * 60 * 60 * 24 * 21);
  if (isNew) badges.push({ label: 'New', className: 'bg-emerald-500 text-white' });
  return badges.slice(0, 2);
}

function shouldOpenModifierSheet(product: any) {
  if (isProductOutOfStock(product)) return false;
  if (product.has_modifiers || product.allow_customization || product.is_combo) return true;
  if (Array.isArray(product.modifier_groups) && product.modifier_groups.length > 0) return true;
  if (Array.isArray(product.variants) && product.variants.length > 0) return true;
  const category = String((product.categories as any)?.name || '').toLowerCase();
  return ['pizza', 'burger', 'pasta', 'maggi', 'sandwich', 'fries', 'bread'].some((term) =>
    category.includes(term)
  );
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
  const user = useAuthStore((s) => s.user);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const companyId = getScopedCompanyId(user);
  const userKey = user?.id || user?.email || 'local-staff';
  const favList = byUser[userKey] || [];
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDiet, setSelectedDiet] = useState<string>('All');
  const [selectedProductForAddons, setSelectedProductForAddons] = useState<any | null>(null);
  const diets = ['All', 'Veg', 'Non-Veg', 'Egg', 'Jain'];

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['pos-products', companyId, activeOutletId],
    queryFn: () => fetchProducts(companyId),
  });

  const handleProductClick = (product: any) => {
    if (isProductOutOfStock(product)) return;
    if (shouldOpenModifierSheet(product)) {
      setSelectedProductForAddons(product);
      return;
    }
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
    <div className="flex flex-col h-full gap-2 sm:gap-4 min-h-0">
      {favoritesOnly && (
        <div className="px-0.5 sm:px-0">
          <p className="text-sm font-bold text-brand-navy">Your favorites</p>
          <p className="text-[11px] text-slate-500">
            Tap the heart on Menu items to add or remove
          </p>
        </div>
      )}

      {/* Category filter — desktop shows nav arrows, mobile scrolls freely */}
      {!favoritesOnly && (
        <div className="relative -mx-0.5 px-0.5 sm:mx-0 sm:px-0">
          <button
            type="button"
            aria-label="Previous category"
            className="cat-prev absolute left-0 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-md shadow-slate-900/10 backdrop-blur transition hover:border-brand-orange/40 hover:text-brand-orange sm:flex"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <Swiper
            slidesPerView="auto"
            spaceBetween={6}
            freeMode
            observer
            observeParents
            navigation={{ prevEl: '.cat-prev', nextEl: '.cat-next' }}
            modules={[FreeMode, Navigation]}
            className="pos-category-swiper w-full !overflow-hidden px-0 sm:px-9"
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
                      'flex items-center gap-1.5 h-8 sm:h-11 px-2.5 sm:px-5 rounded-full border transition-all duration-200 shadow-sm max-w-[10rem]',
                      isSelected
                        ? 'bg-brand-navy border-brand-navy text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-brand-orange/40'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-3 h-3 sm:w-4 sm:h-4 shrink-0',
                        isSelected ? 'text-brand-orange' : color
                      )}
                    />
                    <span className="text-[11px] sm:text-sm font-semibold truncate">{category}</span>
                  </button>
                </SwiperSlide>
              );
            })}
          </Swiper>

          <button
            type="button"
            aria-label="Next category"
            className="cat-next absolute right-0 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-md shadow-slate-900/10 backdrop-blur transition hover:border-brand-orange/40 hover:text-brand-orange sm:flex"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Diet filter + desktop search — on mobile merged into one scrollable strip */}
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
                    'snap-start flex items-center gap-1 h-7 sm:h-9 px-2.5 sm:px-3 rounded-full text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap border shrink-0',
                    isSelected
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 active:bg-slate-50'
                  )}
                >
                  {DietIcon && (
                    <DietIcon
                      className={cn(
                        'w-3 h-3',
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

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-4">
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
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
            {filteredProducts.map((product) => {
              const outOfStock = isProductOutOfStock(product);
              const badges = productBadges(product);
              const minutes = prepMinutes(product);
              const stockQty = productStockQuantity(product);

              return (
              <Card
                key={product.id}
                className={cn(
                  'group overflow-hidden bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm transition-all duration-200 flex flex-col p-1.5 sm:p-3 relative cursor-pointer',
                  outOfStock
                    ? 'opacity-75 cursor-not-allowed'
                    : 'active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-md hover:border-orange-200'
                )}
                onClick={() => handleProductClick(product)}
                aria-disabled={outOfStock}
              >
                {/* Dietary badge + favourite */}
                <div className="flex items-start justify-between z-10 w-full mb-1">
                  <div className="bg-white rounded p-0.5 shadow-sm border border-slate-100">
                    {getDietaryIcon(product.dietary_preference || 'veg')}
                  </div>
                  <button
                    type="button"
                    className={cn(
                      'p-0.5 -mr-0.5 -mt-0.5 rounded-full transition-colors',
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
                      className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', isFavorite(product.id) && 'fill-rose-500')}
                    />
                  </button>
                </div>

                {/* Product image — 4:3 on mobile (shorter than square), 4:3 on desktop */}
                <div className="relative w-full aspect-[4/3] rounded-lg sm:rounded-2xl overflow-hidden mb-1.5 sm:mb-2 bg-slate-50">
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
                        <UtensilsCrossed className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                      <UtensilsCrossed className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
                    </div>
                  )}
                  <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                    {badges.map((badge) => {
                      const BadgeIcon = badge.icon;
                      return (
                        <span
                          key={badge.label}
                          className={cn(
                            'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase shadow-sm',
                            badge.className
                          )}
                        >
                          {BadgeIcon && <BadgeIcon className="h-2.5 w-2.5" />}
                          {badge.label}
                        </span>
                      );
                    })}
                  </div>
                  {outOfStock && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 text-white">
                      <PackageX className="h-6 w-6 mb-1" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Out of stock</span>
                    </div>
                  )}
                </div>

                {/* Name + price + add button */}
                <div className="flex flex-col flex-1 min-w-0 gap-1">
                  <h3 className="font-semibold text-brand-navy text-[10px] sm:text-sm leading-snug line-clamp-2 tracking-tight min-h-[2em]">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400">
                    <span className="inline-flex items-center gap-0.5">
                      <Clock3 className="h-3 w-3" />
                      {minutes}m
                    </span>
                    <span className={cn('truncate', outOfStock ? 'text-rose-500' : stockQty > 0 ? 'text-emerald-600' : 'text-slate-400')}>
                      {outOfStock ? 'Unavailable' : stockQty > 0 ? `${stockQty} in stock` : 'Ready'}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-0.5">
                    <span className="text-[11px] sm:text-sm font-bold text-brand-orange tabular-nums truncate">
                      {formatCurrency(product.selling_price || 0)}
                    </span>
                    <button
                      type="button"
                      disabled={outOfStock}
                      className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 rounded-full bg-brand-orange text-white flex items-center justify-center active:bg-[#e55f00] shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (outOfStock) return;
                        addItem(product);
                      }}
                      aria-label={`Add ${product.name}`}
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </Card>
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
