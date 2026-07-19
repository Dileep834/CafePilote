import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Banknote,
  ChefHat,
  Clock,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Smartphone,
  Trash2,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSStore, type ManualPaymentMethod } from '../store/usePOSStore';
import { TableBillBanner } from './TableBillBanner';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { formatCurrency } from '@/utils/format';
import { useNavigate } from 'react-router-dom';

type Props = {
  /** Switch POS workspace to Held tab */
  onOpenHeld?: () => void;
  /** Close the mobile cart sheet */
  onClose?: () => void;
};

const quickManualMethods: Array<{
  id: Extract<ManualPaymentMethod, 'upi' | 'card' | 'wallet'>;
  label: string;
  helper: string;
  icon: LucideIcon;
}> = [
  { id: 'upi', label: 'UPI', helper: 'QR / scanner done', icon: Smartphone },
  { id: 'card', label: 'Card', helper: 'Terminal approved', icon: CreditCard },
  { id: 'wallet', label: 'Wallet', helper: 'Wallet paid', icon: Wallet },
];

function getFastCashAmounts(total: number) {
  const due = Math.max(1, Math.ceil(total));
  const amounts = [
    Math.ceil(due / 10) * 10,
    Math.ceil(due / 50) * 50,
    Math.ceil(due / 100) * 100,
    500,
    1000,
    2000,
  ].filter((amount) => amount >= due);

  return Array.from(new Set(amounts)).slice(0, 4);
}

export function Cart({ onOpenHeld, onClose }: Props) {
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
    setPaymentMethod,
    setTenderedAmount,
    processCheckout,
  } = usePOSStore();
  const getOpenBill = useTableBillStore((s) => s.getOpenBill);
  const getUnfiredItems = useTableBillStore((s) => s.getUnfiredItems);
  const lastError = useTableBillStore((s) => s.lastError);
  const navigate = useNavigate();

  const [editingQtyFor, setEditingQtyFor] = useState<string | null>(null);
  const [manualQty, setManualQty] = useState('');
  const [firing, setFiring] = useState(false);
  const [fireMsg, setFireMsg] = useState<string | null>(null);
  const [quickSettleOpen, setQuickSettleOpen] = useState(false);
  const [quickSettleBusy, setQuickSettleBusy] = useState(false);
  const [quickSettleError, setQuickSettleError] = useState<string | null>(null);

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
  const fastCashAmounts = useMemo(() => getFastCashAmounts(total), [total]);

  const handleQuickSettle = async (method: ManualPaymentMethod, tenderedAmount?: number) => {
    if (cart.length === 0 || quickSettleBusy) return;

    setQuickSettleBusy(true);
    setQuickSettleError(null);

    try {
      syncActiveTableBill();
      setPaymentMethod(method);
      setTenderedAmount(
        method === 'cash'
          ? String(Number((tenderedAmount ?? total).toFixed(2)))
          : String(Number(total.toFixed(2)))
      );
      await processCheckout();
      setQuickSettleOpen(false);
      navigate('/erp/pos/checkout?settled=quick');
    } catch (error) {
      setQuickSettleError(
        error instanceof Error ? error.message : 'Quick settle failed. Open full checkout and try again.'
      );
    } finally {
      setQuickSettleBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-5 bg-white border-b border-slate-100 flex flex-col gap-3 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="group -mt-3 -mb-1 mx-auto flex h-7 w-20 items-center justify-center rounded-full md:hidden"
            aria-label="Close order sheet"
          >
            <span className="h-1.5 w-12 rounded-full bg-slate-300 transition group-active:bg-slate-400" />
          </button>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy tracking-tight">
            {activeTableLabel ? `Table ${activeTableLabel}` : 'Current Order'}
          </h2>
          <div className="flex items-center gap-2">
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
            {onClose && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden"
                aria-label="Close order sheet"
              >
                <X className="h-4 w-4" />
              </Button>
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
                  {item.notes && (
                    <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-500">
                      {item.notes}
                    </p>
                  )}
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

      <div className="sticky bottom-0 z-20 shrink-0 space-y-2 border-t border-slate-100 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:space-y-3 sm:p-4 sm:pb-4">
        <div className="space-y-0.5 text-xs sm:space-y-1 sm:text-sm">
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
          <div className="flex justify-between pt-1 text-base font-black text-brand-navy sm:text-lg">
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

        <div className={activeTableId ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-2'}>
          {activeTableId && (
            <Button
              type="button"
              variant="outline"
              disabled={firing || unfiredCount === 0}
              onClick={() => void handleSendKitchen()}
              className="h-11 min-w-0 rounded-xl border-slate-200 px-2 text-xs font-bold sm:h-12 sm:px-3 sm:text-sm"
            >
              <ChefHat className="mr-1.5 h-4 w-4 shrink-0" />
              <span className="truncate">Kitchen{unfiredCount > 0 ? ` (${unfiredCount})` : ''}</span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            aria-label="Full checkout"
            disabled={cart.length === 0}
            onClick={() => {
              syncActiveTableBill();
              navigate('/erp/pos/checkout');
            }}
            className="h-11 min-w-0 rounded-xl border-slate-200 px-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:h-12 sm:px-3 sm:text-sm"
          >
            Full checkout
          </Button>
        </div>

        <Button
          type="button"
          disabled={cart.length === 0}
          onClick={() => {
            setQuickSettleError(null);
            setQuickSettleOpen(true);
          }}
          className="h-12 w-full rounded-xl bg-brand-orange text-sm font-black text-white shadow-[0_10px_28px_rgba(255,106,0,0.24)] hover:bg-[#e55f00] disabled:opacity-50 sm:h-14 sm:text-base"
        >
          <Zap className="w-4 h-4 mr-2" />
          Settle
        </Button>
      </div>

      {quickSettleOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-brand-orange">
                  Fast payment
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Settle payment</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {activeTableLabel ? `Table ${activeTableLabel}` : 'Counter order'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickSettleOpen(false)}
                className="h-9 w-9 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close quick settle"
              >
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Amount due</p>
                <div className="mt-1 text-3xl font-black text-brand-orange">{formatCurrency(total)}</div>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items including tax
                </p>
              </div>

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">Cash</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    disabled={quickSettleBusy}
                    onClick={() => void handleQuickSettle('cash', total)}
                    className="h-14 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-black"
                  >
                    Exact cash
                  </Button>
                  {fastCashAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      disabled={quickSettleBusy}
                      onClick={() => void handleQuickSettle('cash', amount)}
                      className="h-14 rounded-xl border-slate-200 font-black hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <span className="flex flex-col leading-tight">
                        <span>{formatCurrency(amount)}</span>
                        <span className="text-[10px] font-bold text-emerald-600">
                          Change {formatCurrency(Math.max(0, amount - total))}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-brand-orange" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">
                    Manual paid
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {quickManualMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <Button
                        key={method.id}
                        type="button"
                        variant="outline"
                        disabled={quickSettleBusy}
                        onClick={() => void handleQuickSettle(method.id)}
                        className="h-20 rounded-xl border-slate-200 px-2 font-black hover:border-orange-300 hover:bg-orange-50"
                      >
                        <span className="flex flex-col items-center gap-1 leading-tight">
                          <Icon className="h-5 w-5 text-brand-orange" />
                          <span>{method.label}</span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {method.helper}
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </section>

              {quickSettleError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {quickSettleError}
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                <span>Use full checkout for split bills and verified online gateways.</span>
                {quickSettleBusy && (
                  <span className="inline-flex items-center gap-1 text-brand-orange">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Settling
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editingQtyFor && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
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
        </div>,
        document.body
      )}
    </div>
  );
}
