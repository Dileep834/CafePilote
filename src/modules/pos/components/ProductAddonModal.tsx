import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, Check, ShoppingBag, Leaf, Drumstick, Droplet, UtensilsCrossed } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePOSStore } from '../store/usePOSStore';

interface ProductAddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  allProducts: any[];
}

export function ProductAddonModal({ isOpen, onClose, product, allProducts }: ProductAddonModalProps) {
  const addItem = usePOSStore(state => state.addItem);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [selectedSize, setSelectedSize] = useState<'regular' | 'small' | 'large'>('regular');
  const [selectedPortion, setSelectedPortion] = useState<'full' | 'half'>('full');
  const [selectedSpice, setSelectedSpice] = useState<'regular' | 'mild' | 'extra'>('regular');
  const [extraCheese, setExtraCheese] = useState(false);
  const [customNote, setCustomNote] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedAddons([]);
      setSelectedSize('regular');
      setSelectedPortion('full');
      setSelectedSpice('regular');
      setExtraCheese(false);
      setCustomNote('');
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Determine suggested categories based on main product
  let suggestedCategoryNames = ['Cold Beverages', 'Appetizer', 'Sides', 'Desserts'];
  const mainCat = (product.categories as any)?.name?.toLowerCase() || '';
  
  if (mainCat.includes('burger') || mainCat.includes('pizza') || mainCat.includes('pasta')) {
    suggestedCategoryNames = ['Cold Beverages', 'Hot Beverages', 'Appetizer', 'Sides'];
  } else if (mainCat.includes('beverage') || mainCat.includes('shake')) {
    suggestedCategoryNames = ['Desserts', 'Appetizer', 'Bread'];
  }

  // Filter products to find suggestions
  const suggestions = allProducts.filter(p => {
    if (p.id === product.id) return false;
    const catName = (p.categories as any)?.name?.toLowerCase() || '';
    return suggestedCategoryNames.some(sc => catName.includes(sc.toLowerCase()));
  }).slice(0, 6); // Max 6 suggestions

  const toggleAddon = (addon: any) => {
    const exists = selectedAddons.find(a => a.id === addon.id);
    if (exists) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleAddToOrder = () => {
    const mainPrice = adjustedMainPrice();
    const notes = [
      selectedSize !== 'regular' ? selectedSize : null,
      selectedPortion !== 'full' ? selectedPortion : null,
      selectedSpice !== 'regular' ? `${selectedSpice} spice` : null,
      extraCheese ? 'extra cheese' : null,
      customNote.trim() || null,
    ]
      .filter(Boolean)
      .join(', ');

    addItem(product, {
      price: mainPrice,
      notes,
    });
    selectedAddons.forEach(addon => {
      addItem(addon);
    });
    onClose();
  };

  const safePrice = (p: any) => p.selling_price || p.sellingPrice || 0;
  const adjustedMainPrice = () => {
    const base = safePrice(product);
    const sizeDelta =
      selectedSize === 'small' ? -base * 0.1 : selectedSize === 'large' ? base * 0.25 : 0;
    const portionMultiplier = selectedPortion === 'half' ? 0.6 : 1;
    const cheeseDelta = extraCheese ? 30 : 0;
    return Math.max(0, Math.round((base + sizeDelta) * portionMultiplier + cheeseDelta));
  };

  const getDietaryIcon = (pref: string) => {
    const p = pref.toLowerCase();
    if (p === 'veg') return <Leaf className="w-4 h-4 text-green-600" />;
    if (p === 'non-veg') return <Drumstick className="w-4 h-4 text-red-500" />;
    if (p === 'jain') return <Droplet className="w-4 h-4 text-orange-500" />;
    if (p === 'egg') return <Leaf className="w-4 h-4 text-yellow-500" />;
    return null;
  };

  const totalPrice = adjustedMainPrice() + selectedAddons.reduce((sum, item) => sum + safePrice(item), 0);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full sm:w-[500px] md:w-[600px] max-h-[90vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 sm:zoom-in-95 duration-300 pointer-events-auto">
        
        {/* Header Image */}
        <div className="relative w-full h-48 sm:h-56 bg-slate-100 shrink-0">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className="hidden absolute inset-0 w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
            <UtensilsCrossed className="w-16 h-16 opacity-20" />
          </div>
          
          {/* Close Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-white rounded p-0.5">
                {getDietaryIcon(product.dietary_preference || 'veg')}
              </div>
              <span className="text-sm font-medium opacity-90 text-slate-200">
                {(product.categories as any)?.name}
              </span>
            </div>
            <h2 className="text-2xl font-bold leading-tight drop-shadow-md">{product.name}</h2>
            <div className="text-xl font-bold text-brand-orange-light drop-shadow-md mt-1">{formatCurrency(safePrice(product))}</div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 scrollbar-hide bg-slate-50">
          <div className="mb-5 grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Modifiers</h3>
                  <p className="text-xs font-semibold text-slate-500">Fast kitchen instructions for this item</p>
                </div>
                <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-black text-brand-orange">
                  {formatCurrency(adjustedMainPrice())}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Size</p>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                    {(['small', 'regular', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          'h-9 rounded-lg text-xs font-black capitalize transition',
                          selectedSize === size ? 'bg-white text-brand-orange shadow-sm' : 'text-slate-500'
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Portion</p>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                    {(['half', 'full'] as const).map((portion) => (
                      <button
                        key={portion}
                        type="button"
                        onClick={() => setSelectedPortion(portion)}
                        className={cn(
                          'h-9 rounded-lg text-xs font-black capitalize transition',
                          selectedPortion === portion ? 'bg-white text-brand-orange shadow-sm' : 'text-slate-500'
                        )}
                      >
                        {portion}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Spice</p>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                    {(['mild', 'regular', 'extra'] as const).map((spice) => (
                      <button
                        key={spice}
                        type="button"
                        onClick={() => setSelectedSpice(spice)}
                        className={cn(
                          'h-9 rounded-lg text-xs font-black capitalize transition',
                          selectedSpice === spice ? 'bg-white text-brand-orange shadow-sm' : 'text-slate-500'
                        )}
                      >
                        {spice}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-3">
                <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={extraCheese}
                    onChange={(event) => setExtraCheese(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                  />
                  Extra cheese +{formatCurrency(30)}
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(event) => setCustomNote(event.target.value)}
                  placeholder="Kitchen note, allergy, no onion..."
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>
            </div>
          </div>
          
          {suggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Perfect Add-ons</h3>
              <p className="text-sm text-slate-500 mb-4">Complete your meal with these favorites</p>
              
              <div className="grid grid-cols-2 gap-3">
                {suggestions.map((addon) => {
                  const isSelected = selectedAddons.some(a => a.id === addon.id);
                  return (
                    <div 
                      key={addon.id}
                      onClick={() => toggleAddon(addon)}
                      className={cn(
                        "flex flex-col bg-white rounded-2xl p-3 border-2 transition-all cursor-pointer relative group",
                        isSelected 
                          ? "border-brand-orange bg-orange-50/30 shadow-[0_4px_15px_rgba(255,106,0,0.18)]" 
                          : "border-transparent shadow-sm hover:border-brand-orange/40"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-brand-orange text-white rounded-full flex items-center justify-center shadow-md z-10">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                      
                      <div className="w-full aspect-square bg-slate-100 rounded-xl mb-2 overflow-hidden relative">
                        {addon.image_url ? (
                          <img 
                            src={addon.image_url} 
                            alt={addon.name} 
                            className={cn("w-full h-full object-cover transition-transform duration-300", isSelected ? "scale-105" : "group-hover:scale-110")}
                            onError={(e) => e.currentTarget.style.display = 'none'}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <UtensilsCrossed className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      
                      <h4 className="font-bold text-slate-700 text-sm leading-tight mb-1 line-clamp-2">{addon.name}</h4>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="font-bold text-brand-orange">{formatCurrency(safePrice(addon))}</span>
                        {!isSelected && (
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-orange-100 group-hover:text-brand-orange transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer Fixed Action Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <Button 
            className="w-full h-14 bg-brand-orange hover:bg-[#e55f00] text-white rounded-2xl shadow-[0_8px_25px_rgba(147,51,234,0.25)] text-lg font-bold flex items-center justify-center gap-3 transition-transform active:scale-95"
            onClick={handleAddToOrder}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Add to Order - {formatCurrency(totalPrice)}</span>
          </Button>
        </div>

      </div>
    </div>,
    document.body
  );
}
