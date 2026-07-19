import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePOSStore, type OnlinePaymentMethod, type PaymentMethod } from '../store/usePOSStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Banknote, CreditCard, Smartphone, Delete, CheckCircle2, User, Phone, Printer, Plus, MessageSquare, Ticket, Loader2, ExternalLink, RefreshCw, ShieldCheck, AlertCircle, Wallet, Gift, ReceiptText, PauseCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThermalReceipt } from '../components/ThermalReceipt';
import { useSettingsStore } from '../../settings/store/useSettingsStore';
import { useVoucherStore } from '../../marketing/store/useVoucherStore';
import {
  checkGatewayPaymentStatus,
  createGatewayPayment,
  fetchOutletGatewaySettings,
  invokePaytmCheckout,
  isOnlinePaymentMethod,
  type GatewayPaymentSession,
  type GatewayPaymentStatus,
} from '../services/paymentGatewayService';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { useVisualViewportBottom } from '@/hooks/useVisualViewportBottom';

type GatewayUiState =
  | { status: 'idle'; message: string; session: null; verification: null }
  | { status: 'starting'; message: string; session: null; verification: null }
  | { status: 'started'; message: string; session: GatewayPaymentSession; verification: null }
  | { status: 'checking'; message: string; session: GatewayPaymentSession; verification: GatewayPaymentStatus | null }
  | { status: 'verified'; message: string; session: GatewayPaymentSession; verification: GatewayPaymentStatus }
  | { status: 'failed'; message: string; session: GatewayPaymentSession | null; verification: GatewayPaymentStatus | null }
  | { status: 'error'; message: string; session: GatewayPaymentSession | null; verification: GatewayPaymentStatus | null };

const paymentMethods: Array<{
  id: PaymentMethod;
  icon: typeof Banknote;
  label: string;
  helper: string;
}> = [
  { id: 'cash', icon: Banknote, label: 'Cash', helper: 'Counter cash' },
  { id: 'card', icon: CreditCard, label: 'Card', helper: 'Manual terminal' },
  { id: 'upi', icon: Smartphone, label: 'UPI', helper: 'Manual QR' },
  { id: 'wallet', icon: Wallet, label: 'Wallet', helper: 'Digital wallet' },
  { id: 'gift_card', icon: Gift, label: 'Gift Card', helper: 'Voucher/card' },
  { id: 'credit', icon: ReceiptText, label: 'Credit', helper: 'Pay later' },
  { id: 'split', icon: Plus, label: 'Split', helper: 'Multiple pays' },
  { id: 'store_credit', icon: Wallet, label: 'Store Credit', helper: 'Customer credit' },
  { id: 'paytm', icon: Smartphone, label: 'Paytm', helper: 'JS Checkout' },
  { id: 'phonepe', icon: Smartphone, label: 'PhonePe', helper: 'Standard Checkout' },
  { id: 'amazonpay', icon: CreditCard, label: 'Amazon Pay', helper: 'Checkout v2' },
];

function getPaymentMethodLabel(method: PaymentMethod) {
  return paymentMethods.find((item) => item.id === method)?.label || method;
}

export function CheckoutPage() {
  useVisualViewportBottom();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const activeOutletId = useTenantStore((state) => state.activeOutletId);
  const outletId = activeOutletId || getTenantOutletId(user);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const { 
    cart, 
    taxRate,
    paymentMethod, 
    setPaymentMethod, 
    tenderedAmount, 
    setTenderedAmount,
    customerName,
    customerPhone,
    setCustomerDetails,
    processCheckout,
    discountType,
    discountValue,
    setDiscount,
    lastOrder,
    activeTableLabel,
    holdCurrentOrder,
  } = usePOSStore();

  const { validateVoucher } = useVoucherStore();
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [gatewayState, setGatewayState] = useState<GatewayUiState>({
    status: 'idle',
    message: 'Choose an online gateway to start a secure payment.',
    session: null,
    verification: null,
  });
  const [enabledGateways, setEnabledGateways] = useState<OnlinePaymentMethod[]>([]);
  const [gatewaySettingsError, setGatewaySettingsError] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === 'percentage' ? (subtotal * discountValue) / 100 : discountValue;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + tax;
  const availablePaymentMethods = useMemo(
    () =>
      paymentMethods.filter((method) => {
        if (!isOnlinePaymentMethod(method.id)) return true;
        return enabledGateways.includes(method.id);
      }),
    [enabledGateways]
  );

  useEffect(() => {
    const quickSettled = new URLSearchParams(location.search).get('settled') === 'quick';
    if (quickSettled && lastOrder) setIsSuccess(true);
  }, [lastOrder, location.search]);

  useEffect(() => {
    let cancelled = false;
    setGatewaySettingsError('');

    fetchOutletGatewaySettings(outletId)
      .then((settings) => {
        if (cancelled) return;
        const configured = settings.gateways
          .filter((gateway) => gateway.isEnabled && gateway.configured)
          .map((gateway) => gateway.gateway);
        setEnabledGateways(configured);
      })
      .catch((error) => {
        if (cancelled) return;
        setEnabledGateways([]);
        setGatewaySettingsError(
          error instanceof Error ? error.message : 'Payment gateway settings are unavailable.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [outletId]);

  useEffect(() => {
    if (isOnlinePaymentMethod(paymentMethod) && !enabledGateways.includes(paymentMethod)) {
      setPaymentMethod('cash');
    }
  }, [enabledGateways, paymentMethod, setPaymentMethod]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setDiscount('fixed', 0);
      setPromoError('');
      return;
    }
    
    setIsApplyingPromo(true);
    setPromoError('');
    
    const result = await validateVoucher(promoCode, subtotal);
    if (result.valid && result.voucher) {
      setDiscount(result.voucher.discount_type, result.voucher.discount_value);
    } else {
      setPromoError(result.error || 'Invalid code');
      setDiscount('fixed', 0);
    }
    setIsApplyingPromo(false);
  };

  const handleNumpadPress = (val: string) => {
    if (val === 'clear') {
      setTenderedAmount('');
    } else if (val === 'backspace') {
      setTenderedAmount(tenderedAmount.slice(0, -1));
    } else {
      // Prevent multiple decimals
      if (val === '.' && tenderedAmount.includes('.')) return;
      // Prevent leading zeros unless followed by decimal
      if (tenderedAmount === '0' && val !== '.') {
        setTenderedAmount(val);
        return;
      }
      setTenderedAmount(tenderedAmount + val);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setTenderedAmount(amount.toString());
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setGatewayState({
      status: 'idle',
      message: isOnlinePaymentMethod(method)
        ? `Start ${getPaymentMethodLabel(method)} payment for this order.`
        : 'Choose an online gateway to start a secure payment.',
      session: null,
      verification: null,
    });
  };

  const handleStartGatewayPayment = async () => {
    if (!isOnlinePaymentMethod(paymentMethod)) return;

    setGatewayState({
      status: 'starting',
      message: `Starting ${getPaymentMethodLabel(paymentMethod)} payment...`,
      session: null,
      verification: null,
    });

    try {
      const session = await createGatewayPayment({
        gateway: paymentMethod,
        outletId,
        amount: total,
        currency: 'INR',
        customer: {
          name: customerName,
          phone: customerPhone,
        },
        order: {
          tableLabel: activeTableLabel,
          itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        },
      });

      setGatewayState({
        status: 'started',
        message:
          session.nextAction === 'paytm_checkout'
            ? 'Paytm checkout opened. Complete payment, then check status.'
            : 'Gateway checkout opened. Complete payment, then check status.',
        session,
        verification: null,
      });

      if (session.nextAction === 'paytm_checkout') {
        await invokePaytmCheckout(session, (eventName) => {
          setGatewayState((current) =>
            current.session?.providerOrderId === session.providerOrderId
              ? {
                  ...current,
                  message: `Paytm reported ${eventName}. Check status before completing the order.`,
                }
              : current
          );
        });
        return;
      }

      if (session.redirectUrl) {
        window.open(session.redirectUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      setGatewayState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Payment gateway could not be started. Check server configuration.',
        session: null,
        verification: null,
      });
    }
  };

  const handleCheckGatewayStatus = async () => {
    const session = gatewayState.session;
    if (!session) return;

    setGatewayState({
      status: 'checking',
      message: 'Checking final payment status...',
      session,
      verification: gatewayState.verification,
    });

    try {
      const verification = await checkGatewayPaymentStatus(session);
      if (verification.status === 'success') {
        setGatewayState({
          status: 'verified',
          message: 'Payment verified successfully. You can complete the order.',
          session,
          verification,
        });
        return;
      }

      if (verification.status === 'failed') {
        setGatewayState({
          status: 'failed',
          message: 'Payment failed or expired. Start a new gateway payment or choose another method.',
          session,
          verification,
        });
        return;
      }

      setGatewayState({
        status: 'started',
        message: 'Payment is still pending. Wait a moment and check status again.',
        session,
        verification: null,
      });
    } catch (error) {
      setGatewayState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Payment status check failed.',
        session,
        verification: null,
      });
    }
  };

  const handleCompleteOrder = async () => {
    if (!isReady || isCompleting) return;
    setIsCompleting(true);
    const paymentReference =
      gatewayState.status === 'verified' && gatewayState.session
        ? {
            gateway: gatewayState.session.gateway,
            providerOrderId: gatewayState.session.providerOrderId,
            providerSessionId: gatewayState.session.providerSessionId,
            providerTransactionId: gatewayState.verification.providerTransactionId,
            status: gatewayState.verification.rawStatus || gatewayState.verification.status,
          }
        : undefined;

    try {
      await processCheckout(paymentReference);
      setIsSuccess(true);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNewOrder = () => {
    setIsSuccess(false);
    navigate('/erp/pos');
  };

  const tenderedNumeric = parseFloat(tenderedAmount) || 0;
  const changeDue = Math.max(0, tenderedNumeric - total);
  const isOnlineGateway = isOnlinePaymentMethod(paymentMethod);
  const selectedGatewaySession =
    gatewayState.session?.gateway === paymentMethod ? gatewayState.session : null;
  const serviceCharge = 0;
  const roundOff = 0;
  const paidAmount =
    paymentMethod === 'cash'
      ? Math.min(tenderedNumeric, total)
      : isOnlineGateway
        ? gatewayState.status === 'verified'
          ? total
          : 0
        : total;
  const remainingAmount = Math.max(0, total - paidAmount);
  
  // Is the order ready to complete?
  const isReady =
    paymentMethod === 'cash'
      ? tenderedNumeric >= total
      : isOnlineGateway
        ? gatewayState.status === 'verified' && selectedGatewaySession !== null
        : true;

  const handleHoldBill = async () => {
    await holdCurrentOrder(activeTableLabel ? `Held table ${activeTableLabel}` : 'Held from checkout');
    navigate('/erp/pos?view=held');
  };

  const settings = useSettingsStore();

  const handleWhatsAppReceipt = () => {
    let text = `☕ *${settings.cafeName}*\n`;
    text += `--------------------------\n`;
    text += `Order Date: ${new Date().toLocaleDateString()}\n\n`;
    
    cart.forEach(item => {
      text += `${item.quantity}x ${item.name} - ${formatCurrency(item.price * item.quantity)}\n`;
    });
    
    text += `--------------------------\n`;
    text += `*Total: ${formatCurrency(total)}*\n`;
    text += `--------------------------\n`;
    text += `_${settings.receiptFooterMessage}_\n`;

    const encodedText = encodeURIComponent(text);
    const waUrl = customerPhone 
      ? `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
      
    window.open(waUrl, '_blank');
  };

  if (isSuccess) {
    const receiptCart = lastOrder?.cart || cart;
    const receiptTotal = lastOrder?.totalAmount ?? total;
    const receiptTax = lastOrder?.taxAmount ?? tax;
    const receiptDiscount = lastOrder?.discountAmount ?? discountAmount;
    const receiptTendered = parseFloat(lastOrder?.tenderedAmount || tenderedAmount) || 0;
    const receiptChange = lastOrder?.changeDue ?? changeDue;
    const receiptMethod = lastOrder?.paymentMethod || paymentMethod;
    const receiptName = lastOrder?.customer?.name || customerName;
    const receiptPhone = lastOrder?.customer?.phone || customerPhone;
    const receiptTable = lastOrder?.tableLabel;

    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-50 p-6 -m-4 sm:-m-6 lg:-m-8 relative">
        <ThermalReceipt 
          orderId={(lastOrder?.id || Math.random().toString(36).substr(2, 9)).toString().slice(0, 8).toUpperCase()}
          items={receiptCart}
          totalAmount={receiptTotal}
          taxAmount={receiptTax}
          discountAmount={receiptDiscount}
          tenderedAmount={receiptTendered}
          changeDue={receiptChange}
          paymentMethod={receiptMethod}
          customerName={receiptTable ? `Table ${receiptTable}` : receiptName}
          customerPhone={receiptPhone}
        />
        <div className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center text-center max-w-md w-full border border-slate-100 z-10 print:hidden">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Order Complete!</h1>
          <p className="text-slate-500 mb-2">The transaction was processed successfully.</p>
          {receiptTable && (
            <p className="text-sm font-bold text-brand-orange mb-6">
              Table {receiptTable} moved to cleaning
            </p>
          )}
          {!receiptTable && <div className="mb-6" />}
          
          <div className="w-full space-y-3">
            <Button 
              size="lg" 
              className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white"
              onClick={() => window.print()}
            >
              <Printer className="w-5 h-5 mr-2" />
              Print Receipt
            </Button>
            
            <Button 
              size="lg" 
              className="w-full h-14 text-lg font-bold bg-[#25D366] hover:bg-[#128C7E] text-white"
              onClick={handleWhatsAppReceipt}
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Share via WhatsApp
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="w-full h-14 text-lg font-bold border-2"
              onClick={handleNewOrder}
            >
              <Plus className="w-5 h-5 mr-2" />
              New Order
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[calc(100vh-64px)] w-full flex-col bg-slate-50 pb-[var(--checkout-mobile-footer-space)] shadow-inner -m-4 overflow-visible sm:-m-6 md:h-[calc(100vh-64px)] md:flex-row md:overflow-hidden md:bg-white md:pb-0 lg:-m-8"
      style={
        {
          '--checkout-mobile-footer-space':
            'calc(8.5rem + var(--cafepilots-visual-bottom, 0px) + env(safe-area-inset-bottom, 0px))',
        } as React.CSSProperties
      }
    >
      
      {/* LEFT COLUMN: Order Summary */}
      <div className="relative z-10 flex w-full flex-col border-b border-slate-200 bg-white md:h-full md:w-1/3 md:border-b-0 md:border-r md:bg-slate-50/50">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200/60 bg-transparent p-3 sm:p-4 md:gap-4 md:p-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/erp/pos')}
            className="h-9 w-9 rounded-full text-slate-500 transition-colors hover:bg-slate-200/50 hover:text-slate-900 md:h-10 md:w-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800 md:text-xl">Checkout</h1>
            {activeTableLabel && (
              <p className="text-xs font-bold text-brand-orange mt-0.5">Table {activeTableLabel}</p>
            )}
          </div>
        </div>

        {/* Total Summary Header */}
        <div className="flex w-full items-center justify-between gap-3 overflow-hidden px-3 py-3 text-left md:flex-col md:justify-center md:px-8 md:pb-6 md:pt-8 md:text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 md:mb-2 md:text-xs">Total Amount</span>
          <div className="max-w-full truncate px-1 text-2xl font-black tracking-tighter text-brand-orange drop-shadow-sm sm:text-3xl lg:text-5xl">
            {formatCurrency(total)}
          </div>
        </div>
        
        {/* Cart List */}
        <ScrollArea className="min-h-0 max-h-32 border-y border-slate-200/50 bg-white/60 px-3 md:max-h-none md:flex-1 md:px-8">
          <div className="space-y-1 py-2 md:py-4">
            {cart.map((item) => (
              <div key={item.id} className="group flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0 md:py-2.5">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-slate-700 transition-colors group-hover:text-brand-orange md:text-base">{item.name}</span>
                  <span className="text-xs font-medium text-slate-400">{item.quantity} x {formatCurrency(item.price)}</span>
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-900 md:text-base">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Tax & Discount Summary */}
        <div className="mt-auto space-y-1.5 bg-transparent p-3 text-xs md:space-y-2 md:p-6 md:px-8 md:text-sm">
          <div className="flex justify-between font-medium text-slate-500">
            <span>Subtotal</span>
            <span className="text-slate-700">{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between font-bold text-brand-orange">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium text-slate-500">
            <span>Tax (18%)</span>
            <span className="text-slate-700">{formatCurrency(tax)}</span>
          </div>
          <div className={cn("justify-between font-medium text-slate-500", serviceCharge > 0 ? "flex" : "hidden md:flex")}>
            <span>Service Charge</span>
            <span className="text-slate-700">{formatCurrency(serviceCharge)}</span>
          </div>
          <div className={cn("justify-between font-medium text-slate-500", roundOff > 0 ? "flex" : "hidden md:flex")}>
            <span>Round Off</span>
            <span className="text-slate-700">{formatCurrency(roundOff)}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 space-y-1">
            <div className="flex justify-between text-sm font-black text-slate-900">
              <span>Grand Total</span>
              <span className="text-brand-orange">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-emerald-600">
              <span>Paid</span>
              <span>{formatCurrency(paidAmount)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-amber-600">
              <span>Remaining</span>
              <span>{formatCurrency(remainingAmount)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Change</span>
              <span>{formatCurrency(changeDue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Payment Processing */}
      <div className="flex-1 flex flex-col bg-white p-3 pb-4 md:overflow-y-auto md:p-4 md:pb-6 lg:p-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 md:min-h-min lg:h-full lg:gap-5">
          <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-white shadow-sm md:p-4">
            <div className="grid grid-cols-[1fr_auto] items-start gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-brand-orange">
                  Payment workspace
                </p>
                <h2 className="mt-1 text-lg font-black tracking-tight md:text-xl">
                  {activeTableLabel ? `Table ${activeTableLabel}` : 'Counter order'}
                </h2>
                <p className="mt-1 hidden text-xs font-semibold text-slate-400 sm:block">
                  Use Settle from POS for fast payments. Use this page for customer, split, gateway, and receipt control.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Grand total
                </p>
                <p className="mt-1 text-2xl font-black text-brand-orange md:text-3xl">{formatCurrency(total)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px] md:mt-4 md:gap-2 md:text-xs">
              {[
                { label: 'Paid', value: formatCurrency(paidAmount), tone: 'text-emerald-300' },
                { label: 'Remaining', value: formatCurrency(remainingAmount), tone: 'text-amber-300' },
                { label: 'Change', value: formatCurrency(changeDue), tone: 'text-slate-200' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/8 px-2 py-2 md:px-3">
                  <p className="font-black uppercase tracking-wider text-slate-500">{item.label}</p>
                  <p className={`mt-1 truncate font-black ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Customer Details */}
          <div className="shrink-0 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 md:text-sm">Customer <span className="font-normal lowercase text-slate-400">(optional)</span></h2>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
              <div className="relative group">
                <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-brand-orange transition-colors" />
                <Input 
                  type="text" 
                  placeholder="Full Name" 
                  className="h-9 rounded-xl border-slate-200 bg-slate-50/50 pl-10 text-sm shadow-none focus-visible:ring-brand-orange md:h-10"
                  value={customerName}
                  onChange={(e) => setCustomerDetails(e.target.value, customerPhone)}
                />
              </div>
              <div className="relative group">
                <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-brand-orange transition-colors" />
                <Input 
                  type="tel" 
                  placeholder="Phone Number" 
                  className="h-9 rounded-xl border-slate-200 bg-slate-50/50 pl-10 text-sm shadow-none focus-visible:ring-brand-orange md:h-10"
                  value={customerPhone}
                  onChange={(e) => setCustomerDetails(customerName, e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 md:gap-2">
              {[
                { label: 'Loyalty', value: customerPhone ? 'Gold' : 'Walk-in' },
                { label: 'Points', value: customerPhone ? '240' : '0' },
                { label: 'Last Visit', value: customerPhone ? '12 days' : 'New' },
                { label: 'Credit', value: formatCurrency(0) },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5 md:px-3 md:py-2">
                  <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-400 md:text-[10px]">{item.label}</p>
                  <p className="truncate text-xs font-black text-slate-800 md:text-sm">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Promo Code */}
          <div className="shrink-0 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 md:text-sm">Promo Code</h2>
            <div className="flex gap-2 relative">
              <div className="relative flex-1 group">
                <Ticket className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-brand-orange transition-colors" />
                <Input 
                  type="text" 
                  placeholder="Enter Code" 
                  className={`h-9 rounded-xl border-slate-200 bg-slate-50/50 pl-10 text-sm uppercase shadow-none focus-visible:ring-brand-orange md:h-10 ${promoError ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    if (promoError) setPromoError('');
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                />
              </div>
              <Button 
                onClick={handleApplyPromo} 
                disabled={isApplyingPromo}
                className="h-9 rounded-xl bg-slate-900 px-4 font-bold text-white hover:bg-slate-800 md:h-10 md:px-6"
              >
                Apply
              </Button>
            </div>
            {promoError && <p className="text-xs font-bold text-red-500 mt-1 pl-1">{promoError}</p>}
            {discountAmount > 0 && !promoError && <p className="text-xs font-bold text-emerald-600 mt-1 pl-1">Voucher applied successfully!</p>}
          </div>

          {/* Payment Methods */}
          <div className="mt-1 shrink-0 space-y-2 md:mt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 md:text-sm">Payment Method</h2>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100/80 p-1 sm:grid-cols-3">
              {availablePaymentMethods.map((method) => {
                const Icon = method.icon;
                const isActive = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => handlePaymentMethodChange(method.id)}
                    className={cn(
                      "min-h-12 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg transition-all duration-300 md:min-h-14 md:gap-2",
                      isActive 
                        ? "bg-white text-brand-orange shadow-[0_2px_10px_rgba(0,0,0,0.06)] font-bold scale-[1.02]" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 font-medium"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-brand-orange" : "text-slate-400")} />
                      <span className="min-w-0 leading-tight">
                      <span className="block truncate text-xs md:text-sm">{method.label}</span>
                      <span className="hidden text-[10px] font-semibold text-slate-400 sm:block">{method.helper}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            {gatewaySettingsError && (
              <p className="text-[11px] font-semibold text-amber-600">
                Online gateways are hidden: {gatewaySettingsError}
              </p>
            )}
          </div>

          {/* Cash Input & Numpad */}
          {paymentMethod === 'cash' && (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
              
              {/* Tendered Amount Display & Quick Cash */}
              <div className="flex-1 flex flex-col gap-3 min-h-0 justify-center">
                
                {/* Custom Amount Display */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cash Tendered</span>
                  <div className={cn(
                    "text-4xl font-black tracking-tighter transition-colors",
                    tenderedAmount ? "text-slate-900" : "text-slate-300"
                  )}>
                    ₹{tenderedAmount || '0'}
                  </div>
                </div>

                {/* Quick Cash Buttons */}
                <div className="grid grid-cols-2 gap-2 shrink-0">
                  <Button variant="outline" className="h-10 text-sm font-bold border-slate-200 rounded-lg hover:bg-slate-50 hover:text-brand-orange transition-colors shadow-none" onClick={() => handleQuickAmount(total)}>Exact Amount</Button>
                  <Button variant="outline" className="h-10 text-sm font-bold border-slate-200 rounded-lg hover:bg-slate-50 hover:text-brand-orange transition-colors shadow-none" onClick={() => handleQuickAmount(100)}>₹100</Button>
                  <Button variant="outline" className="h-10 text-sm font-bold border-slate-200 rounded-lg hover:bg-slate-50 hover:text-brand-orange transition-colors shadow-none" onClick={() => handleQuickAmount(500)}>₹500</Button>
                  <Button variant="outline" className="h-10 text-sm font-bold border-slate-200 rounded-lg hover:bg-slate-50 hover:text-brand-orange transition-colors shadow-none" onClick={() => handleQuickAmount(2000)}>₹2000</Button>
                </div>

                {/* Change Due Highlight */}
                <div className={cn(
                  "mt-auto p-4 rounded-xl flex justify-between items-center shrink-0 transition-all duration-500",
                  changeDue > 0 
                    ? "bg-green-500 shadow-[0_8px_30px_rgba(34,197,94,0.3)]" 
                    : "bg-slate-100"
                )}>
                  <span className={cn("font-bold text-xs uppercase tracking-wider", changeDue > 0 ? "text-green-50" : "text-slate-400")}>Change Due</span>
                  <span className={cn("text-2xl font-black", changeDue > 0 ? "text-white drop-shadow-sm" : "text-slate-400")}>{formatCurrency(changeDue)}</span>
                </div>
              </div>

              {/* Minimalist Soft Numpad */}
              <div className="w-full lg:w-72 shrink-0 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-2 w-full">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleNumpadPress(key)}
                      className="h-12 lg:h-14 bg-slate-50/50 hover:bg-slate-100 text-slate-800 text-xl font-bold rounded-xl transition-all duration-200 active:scale-95 active:bg-slate-200 flex items-center justify-center"
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleNumpadPress('backspace')}
                    className="h-12 lg:h-14 bg-slate-50/50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all duration-200 active:scale-95 active:bg-slate-200 flex items-center justify-center"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadPress('clear')}
                    className="col-span-3 h-10 mt-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 active:bg-red-200 active:scale-[0.98] transition-all"
                  >
                    Clear Amount
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manual Card / UPI */}
          {paymentMethod !== 'cash' && !isOnlineGateway && (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-500 min-h-0 py-12">
              <div className="w-20 h-20 bg-white shadow-sm rounded-full flex items-center justify-center mb-6">
                {paymentMethod === 'card' ? <CreditCard className="w-8 h-8 text-brand-orange" /> : <Smartphone className="w-8 h-8 text-brand-orange" />}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Process {getPaymentMethodLabel(paymentMethod)}</h3>
              <p className="text-center text-slate-500 max-w-sm">
                Collect <span className="font-bold text-slate-900">{formatCurrency(total)}</span> with the selected method,
                then complete the order after terminal success.
              </p>
            </div>
          )}

          {/* Online Gateway */}
          {isOnlineGateway && (
            <div className="flex-1 flex flex-col justify-center bg-slate-50/70 rounded-3xl border border-slate-200 text-slate-600 min-h-0 py-8 px-5">
              <div className="max-w-xl mx-auto w-full space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {getPaymentMethodLabel(paymentMethod)} secure checkout
                    </h3>
                    <p className="text-sm text-slate-500">
                      Collect {formatCurrency(total)} through the outlet gateway.
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "rounded-2xl border p-4 text-sm font-semibold flex items-start gap-3",
                    gatewayState.status === 'verified'
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : gatewayState.status === 'error' || gatewayState.status === 'failed'
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-600"
                  )}
                >
                  {gatewayState.status === 'verified' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : gatewayState.status === 'error' || gatewayState.status === 'failed' ? (
                    <AlertCircle className="w-5 h-5 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 shrink-0 text-brand-orange" />
                  )}
                  <span>{gatewayState.message}</span>
                </div>

                {selectedGatewaySession && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="block font-bold text-slate-400 uppercase">Gateway order</span>
                      <span className="font-black text-slate-800 break-all">{selectedGatewaySession.providerOrderId}</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="block font-bold text-slate-400 uppercase">Mode</span>
                      <span className="font-black text-slate-800 uppercase">{selectedGatewaySession.gateway}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    onClick={handleStartGatewayPayment}
                    disabled={gatewayState.status === 'starting' || gatewayState.status === 'checking'}
                    className="h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold"
                  >
                    {gatewayState.status === 'starting' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Start payment
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCheckGatewayStatus}
                    disabled={!selectedGatewaySession || gatewayState.status === 'checking'}
                    className="h-12 rounded-xl border-slate-300 font-bold"
                  >
                    {gatewayState.status === 'checking' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Check status
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="shrink-0 mt-auto pt-2">
            <div className="mb-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { label: 'Hold Bill', icon: PauseCircle, action: handleHoldBill },
                { label: 'Resume', icon: RefreshCw, action: () => navigate('/erp/pos?view=held') },
                { label: 'Split Bill', icon: Plus, action: () => setCheckoutNotice('Split bill marked for cashier review.') },
                { label: 'Void Bill', icon: Delete, action: () => setCheckoutNotice('Void bill requires manager approval.') },
              ].map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 text-xs font-black"
                  onClick={item.action}
                >
                  <item.icon className="mr-1.5 h-3.5 w-3.5" />
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="mb-3 grid grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                { label: 'Print', icon: Printer, action: () => window.print() },
                { label: 'WhatsApp', icon: MessageSquare, action: handleWhatsAppReceipt },
                { label: 'Email', icon: User, action: () => setCheckoutNotice('Email receipt queued after customer email is captured.') },
                { label: 'SMS', icon: Phone, action: () => setCheckoutNotice('SMS receipt queued after phone number is captured.') },
                { label: 'No Receipt', icon: CheckCircle2, action: () => setCheckoutNotice('Receipt skipped for this bill.') },
              ].map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  variant="ghost"
                  className="h-9 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  onClick={item.action}
                >
                  <item.icon className="mr-1 h-3.5 w-3.5" />
                  {item.label}
                </Button>
              ))}
            </div>
            {checkoutNotice && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                {checkoutNotice}
              </div>
            )}
            <Button 
              size="lg" 
              className={cn(
                "hidden md:flex w-full h-14 text-lg font-black rounded-xl transition-all duration-300",
                isReady 
                  ? "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.16)] hover:-translate-y-1" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-70 shadow-none"
              )}
              disabled={!isReady || isCompleting}
              onClick={handleCompleteOrder}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Completing
                </>
              ) : (
                <>
                  Complete Order
                  <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
                </>
              )}
            </Button>
          </div>

        </div>
      </div>

      <div
        className="fixed inset-x-0 z-[70] border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur md:hidden"
        style={{
          bottom:
            'calc(var(--cafepilots-visual-bottom, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Grand total</p>
            <p className="truncate text-xl font-black text-brand-orange">{formatCurrency(total)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {remainingAmount > 0 ? 'Remaining' : 'Change'}
            </p>
            <p className={cn('text-sm font-black', remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600')}>
              {formatCurrency(remainingAmount > 0 ? remainingAmount : changeDue)}
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className={cn(
            'h-12 w-full rounded-xl text-base font-black transition-all duration-300',
            isReady
              ? 'bg-slate-900 text-white shadow-[0_8px_26px_rgba(0,0,0,0.16)] hover:bg-slate-800'
              : 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-70 shadow-none'
          )}
          disabled={!isReady || isCompleting}
          onClick={handleCompleteOrder}
        >
          {isCompleting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Completing
            </>
          ) : (
            <>
              Complete Order
              <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
