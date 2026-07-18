import React, { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, ShoppingCart, Clock, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSStore } from '../store/usePOSStore';
import { TableBillBanner } from './TableBillBanner';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { formatCurrency } from '@/utils/format';
import { useNavigate } from 'react-router-dom';

type Props = {
  /** Switch POS workspace to Held tab */
  onOpenHeld?: () => void;
};

export function Cart({ onOpenHeld }: Props) {
  const {
    cart,
    removeItem,
    updateQuantity,
    clearCart,
    discountType,
    discountValue,
    heldOrders,
    holdCurrentOrder,
    fetchHeldOrders,
    activeTableId,
    activeTableLabel,
    syncActiveTableBill,
    fireActiveTableKitchen,
  } = usePOSStore();
  const getOpenBill = useTableBillStore((s) => s.getOpenBill);
  const getUnfiredItems = useTableBillStore((s) => s.getUnfiredItems);
  const lastError = useTableBillStore((s) => s.lastError);
  const navigate = useNavigate();

  const [editingQtyFor, setEditingQtyFor] = useState<string | null>(null);
  const [manualQty, setManualQty] = useState('');
  const [firing, setFiring] = useState(false);
  const [fireMsg, setFireMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchHeldOrders();
  }, [fetchHeldOrders]);

  const openBill = activeTableId ? getOpenBill(activeTableId) : undefined;
  const unfiredCount = openBill ? getUnfiredItems(openBill).length : 0;

  const handleOpenQtyModal = (id: string, currentQty: number) => {
    setEditingQtyFor(id);
    setManualQty(currentQty.toString());
  };

  const handleSaveQty = () => {
    if (editingQtyFor) {
      const qty = parseInt(manualQty, 10);
      if (!isNaN(qty) && qty > 0) {
        updateQuantity(editingQtyFor, qty);
      } else if (qty === 0) {
        removeItem(editingQtyFor);
      }
    }
    setEditingQtyFor(null);
  };

  const handleSendKitchen = async () => {
    setFiring(true);
    setFireMsg(null);
    syncActiveTableBill();
    const ok = await fireActiveTableKitchen();
    setFiring(false);
    setFireMsg(ok ? 'Sent to kitchen' : lastError || 'Send failed');
    if (ok) setTimeout(() => setFireMsg(null), 2000);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount =
    discountType === 'percentage' ? (subtotal * discountValue) / 100 : discountValue;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = discountedSubtotal * 0.18;
  const total = discountedSubtotal + tax;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-5 bg-white border-b border-slate-100 flex flex-col gap-3 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy tracking-tight">
            {activeTableLabel ? `Table ${activeTableLabel}` : 'Current Order'}
          </h2>
          <div className="flex gap-2">
            {cart.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => holdCurrentOrder('Held ' + new Date().toLocaleTimeString())}
                  className="h-8 px-3 rounded-full text-xs font-bold uppercase tracking-wider text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                >
                  {activeTableLabel ? 'Park' : 'Hold'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-3 rounded-full text-xs font-bold uppercase tracking-wider"
                >
                  Clear All
                </Button>
              </>
            )}
          </div>
        </div>

        <TableBillBanner />

        {heldOrders.length > 0 && !activeTableLabel && onOpenHeld && (
          <Button
            type="button"
            variant="secondary"
            className="w-full bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            onClick={onOpenHeld}
          >
            <Clock className="w-4 h-4 mr-2" />
            View {heldOrders.length} held {heldOrders.length === 1 ? 'order' : 'orders'}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4 py-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-bold text-slate-500">Your cart is empty</p>
            <p className="text-sm">Scan or tap an item to add</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-800 truncate">{item.name}</h4>
                  <p className="text-xs text-brand-orange font-bold">
                    {formatCurrency(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <button
                    type="button"
                    className="w-8 text-center font-bold text-sm"
                    onClick={() => handleOpenQtyModal(item.id, item.quantity)}
                  >
                    {item.quantity}
                  </button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 bg-white border-t border-slate-100 space-y-3 shrink-0">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span className="font-semibold">−{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>Tax (18%)</span>
            <span className="font-semibold text-slate-700">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-black text-brand-navy pt-1">
            <span>TOTAL</span>
            <span className="text-brand-orange">{formatCurrency(total)}</span>
          </div>
        </div>

        {fireMsg && (
          <p
            className={`text-xs font-medium text-center ${
              fireMsg.includes('fail') || fireMsg.includes('Send')
                ? 'text-rose-600'
                : 'text-emerald-600'
            }`}
          >
            {fireMsg}
          </p>
        )}

        <div className="flex gap-2">
          {activeTableId && (
            <Button
              type="button"
              variant="outline"
              disabled={firing || unfiredCount === 0}
              onClick={() => void handleSendKitchen()}
              className="h-12 rounded-xl font-bold border-slate-200"
            >
              <ChefHat className="w-4 h-4 mr-1.5" />
              Kitchen{unfiredCount > 0 ? ` (${unfiredCount})` : ''}
            </Button>
          )}
          <Button
            type="button"
            disabled={cart.length === 0}
            onClick={() => {
              syncActiveTableBill();
              navigate('/erp/pos/checkout');
            }}
            className="flex-1 h-12 rounded-xl font-bold text-white bg-brand-orange hover:bg-[#e55f00] disabled:opacity-50"
          >
            Pay bill →
          </Button>
        </div>
      </div>

      {editingQtyFor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Update quantity</h3>
            <input
              type="number"
              autoFocus
              className="w-32 h-16 text-center text-3xl font-black border-2 border-slate-200 rounded-xl focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/20 outline-none transition-all"
              value={manualQty}
              onChange={(e) => setManualQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveQty();
                if (e.key === 'Escape') setEditingQtyFor(null);
              }}
              onFocus={(e) => e.target.select()}
            />
            <div className="flex gap-3 w-full mt-8">
              <Button
                variant="outline"
                className="flex-1 h-12 font-bold"
                onClick={() => setEditingQtyFor(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 bg-brand-orange hover:bg-[#e55f00] text-white font-bold"
                onClick={handleSaveQty}
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
