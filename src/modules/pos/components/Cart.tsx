import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Banknote,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Smartphone,
  Split,
  Trash2,
  ArrowRightLeft,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePOSStore, type ManualPaymentMethod } from '../store/usePOSStore';
import { TableBillBanner } from './TableBillBanner';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { formatCurrency } from '@/utils/format';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Props = {
  onOpenHeld?: () => void;
  onClose?: () => void;
};

const ROW_HEIGHT = 54;
const OVERSCAN = 8;

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

function useVirtualWindow(count: number, rowHeight: number) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(400);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const measure = () => setViewportH(el.clientHeight || 400);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const visible = Math.ceil(viewportH / rowHeight) + OVERSCAN * 2;
  const end = Math.min(count, start + visible);
  const offsetY = start * rowHeight;
  const totalH = count * rowHeight;

  return { parentRef, onScroll, start, end, offsetY, totalH };
}

export function Cart({ onOpenHeld, onClose }: Props) {
  const {
    cart,
    removeItem,
    updateQuantity,
    clearCart,
    discountType,
    discountValue,
    setDiscount,
    serviceCharge,
    setServiceCharge,
    orderNotes,
    setOrderNotes,
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
    taxRate,
    customerName,
    customerPhone,
    setCustomerDetails,
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
  const [cartSearch, setCartSearch] = useState('');
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem('cafepilots-cart-collapsed') === '1';
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const showCartSearch = cart.length > 15 || searchOpen;

  useEffect(() => {
    fetchHeldOrders();
  }, [fetchHeldOrders]);

  useEffect(() => {
    window.sessionStorage.setItem('cafepilots-cart-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const openBill = activeTableId ? getOpenBill(activeTableId) : undefined;
  const unfiredCount = openBill ? getUnfiredItems(openBill).length : 0;

  const handleOpenQtyModal = (id: string, currentQty: number) => {
    setEditingQtyFor(id);
    setManualQty(currentQty.toString());
  };

  const handleSaveQty = () => {
    if (editingQtyFor) {
      const qty = parseInt(manualQty, 10);
      if (!isNaN(qty) && qty > 0) updateQuantity(editingQtyFor, qty);
      else if (qty === 0) removeItem(editingQtyFor);
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
  const tax = discountedSubtotal * taxRate;
  const charges = serviceCharge || 0;
  const total = discountedSubtotal + tax + charges;
  const fastCashAmounts = useMemo(() => getFastCashAmounts(total), [total]);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const guestLabel = customerName?.trim() || 'Walk-in';

  const filteredCart = useMemo(() => {
    const q = cartSearch.trim().toLowerCase();
    if (!q) return cart;
    return cart.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q)
    );
  }, [cart, cartSearch]);

  const { parentRef, onScroll, start, end, offsetY, totalH } = useVirtualWindow(
    filteredCart.length,
    ROW_HEIGHT
  );
  const visibleItems = filteredCart.slice(start, end);

  const handlePrintTicket = () => {
    const lines = cart
      .map((i) => `${i.quantity}× ${i.name} — ${formatCurrency(i.price * i.quantity)}`)
      .join('\n');
    const win = window.open('', '_blank', 'width=360,height=640');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Order ticket</title>
      <style>body{font-family:ui-monospace,Menlo,monospace;padding:16px}h1{font-size:15px}.t{color:#FF6A00;font-weight:800;font-size:18px}</style></head>
      <body><h1>CafePilots · ${activeTableLabel ? `Table ${activeTableLabel}` : 'Counter'}</h1>
      <p>${guestLabel}${orderNotes ? ` · ${orderNotes}` : ''}</p>
      <pre>${lines}</pre><p class="t">Total ${formatCurrency(total)}</p>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  };

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

  const actionButtons = [
    {
      key: 'hold',
      label: activeTableLabel ? 'Park' : 'Hold',
      icon: Clock,
      onClick: () =>
        void holdCurrentOrder(
          orderNotes ||
            (activeTableLabel
              ? `Table ${activeTableLabel}`
              : 'Held ' + new Date().toLocaleTimeString())
        ),
    },
    {
      key: 'split',
      label: 'Split',
      icon: Split,
      onClick: () => {
        syncActiveTableBill();
        navigate('/erp/pos/checkout?split=1');
      },
    },
    {
      key: 'transfer',
      label: 'Transfer',
      icon: ArrowRightLeft,
      onClick: () => navigate('/erp/tables'),
    },
    { key: 'print', label: 'Print', icon: Printer, onClick: handlePrintTicket },
  ] as const;

  /* ── Collapsed strip ── */
  if (collapsed) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex w-full items-center gap-3 border-b border-slate-100 bg-white px-3 py-3 text-left transition hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange text-white shadow-sm">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              Current Order ({itemCount}) · {formatCurrency(total)}
            </p>
            <p className="truncate text-[11px] font-semibold text-slate-400">
              {activeTableLabel ? `Table ${activeTableLabel}` : 'Counter'} · {guestLabel}
            </p>
          </div>
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
        <div className="mt-auto border-t border-slate-100 p-3">
          <Button
            type="button"
            disabled={cart.length === 0}
            onClick={() => {
              setQuickSettleError(null);
              setQuickSettleOpen(true);
            }}
            className="h-12 w-full rounded-xl bg-brand-orange text-sm font-black text-white shadow-[0_10px_28px_rgba(255,106,0,0.24)] hover:bg-[#e55f00] disabled:opacity-50"
          >
            <Zap className="mr-2 h-4 w-4" />
            Pay · {formatCurrency(total)}
          </Button>
        </div>
        {quickSettleOpen &&
          ReactDOM.createPortal(renderQuickSettle(), document.body)}
      </div>
    );
  }

  function renderQuickSettle() {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
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
          <div className="space-y-5 p-5">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Amount due</p>
              <div className="mt-1 text-3xl font-black text-brand-orange">{formatCurrency(total)}</div>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {itemCount} items including tax
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Cash</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  disabled={quickSettleBusy}
                  className="h-12 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                  onClick={() => void handleQuickSettle('cash', total)}
                >
                  <Banknote className="mr-2 h-4 w-4" />
                  Exact
                </Button>
                {fastCashAmounts.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    disabled={quickSettleBusy}
                    variant="outline"
                    className="h-12 rounded-xl font-bold"
                    onClick={() => void handleQuickSettle('cash', amount)}
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {quickManualMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.id}
                    type="button"
                    disabled={quickSettleBusy}
                    variant="outline"
                    className="h-16 flex-col gap-1 rounded-xl"
                    onClick={() => void handleQuickSettle(method.id)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-bold">{method.label}</span>
                  </Button>
                );
              })}
            </div>
            {quickSettleBusy && (
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Processing…
              </p>
            )}
            {quickSettleError && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                {quickSettleError}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl font-bold"
              onClick={() => {
                syncActiveTableBill();
                navigate('/erp/pos/checkout');
              }}
            >
              Open full checkout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {/* HEADER — fixed */}
      <div className="z-10 shrink-0 border-b border-slate-100 bg-white">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="group mx-auto flex h-6 w-16 items-center justify-center rounded-full md:hidden"
            aria-label="Close order sheet"
          >
            <span className="h-1 w-10 rounded-full bg-slate-300" />
          </button>
        )}

        <div className="flex items-start gap-2.5 px-3 py-2.5 sm:px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-900">
                  Current Order ({itemCount})
                </h2>
                <p className="truncate text-xs text-slate-500">
                  {activeTableLabel ? `Table ${activeTableLabel}` : 'Counter'} · {guestLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="h-8 rounded-lg px-2 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                  aria-label="Collapse cart"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 md:hidden"
                    aria-label="Close order sheet"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-0.5 text-[15px] font-bold tabular-nums text-brand-orange">
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        <div className="px-3 pb-2 sm:px-4">
          <TableBillBanner />
        </div>

        {heldOrders.length > 0 && !activeTableLabel && onOpenHeld && (
          <div className="px-3 pb-2 sm:px-4">
            <button
              type="button"
              className="h-8 w-full rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              onClick={onOpenHeld}
            >
              Held orders ({heldOrders.length})
            </button>
          </div>
        )}

        {cart.length > 0 && (
          <div className="px-3 pb-2 sm:px-4">
            {showCartSearch ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={cartSearch}
                  onChange={(e) => setCartSearch(e.target.value)}
                  placeholder="Search cart…"
                  className="h-8 w-full rounded-lg bg-slate-100 pl-8 pr-8 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-brand-orange/20"
                />
                {cart.length <= 15 && (
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                    onClick={() => {
                      setSearchOpen(false);
                      setCartSearch('');
                    }}
                    aria-label="Close cart search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="mt-1 flex w-full items-center justify-between py-1 text-xs font-semibold text-slate-400"
            >
              Customer · Notes · Discount
              {detailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {detailsOpen && (
              <div className="mb-1 space-y-1.5 rounded-lg bg-slate-50 p-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    className="h-8 rounded-lg bg-white px-2 text-xs outline-none ring-1 ring-slate-200 focus:ring-brand-orange"
                    value={customerName}
                    placeholder="Customer / Walk-in"
                    onChange={(e) => setCustomerDetails(e.target.value, customerPhone)}
                  />
                  <input
                    className="h-8 rounded-lg bg-white px-2 text-xs outline-none ring-1 ring-slate-200 focus:ring-brand-orange"
                    value={customerPhone}
                    placeholder="Phone"
                    onChange={(e) => setCustomerDetails(customerName, e.target.value)}
                  />
                </div>
                <input
                  className="h-8 w-full rounded-lg bg-white px-2 text-xs outline-none ring-1 ring-slate-200 focus:ring-brand-orange"
                  value={orderNotes}
                  placeholder="Order notes…"
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    min={0}
                    className="h-8 rounded-lg bg-white px-2 text-xs outline-none ring-1 ring-slate-200 focus:ring-brand-orange"
                    value={discountType === 'fixed' ? discountValue || '' : ''}
                    placeholder="Discount ₹"
                    onChange={(e) => setDiscount('fixed', Math.max(0, Number(e.target.value) || 0))}
                  />
                  <input
                    type="number"
                    min={0}
                    className="h-8 rounded-lg bg-white px-2 text-xs outline-none ring-1 ring-slate-200 focus:ring-brand-orange"
                    value={serviceCharge || ''}
                    placeholder="Charges ₹"
                    onChange={(e) => setServiceCharge(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ITEM LIST — only this scrolls / virtualized */}
      <div
        ref={parentRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-2 py-1 sm:px-3"
      >
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-slate-400">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <ShoppingCart className="h-6 w-6 text-slate-300" />
            </div>
            <p className="font-bold text-slate-500">Your cart is empty</p>
            <p className="text-sm">Scan or tap an item to add</p>
          </div>
        ) : filteredCart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
            <Search className="mb-2 h-7 w-7 opacity-40" />
            <p className="text-sm font-semibold text-slate-500">No matching items</p>
            <p className="text-xs">Try another search in this order</p>
          </div>
        ) : (
          <div style={{ height: totalH, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleItems.map((item, idx) => (
                <div
                  key={item.id}
                  style={{ height: ROW_HEIGHT }}
                  className={cn(
                    'flex items-center gap-2.5 px-1',
                    start + idx < filteredCart.length - 1 && 'border-b border-slate-100'
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-[9px] font-bold text-slate-400">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      item.name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight text-slate-900">
                      {item.name}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 p-0.5">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white"
                      onClick={() => {
                        if (item.quantity <= 1) removeItem(item.id);
                        else updateQuantity(item.id, item.quantity - 1);
                      }}
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums"
                      onClick={() => handleOpenQtyModal(item.id, item.quantity)}
                    >
                      {item.quantity}
                    </button>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label={`Increase ${item.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span className="w-16 shrink-0 text-right text-[15px] font-bold tabular-nums text-slate-900">
                    {formatCurrency(item.price * item.quantity)}
                  </span>

                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-100 hover:text-rose-500"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STICKY FOOTER: summary + actions + pay */}
      <div className="z-20 shrink-0 space-y-2 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        {cart.length > 0 && (
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Items</span>
              <span className="font-medium tabular-nums text-slate-700">{itemCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium tabular-nums text-slate-700">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span className="font-medium tabular-nums">−{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax ({Math.round(taxRate * 100)}%)</span>
              <span className="font-medium tabular-nums text-slate-700">{formatCurrency(tax)}</span>
            </div>
            {charges > 0 && (
              <div className="flex justify-between">
                <span>Service Charge</span>
                <span className="font-medium tabular-nums text-slate-700">{formatCurrency(charges)}</span>
              </div>
            )}
            <div className="mt-2 flex items-end justify-between border-t border-slate-900 pt-2">
              <span className="text-sm font-semibold text-slate-900">Grand Total</span>
              <span className="text-2xl font-bold tabular-nums leading-none text-brand-orange">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        )}

        {fireMsg && (
          <p
            className={`text-center text-xs font-medium ${
              fireMsg.includes('fail') || fireMsg.includes('Send')
                ? 'text-rose-600'
                : 'text-emerald-600'
            }`}
          >
            {fireMsg}
          </p>
        )}

        {cart.length > 0 && (
          <div className="flex items-center justify-around gap-1 py-0.5">
            {actionButtons.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  title={action.label}
                  aria-label={action.label}
                  className="inline-flex h-10 w-10 flex-col items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <Icon className="h-4 w-4" />
                  <span className="mt-0.5 text-[9px] font-medium leading-none">{action.label}</span>
                </button>
              );
            })}
            {activeTableId && (
              <button
                type="button"
                disabled={firing || unfiredCount === 0}
                onClick={() => void handleSendKitchen()}
                title="Kitchen"
                aria-label="Send to kitchen"
                className="inline-flex h-10 w-10 flex-col items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35"
              >
                <ChefHat className="h-4 w-4" />
                <span className="mt-0.5 text-[9px] font-medium leading-none">Kitchen</span>
              </button>
            )}
          </div>
        )}

        <Button
          type="button"
          disabled={cart.length === 0}
          onClick={() => {
            setQuickSettleError(null);
            setQuickSettleOpen(true);
          }}
          className="h-12 w-full rounded-xl bg-brand-orange text-base font-bold text-white hover:bg-[#e55f00] disabled:opacity-50"
        >
          Pay · {formatCurrency(total)}
        </Button>
      </div>

      {editingQtyFor &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
              <h3 className="text-sm font-black text-slate-900">Set quantity</h3>
              <input
                type="number"
                min={0}
                className="mt-3 h-11 w-full rounded-xl border border-slate-200 px-3 text-center text-lg font-black outline-none focus:border-brand-orange"
                value={manualQty}
                onChange={(e) => setManualQty(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveQty()}
              />
              <div className="mt-3 flex gap-2">
                <Button variant="outline" className="h-10 flex-1 rounded-xl" onClick={() => setEditingQtyFor(null)}>
                  Cancel
                </Button>
                <Button className="h-10 flex-1 rounded-xl bg-brand-orange text-white hover:bg-[#e55f00]" onClick={handleSaveQty}>
                  Save
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {quickSettleOpen && ReactDOM.createPortal(renderQuickSettle(), document.body)}
    </div>
  );
}
