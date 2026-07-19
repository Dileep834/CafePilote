import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOSStore, type OnlinePaymentMethod, type PaymentMethod } from '../store/usePOSStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Banknote, CreditCard, Smartphone, Delete, CheckCircle2, User, Phone, Printer, Plus, MessageSquare, Ticket, Loader2, ExternalLink, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
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
  { id: 'paytm', icon: Smartphone, label: 'Paytm', helper: 'JS Checkout' },
  { id: 'phonepe', icon: Smartphone, label: 'PhonePe', helper: 'Standard Checkout' },
  { id: 'amazonpay', icon: CreditCard, label: 'Amazon Pay', helper: 'Checkout v2' },
];

function getPaymentMethodLabel(method: PaymentMethod) {
  return paymentMethods.find((item) => item.id === method)?.label || method;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const activeOutletId = useTenantStore((state) => state.activeOutletId);
  const outletId = activeOutletId || getTenantOutletId(user);
  const [isSuccess, setIsSuccess] = useState(false);
  
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
    if (!isReady) return;
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

    await processCheckout(paymentReference);
    setIsSuccess(true);
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
  
  // Is the order ready to complete?
  const isReady =
    paymentMethod === 'cash'
      ? tenderedNumeric >= total
      : isOnlineGateway
        ? gatewayState.status === 'verified' && selectedGatewaySession !== null
        : true;

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
    <div className="flex min-h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] w-full bg-white flex-col md:flex-row -m-4 sm:-m-6 lg:-m-8 shadow-inner overflow-hidden">
      
      {/* LEFT COLUMN: Order Summary */}
      <div className="w-full md:w-1/3 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col md:h-full z-10 relative">
        
        {/* Header */}
        <div className="p-6 flex items-center gap-4 bg-transparent border-b border-slate-200/60">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/erp/pos')}
            className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 rounded-full h-10 w-10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Checkout</h1>
            {activeTableLabel && (
              <p className="text-xs font-bold text-brand-orange mt-0.5">Table {activeTableLabel}</p>
            )}
          </div>
        </div>

        {/* Total Summary Header */}
        <div className="px-4 xl:px-8 pt-8 pb-6 flex flex-col items-center justify-center text-center w-full overflow-hidden">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Amount</span>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-orange tracking-tighter drop-shadow-sm truncate max-w-full px-2">
            {formatCurrency(total)}
          </div>
        </div>
        
        {/* Cart List */}
        <ScrollArea className="flex-1 min-h-0 px-8 max-h-[40vh] md:max-h-none border-t border-b border-slate-200/50 bg-white/40">
          <div className="space-y-1 py-4">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 group">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-700 group-hover:text-brand-orange transition-colors">{item.name}</span>
                  <span className="text-xs font-medium text-slate-400">{item.quantity} x {formatCurrency(item.price)}</span>
                </div>
                <span className="font-bold text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Tax & Discount Summary */}
        <div className="p-6 px-8 bg-transparent space-y-2 mt-auto">
          <div className="flex justify-between text-sm font-medium text-slate-500">
            <span>Subtotal</span>
            <span className="text-slate-700">{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm font-bold text-brand-orange">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-medium text-slate-500">
            <span>Tax (18%)</span>
            <span className="text-slate-700">{formatCurrency(tax)}</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Payment Processing */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto p-4 lg:p-6 pb-24 md:pb-6">
        <div className="max-w-2xl w-full mx-auto flex flex-col gap-4 lg:gap-5 min-h-min lg:h-full">
          
          {/* Customer Details */}
          <div className="shrink-0 space-y-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Customer <span className="font-normal text-slate-400 lowercase">(optional)</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative group">
                <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-brand-orange transition-colors" />
                <Input 
                  type="text" 
                  placeholder="Full Name" 
                  className="pl-10 h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-brand-orange shadow-none rounded-xl"
                  value={customerName}
                  onChange={(e) => setCustomerDetails(e.target.value, customerPhone)}
                />
              </div>
              <div className="relative group">
                <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-brand-orange transition-colors" />
                <Input 
                  type="tel" 
                  placeholder="Phone Number" 
                  className="pl-10 h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-brand-orange shadow-none rounded-xl"
                  value={customerPhone}
                  onChange={(e) => setCustomerDetails(customerName, e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Promo Code */}
          <div className="shrink-0 space-y-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Promo Code</h2>
            <div className="flex gap-2 relative">
              <div className="relative flex-1 group">
                <Ticket className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-brand-orange transition-colors" />
                <Input 
                  type="text" 
                  placeholder="Enter Code" 
                  className={`pl-10 h-10 bg-slate-50/50 uppercase border-slate-200 focus-visible:ring-brand-orange shadow-none rounded-xl ${promoError ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
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
                className="bg-slate-900 text-white hover:bg-slate-800 h-10 rounded-xl px-6 font-bold"
              >
                Apply
              </Button>
            </div>
            {promoError && <p className="text-xs font-bold text-red-500 mt-1 pl-1">{promoError}</p>}
            {discountAmount > 0 && !promoError && <p className="text-xs font-bold text-emerald-600 mt-1 pl-1">Voucher applied successfully!</p>}
          </div>

          {/* Payment Methods */}
          <div className="shrink-0 space-y-2 mt-2">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Payment Method</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-slate-100/80 rounded-xl">
              {availablePaymentMethods.map((method) => {
                const Icon = method.icon;
                const isActive = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => handlePaymentMethodChange(method.id)}
                    className={cn(
                      "min-h-14 flex items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all duration-300",
                      isActive 
                        ? "bg-white text-brand-orange shadow-[0_2px_10px_rgba(0,0,0,0.06)] font-bold scale-[1.02]" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 font-medium"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-brand-orange" : "text-slate-400")} />
                    <span className="leading-tight">
                      <span className="block text-sm">{method.label}</span>
                      <span className="block text-[10px] font-semibold text-slate-400">{method.helper}</span>
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
              <h3 className="text-xl font-bold text-slate-800 mb-2">Process {paymentMethod.toUpperCase()} Payment</h3>
              <p className="text-center text-slate-500 max-w-sm">Please use your external terminal to collect <span className="font-bold text-slate-900">{formatCurrency(total)}</span>. Once successful, click below to complete the order.</p>
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
            <Button 
              size="lg" 
              className={cn(
                "w-full h-14 text-lg font-black rounded-xl transition-all duration-300",
                isReady 
                  ? "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.16)] hover:-translate-y-1" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-70 shadow-none"
              )}
              disabled={!isReady}
              onClick={handleCompleteOrder}
            >
              Complete Order
              <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
