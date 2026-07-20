import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePOSStore, type OnlinePaymentMethod, type PaymentMethod } from '../store/usePOSStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Smartphone,
  Delete,
  CheckCircle2,
  User,
  Phone,
  Printer,
  Plus,
  MessageSquare,
  Ticket,
  Loader2,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Wallet,
  Gift,
  ReceiptText,
  PauseCircle,
  Mail,
  MessageCircle,
  Ban,
  Check,
  QrCode,
  Split,
  Building2,
  Eye,
} from 'lucide-react';
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
import { supabase } from '@/lib/supabase';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { ManagerPinDialog } from '@/modules/ops/components/ManagerPinDialog';
import {
  createIdempotencyKey,
  loadOpsSettings,
  needsManagerPinForDiscount,
  validateCashTender,
  validateSplitPayment,
} from '@/modules/ops';

type GatewayUiState =
  | { status: 'idle'; message: string; session: null; verification: null }
  | { status: 'starting'; message: string; session: null; verification: null }
  | { status: 'started'; message: string; session: GatewayPaymentSession; verification: null }
  | { status: 'checking'; message: string; session: GatewayPaymentSession; verification: GatewayPaymentStatus | null }
  | { status: 'verified'; message: string; session: GatewayPaymentSession; verification: GatewayPaymentStatus }
  | { status: 'failed'; message: string; session: GatewayPaymentSession | null; verification: GatewayPaymentStatus | null }
  | { status: 'error'; message: string; session: GatewayPaymentSession | null; verification: GatewayPaymentStatus | null };

type SplitLine = { id: string; method: Exclude<PaymentMethod, 'split'>; amount: string };
type CardMode = 'tap' | 'swipe' | 'insert' | 'manual';
type UpiMode = 'dynamic' | 'static';
type ReceiptPref = 'print' | 'whatsapp' | 'email' | 'sms' | 'none';

type CustomerProfile = {
  email: string;
  gstin: string;
  company: string;
  loyaltyTier: string;
  rewardPoints: number;
  walletBalance: number;
  lastVisit: string;
};

const paymentMethods: Array<{
  id: PaymentMethod;
  icon: typeof Banknote;
  label: string;
  helper: string;
}> = [
  { id: 'cash', icon: Banknote, label: 'Cash', helper: 'Counter cash' },
  { id: 'card', icon: CreditCard, label: 'Card', helper: 'POS terminal' },
  { id: 'upi', icon: Smartphone, label: 'UPI', helper: 'QR / apps' },
  { id: 'wallet', icon: Wallet, label: 'Wallet', helper: 'Digital wallet' },
  { id: 'gift_card', icon: Gift, label: 'Gift Card', helper: 'Voucher' },
  { id: 'store_credit', icon: Wallet, label: 'Store Credit', helper: 'Balance' },
  { id: 'credit', icon: ReceiptText, label: 'Credit', helper: 'Pay later' },
  { id: 'split', icon: Split, label: 'Split', helper: 'Multi-pay' },
  { id: 'paytm', icon: Smartphone, label: 'Paytm', helper: 'Gateway' },
  { id: 'phonepe', icon: Smartphone, label: 'PhonePe', helper: 'Gateway' },
  { id: 'amazonpay', icon: CreditCard, label: 'Amazon Pay', helper: 'Gateway' },
];

const QUICK_DENOMS = [50, 100, 200, 500, 1000, 2000];

function getPaymentMethodLabel(method: PaymentMethod) {
  return paymentMethods.find((item) => item.id === method)?.label || method;
}

function recommendedDenom(total: number) {
  const due = Math.ceil(total);
  return QUICK_DENOMS.find((d) => d >= due) || QUICK_DENOMS[QUICK_DENOMS.length - 1];
}

function roundOffAmount(value: number) {
  const rounded = Math.round(value);
  return Number((rounded - value).toFixed(2));
}

function loyaltyTierFromPoints(points: number) {
  if (points >= 1000) return 'Platinum';
  if (points >= 400) return 'Gold';
  if (points >= 100) return 'Silver';
  return 'Member';
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
  const [checkoutError, setCheckoutError] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const idempotencyRef = useRef<string>('');
  const [receiptPref, setReceiptPref] = useState<ReceiptPref>('print');
  const [receiptStatus, setReceiptStatus] = useState('Not sent');

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
    serviceCharge,
    setServiceCharge,
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

  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [lookingUp, setLookingUp] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>({
    email: '',
    gstin: '',
    company: '',
    loyaltyTier: 'Walk-in',
    rewardPoints: 0,
    walletBalance: 0,
    lastVisit: 'New',
  });

  const [cardMode, setCardMode] = useState<CardMode>('tap');
  const [cardTerminal, setCardTerminal] = useState('');
  const [cardApproval, setCardApproval] = useState('');
  const [cardReference, setCardReference] = useState('');

  const [upiMode, setUpiMode] = useState<UpiMode>('dynamic');
  const [upiReceived, setUpiReceived] = useState(false);

  const [splits, setSplits] = useState<SplitLine[]>([
    { id: crypto.randomUUID(), method: 'cash', amount: '' },
  ]);

  const orderNumber = useMemo(
    () => `CP-${Date.now().toString(36).slice(-6).toUpperCase()}`,
    []
  );

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount =
    discountType === 'percentage' ? (subtotal * discountValue) / 100 : discountValue;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = discountedSubtotal * taxRate;
  const charges = serviceCharge || 0;
  const preRound = discountedSubtotal + tax + charges;
  const roundOff = roundOffAmount(preRound);
  const total = Number((preRound + roundOff).toFixed(2));

  const availablePaymentMethods = useMemo(
    () =>
      paymentMethods.filter((method) => {
        if (!isOnlinePaymentMethod(method.id)) return true;
        return enabledGateways.includes(method.id);
      }),
    [enabledGateways]
  );

  const splitPaid = useMemo(
    () => splits.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0),
    [splits]
  );

  useEffect(() => {
    const quickSettled = new URLSearchParams(location.search).get('settled') === 'quick';
    if (quickSettled && lastOrder) setIsSuccess(true);
    if (new URLSearchParams(location.search).get('split') === '1') {
      setPaymentMethod('split');
    }
  }, [lastOrder, location.search, setPaymentMethod]);

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

  const lookupCustomer = useCallback(
    async (phone: string) => {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 10) {
        setProfile({
          email: '',
          gstin: '',
          company: '',
          loyaltyTier: 'Walk-in',
          rewardPoints: 0,
          walletBalance: 0,
          lastVisit: 'New',
        });
        return;
      }
      setLookingUp(true);
      try {
        const companyId = getScopedCompanyId(user);
        let query = supabase
          .from('customers')
          .select('*')
          .ilike('phone', `%${digits.slice(-10)}%`)
          .limit(1);
        if (companyId) query = query.eq('company_id', companyId);
        const { data } = await query;
        const row = data?.[0] as Record<string, unknown> | undefined;
        if (row) {
          const name = String(row.name || '');
          const email = String(row.email || '');
          const points = Number(row.loyalty_points || 0);
          setCustomerDetails(name || customerName, phone);
          setCustomerEmail(email);
          setCustomerGstin(String(row.gstin || row.gst_number || ''));
          setCustomerCompany(String(row.company_name || row.company || ''));
          setProfile({
            email,
            gstin: String(row.gstin || row.gst_number || ''),
            company: String(row.company_name || row.company || ''),
            loyaltyTier: loyaltyTierFromPoints(points),
            rewardPoints: points,
            walletBalance: Number(row.wallet_balance || row.store_credit || 0),
            lastVisit: row.updated_at
              ? new Date(String(row.updated_at)).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                })
              : 'Returning',
          });
          setCheckoutNotice(`Customer found: ${name || digits}`);
        } else {
          setProfile((p) => ({
            ...p,
            loyaltyTier: 'Walk-in',
            rewardPoints: 0,
            walletBalance: 0,
            lastVisit: 'New',
          }));
        }
      } catch {
        // Silent — lookup is best-effort
      } finally {
        setLookingUp(false);
      }
    },
    [customerName, setCustomerDetails, user]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void lookupCustomer(customerPhone);
    }, 450);
    return () => window.clearTimeout(t);
  }, [customerPhone, lookupCustomer]);

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
      if (val === '.' && tenderedAmount.includes('.')) return;
      if (tenderedAmount === '0' && val !== '.') {
        setTenderedAmount(val);
        return;
      }
      setTenderedAmount(tenderedAmount + val);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setTenderedAmount(amount.toFixed(amount % 1 === 0 ? 0 : 2));
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setUpiReceived(false);
    setGatewayState({
      status: 'idle',
      message: isOnlinePaymentMethod(method)
        ? `Start ${getPaymentMethodLabel(method)} payment for this order.`
        : 'Choose an online gateway to start a secure payment.',
      session: null,
      verification: null,
    });
    if (method === 'split' && splits.length === 1 && !splits[0].amount) {
      setSplits([{ id: crypto.randomUUID(), method: 'cash', amount: total.toFixed(2) }]);
    }
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
        customer: { name: customerName, phone: customerPhone },
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

  const tenderedNumeric = parseFloat(tenderedAmount) || 0;
  const changeDue =
    paymentMethod === 'cash'
      ? Math.max(0, tenderedNumeric - total)
      : paymentMethod === 'split'
        ? Math.max(0, splitPaid - total)
        : 0;
  const isOnlineGateway = isOnlinePaymentMethod(paymentMethod);
  const selectedGatewaySession =
    gatewayState.session?.gateway === paymentMethod ? gatewayState.session : null;

  const paidAmount =
    paymentMethod === 'cash'
      ? Math.min(tenderedNumeric, total)
      : paymentMethod === 'split'
        ? Math.min(splitPaid, total)
        : paymentMethod === 'upi'
          ? upiReceived
            ? total
            : 0
          : isOnlineGateway
            ? gatewayState.status === 'verified'
              ? total
              : 0
            : total;

  const remainingAmount = Math.max(0, Number((total - paidAmount).toFixed(2)));
  const recommended = recommendedDenom(total);

  const isReady =
    paymentMethod === 'cash'
      ? tenderedNumeric >= total
      : paymentMethod === 'split'
        ? splitPaid >= total - 0.01
        : paymentMethod === 'upi'
          ? upiReceived
          : isOnlineGateway
            ? gatewayState.status === 'verified' && selectedGatewaySession !== null
            : true;

  const handleCompleteOrder = async (managerApprovalId?: string | null) => {
    if (!isReady || isCompleting) return;
    setCheckoutError('');

    if (paymentMethod === 'cash') {
      const v = validateCashTender(total, tenderedNumeric);
      if (!v.ok) {
        setCheckoutError(v.message);
        return;
      }
    }
    if (paymentMethod === 'split') {
      const lines = splits.map((s) => ({ method: s.method, amount: Number(s.amount) || 0 }));
      const v = validateSplitPayment(total, lines);
      if (!v.ok) {
        setCheckoutError(v.message);
        return;
      }
    }

    // High discount → manager PIN
    const discountPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
    const settings = await loadOpsSettings(outletId);
    if (
      !managerApprovalId &&
      needsManagerPinForDiscount(discountPct, settings.discountPinThresholdPct)
    ) {
      setPinOpen(true);
      return;
    }

    if (!idempotencyRef.current) {
      idempotencyRef.current = createIdempotencyKey([
        outletId || 'x',
        activeTableLabel || 'counter',
        total.toFixed(2),
        paymentMethod,
        cart.map((c) => `${c.productId}:${c.quantity}`).join('|'),
        Date.now(),
      ]);
    }

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
      if (paymentMethod === 'cash' || paymentMethod === 'split') {
        setTenderedAmount(String(Math.max(tenderedNumeric, splitPaid, total)));
      }
      await processCheckout(paymentReference, {
        idempotencyKey: idempotencyRef.current,
        managerApprovalId: managerApprovalId || pendingApprovalId,
        splitLines:
          paymentMethod === 'split'
            ? splits.map((s) => ({ method: s.method, amount: Number(s.amount) || 0 }))
            : undefined,
      });
      idempotencyRef.current = '';
      setPendingApprovalId(null);
      const statusMap: Record<ReceiptPref, string> = {
        print: 'Printed',
        whatsapp: 'Sent on WhatsApp',
        email: customerEmail ? `Emailed to ${customerEmail}` : 'Email queued',
        sms: customerPhone ? `SMS to ${customerPhone}` : 'SMS queued',
        none: 'No receipt',
      };
      setReceiptStatus(statusMap[receiptPref]);
      if (receiptPref === 'print') window.setTimeout(() => window.print(), 400);
      if (receiptPref === 'whatsapp') window.setTimeout(() => handleWhatsAppReceipt(), 400);
      setIsSuccess(true);
    } catch (err) {
      setCheckoutError((err as Error)?.message || 'Checkout failed. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNewOrder = () => {
    setIsSuccess(false);
    navigate('/erp/pos');
  };

  const handleHoldBill = async () => {
    await holdCurrentOrder(activeTableLabel ? `Held table ${activeTableLabel}` : 'Held from checkout');
    navigate('/erp/pos?view=held');
  };

  const settings = useSettingsStore();

  const handleWhatsAppReceipt = () => {
    let text = `☕ *${settings.cafeName}*\n`;
    text += `--------------------------\n`;
    text += `Order: ${orderNumber}\n`;
    text += `Order Date: ${new Date().toLocaleDateString()}\n\n`;
    cart.forEach((item) => {
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
      <div className="relative -m-4 flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 sm:-m-6 lg:-m-8">
        <ThermalReceipt
          orderId={(lastOrder?.id || orderNumber).toString().slice(0, 8).toUpperCase()}
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
        <div className="z-10 flex w-full max-w-md animate-in fade-in zoom-in-95 flex-col items-center rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-xl duration-300 print:hidden">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-inner">
            <CheckCircle2 className="h-11 w-11 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Payment Successful</h1>
          <p className="mt-1 text-3xl font-black text-brand-orange">{formatCurrency(receiptTotal)}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            via {getPaymentMethodLabel(receiptMethod as PaymentMethod)}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Receipt · {receiptStatus}
          </p>
          {receiptTable && (
            <p className="mt-3 text-sm font-bold text-brand-orange">
              Table {receiptTable} moved to cleaning
            </p>
          )}

          <div className="mt-8 grid w-full grid-cols-2 gap-2">
            <Button
              size="lg"
              className="h-12 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800"
              onClick={() => window.print()}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Receipt
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-xl font-bold"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Reprint
            </Button>
            <Button
              size="lg"
              className="h-12 rounded-xl bg-[#25D366] font-bold text-white hover:bg-[#128C7E]"
              onClick={handleWhatsAppReceipt}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              size="lg"
              className="h-12 rounded-xl bg-brand-orange font-bold text-white hover:bg-[#e55f00]"
              onClick={handleNewOrder}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const summaryRows = [
    { label: 'Table', value: activeTableLabel || 'Counter' },
    { label: 'Order #', value: orderNumber },
    { label: 'Cashier', value: user?.name?.split(' ')[0] || 'Staff' },
    { label: 'Guests', value: String(guestCount) },
    { label: 'Subtotal', value: formatCurrency(subtotal) },
    { label: 'Discount', value: discountAmount > 0 ? `−${formatCurrency(discountAmount)}` : '—' },
    { label: 'Tax', value: formatCurrency(tax) },
    { label: 'Service', value: formatCurrency(charges) },
    { label: 'Round off', value: roundOff === 0 ? '—' : formatCurrency(roundOff) },
  ];

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
      {/* LEFT: compressed order summary */}
      <div className="relative z-10 flex w-full flex-col border-b border-slate-200 bg-white md:h-full md:w-[30%] md:max-w-sm md:border-b-0 md:border-r md:bg-slate-50/50">
        <div className="flex items-center gap-3 border-b border-slate-200/60 p-3 sm:p-4 md:p-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/erp/pos')}
            className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Checkout</h1>
            {activeTableLabel && (
              <p className="text-xs font-bold text-brand-orange">Table {activeTableLabel}</p>
            )}
          </div>
        </div>

        <ScrollArea className="min-h-0 max-h-36 flex-1 border-b border-slate-100 bg-white/70 px-3 md:max-h-none md:px-5">
          <div className="space-y-0.5 py-2">
            <div className="mb-1.5 grid grid-cols-[1fr_36px_64px_72px] gap-1 px-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Total</span>
            </div>
            {cart.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_36px_64px_72px] items-center gap-1 rounded-lg px-1 py-1.5 text-xs hover:bg-white"
              >
                <span className="truncate font-semibold text-slate-700">{item.name}</span>
                <span className="text-center font-bold tabular-nums text-slate-500">{item.quantity}</span>
                <span className="text-right tabular-nums text-slate-400">
                  {formatCurrency(item.price)}
                </span>
                <span className="text-right font-bold tabular-nums text-slate-900">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-auto space-y-1 bg-transparent p-3 text-xs md:p-5">
          {[
            ['Subtotal', formatCurrency(subtotal)],
            ['Discount', discountAmount > 0 ? `−${formatCurrency(discountAmount)}` : '—'],
            [`Tax (${Math.round(taxRate * 100)}%)`, formatCurrency(tax)],
            ['Service Charge', formatCurrency(charges)],
            ['Round Off', roundOff === 0 ? '—' : formatCurrency(roundOff)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between font-medium text-slate-500">
              <span>{label}</span>
              <span className="text-slate-700">{value}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
            <span>Grand Total</span>
            <span className="text-brand-orange">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* RIGHT: payment workspace */}
      <div className="flex flex-1 flex-col bg-white p-3 pb-4 md:overflow-y-auto md:p-4 lg:p-5">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 lg:gap-4">
          {/* Rich payment header */}
          <div className="shrink-0 animate-in fade-in slide-in-from-top-2 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-white shadow-sm duration-300 md:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-brand-orange">
                  Payment summary
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight">
                  {activeTableLabel ? `Table ${activeTableLabel}` : 'Counter order'}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Grand total
                </p>
                <p className="text-3xl font-black text-brand-orange">{formatCurrency(total)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {summaryRows.map((row) => (
                <div key={row.label} className="rounded-xl bg-white/8 px-2 py-2">
                  <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500">
                    {row.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-black text-slate-100">{row.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[
                { label: 'Paid', value: formatCurrency(paidAmount), tone: 'text-emerald-300' },
                { label: 'Remaining', value: formatCurrency(remainingAmount), tone: 'text-amber-300' },
                { label: 'Change', value: formatCurrency(changeDue), tone: 'text-slate-200' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/10 px-2.5 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <p className={cn('mt-1 text-base font-black tabular-nums md:text-lg', item.tone)}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer */}
          <div className="shrink-0 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Customer</h2>
              {lookingUp && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Looking up…
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="tel"
                  placeholder="Phone (lookup)"
                  className="h-9 rounded-xl border-slate-200 bg-white pl-10 text-sm"
                  value={customerPhone}
                  onChange={(e) => setCustomerDetails(customerName, e.target.value)}
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Name"
                  className="h-9 rounded-xl border-slate-200 bg-white pl-10 text-sm"
                  value={customerName}
                  onChange={(e) => setCustomerDetails(e.target.value, customerPhone)}
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="Email"
                  className="h-9 rounded-xl border-slate-200 bg-white pl-10 text-sm"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <ReceiptText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="GSTIN"
                  className="h-9 rounded-xl border-slate-200 bg-white pl-10 text-sm uppercase"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                />
              </div>
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Company"
                  className="h-9 rounded-xl border-slate-200 bg-white pl-10 text-sm"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                />
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  placeholder="Guests"
                  className="h-9 rounded-xl border-slate-200 bg-white text-sm"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {[
                { label: 'Loyalty Tier', value: profile.loyaltyTier },
                { label: 'Reward Points', value: String(profile.rewardPoints) },
                { label: 'Wallet', value: formatCurrency(profile.walletBalance) },
                { label: 'Last Visit', value: profile.lastVisit },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white bg-white px-2.5 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    {item.label}
                  </p>
                  <p className="truncate text-sm font-black text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Promo */}
          <div className="flex shrink-0 gap-2">
            <div className="relative flex-1">
              <Ticket className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Promo code"
                className={cn(
                  'h-9 rounded-xl border-slate-200 bg-slate-50/50 pl-10 text-sm uppercase',
                  promoError && 'border-red-300'
                )}
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  if (promoError) setPromoError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && void handleApplyPromo()}
              />
            </div>
            <Input
              type="number"
              min={0}
              placeholder="Service ₹"
              className="h-9 w-28 rounded-xl border-slate-200 bg-slate-50/50 text-sm"
              value={serviceCharge || ''}
              onChange={(e) => setServiceCharge(Math.max(0, Number(e.target.value) || 0))}
            />
            <Button
              onClick={() => void handleApplyPromo()}
              disabled={isApplyingPromo}
              className="h-9 rounded-xl bg-slate-900 px-4 font-bold text-white hover:bg-slate-800"
            >
              Apply
            </Button>
          </div>
          {promoError && <p className="-mt-2 text-xs font-bold text-red-500">{promoError}</p>}

          {/* Payment method cards */}
          <div className="shrink-0 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Payment method
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {availablePaymentMethods.map((method) => {
                const Icon = method.icon;
                const isActive = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handlePaymentMethodChange(method.id)}
                    className={cn(
                      'relative flex min-h-[4.25rem] flex-col items-start gap-1 rounded-2xl border-2 px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.98]',
                      isActive
                        ? 'border-brand-orange bg-orange-50 shadow-[0_8px_24px_rgba(255,106,0,0.18)]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    )}
                  >
                    {isActive && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isActive ? 'text-brand-orange' : 'text-slate-400'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isActive ? 'text-brand-navy' : 'text-slate-700'
                      )}
                    >
                      {method.label}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{method.helper}</span>
                  </button>
                );
              })}
            </div>
            {gatewaySettingsError && (
              <p className="text-[11px] font-semibold text-amber-600">
                Online gateways are hidden: {gatewaySettingsError}
              </p>
            )}
          </div>

          {/* Cash */}
          {paymentMethod === 'cash' && (
            <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
              <div className="flex flex-1 flex-col gap-3">
                <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Cash tendered
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="mt-1 w-full bg-transparent text-center text-4xl font-black tracking-tighter text-slate-900 outline-none placeholder:text-slate-300"
                    value={tenderedAmount}
                    placeholder="0"
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, '');
                      if ((v.match(/\./g) || []).length > 1) return;
                      setTenderedAmount(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') return;
                      if (e.key === 'Enter' && isReady) void handleCompleteOrder();
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl border-brand-orange/40 bg-orange-50 text-xs font-black text-brand-orange hover:bg-orange-100"
                    onClick={() => handleQuickAmount(total)}
                  >
                    Exact
                  </Button>
                  {QUICK_DENOMS.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      className={cn(
                        'h-10 rounded-xl text-xs font-bold transition-all',
                        amount === recommended
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                          : 'border-slate-200 hover:border-brand-orange/40 hover:text-brand-orange'
                      )}
                      onClick={() => handleQuickAmount(amount)}
                    >
                      ₹{amount}
                    </Button>
                  ))}
                </div>

                <div
                  className={cn(
                    'mt-auto flex items-center justify-between rounded-2xl p-4 transition-all duration-300',
                    changeDue > 0
                      ? 'bg-emerald-500 shadow-[0_8px_30px_rgba(34,197,94,0.28)]'
                      : 'bg-slate-100'
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      changeDue > 0 ? 'text-emerald-50' : 'text-slate-400'
                    )}
                  >
                    Change due
                  </span>
                  <span
                    className={cn(
                      'text-2xl font-black',
                      changeDue > 0 ? 'text-white' : 'text-slate-400'
                    )}
                  >
                    {formatCurrency(changeDue)}
                  </span>
                </div>
              </div>

              <div className="w-full shrink-0 lg:w-72">
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleNumpadPress(key)}
                      className="flex h-12 items-center justify-center rounded-xl bg-slate-50 text-xl font-bold text-slate-800 transition-all duration-150 active:scale-95 active:bg-slate-200 hover:bg-slate-100 lg:h-14"
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleNumpadPress('backspace')}
                    className="flex h-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition-all active:scale-95 hover:bg-slate-100 lg:h-14"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadPress('clear')}
                    className="col-span-3 mt-1 h-10 rounded-xl bg-red-50 text-xs font-bold text-red-600 transition hover:bg-red-100 active:scale-[0.98]"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Card */}
          {paymentMethod === 'card' && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <CreditCard className="h-6 w-6 text-brand-orange" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Card payment</h3>
                  <p className="text-sm text-slate-500">Collect {formatCurrency(total)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ['tap', 'Tap'],
                    ['swipe', 'Swipe'],
                    ['insert', 'Insert'],
                    ['manual', 'Manual'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCardMode(id)}
                    className={cn(
                      'h-11 rounded-xl border-2 text-sm font-bold transition',
                      cardMode === id
                        ? 'border-brand-orange bg-orange-50 text-brand-orange'
                        : 'border-slate-200 bg-white text-slate-600'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Terminal"
                  className="h-9 rounded-xl"
                  value={cardTerminal}
                  onChange={(e) => setCardTerminal(e.target.value)}
                />
                <Input
                  placeholder="Approval code"
                  className="h-9 rounded-xl"
                  value={cardApproval}
                  onChange={(e) => setCardApproval(e.target.value)}
                />
                <Input
                  placeholder="Reference #"
                  className="h-9 rounded-xl"
                  value={cardReference}
                  onChange={(e) => setCardReference(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* UPI */}
          {paymentMethod === 'upi' && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <QrCode className="h-6 w-6 text-brand-orange" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">UPI payment</h3>
                    <p className="text-sm text-slate-500">Collect {formatCurrency(total)}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(
                    [
                      ['dynamic', 'Dynamic QR'],
                      ['static', 'Static QR'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setUpiMode(id)}
                      className={cn(
                        'h-9 rounded-xl border px-3 text-xs font-bold',
                        upiMode === id
                          ? 'border-brand-orange bg-orange-50 text-brand-orange'
                          : 'border-slate-200 bg-white text-slate-600'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mx-auto flex aspect-square w-44 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white">
                <div className="text-center">
                  <QrCode className="mx-auto h-16 w-16 text-slate-300" />
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {upiMode === 'dynamic' ? 'Dynamic QR ready' : 'Show static QR'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {['PhonePe', 'Google Pay', 'Paytm', 'BHIM'].map((app) => (
                  <span
                    key={app}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500"
                  >
                    {app}
                  </span>
                ))}
              </div>

              <Button
                type="button"
                className={cn(
                  'h-12 w-full rounded-xl font-bold transition-all',
                  upiReceived
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                )}
                onClick={() => setUpiReceived(true)}
              >
                {upiReceived ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Payment received
                  </>
                ) : (
                  'Mark payment received'
                )}
              </Button>
            </div>
          )}

          {/* Split */}
          {paymentMethod === 'split' && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Split payment</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-xs font-bold"
                  onClick={() =>
                    setSplits((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        method: 'upi',
                        amount: Math.max(0, total - splitPaid).toFixed(2),
                      },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add split
                </Button>
              </div>
              <div className="space-y-2">
                {splits.map((line, idx) => (
                  <div key={line.id} className="flex items-center gap-2">
                    <select
                      className="h-10 w-32 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"
                      value={line.method}
                      onChange={(e) =>
                        setSplits((prev) =>
                          prev.map((s) =>
                            s.id === line.id
                              ? { ...s, method: e.target.value as SplitLine['method'] }
                              : s
                          )
                        )
                      }
                    >
                      {paymentMethods
                        .filter((m) => !isOnlinePaymentMethod(m.id) && m.id !== 'split')
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                    </select>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-10 flex-1 rounded-xl"
                      placeholder="Amount"
                      value={line.amount}
                      onChange={(e) =>
                        setSplits((prev) =>
                          prev.map((s) =>
                            s.id === line.id ? { ...s, amount: e.target.value } : s
                          )
                        )
                      }
                    />
                    <span className="hidden text-xs font-bold text-slate-400 sm:inline">
                      #{idx + 1}
                    </span>
                    {splits.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-rose-500"
                        onClick={() => setSplits((prev) => prev.filter((s) => s.id !== line.id))}
                      >
                        <Delete className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
                  <p className="font-bold text-slate-400">Paid</p>
                  <p className="font-black text-emerald-600">{formatCurrency(splitPaid)}</p>
                </div>
                <div className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
                  <p className="font-bold text-slate-400">Remaining</p>
                  <p className="font-black text-amber-600">{formatCurrency(remainingAmount)}</p>
                </div>
                <div className="rounded-xl bg-white p-2 ring-1 ring-slate-100">
                  <p className="font-bold text-slate-400">Change</p>
                  <p className="font-black text-slate-700">{formatCurrency(changeDue)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Wallet / gift / credit / store credit */}
          {(['wallet', 'gift_card', 'credit', 'store_credit'] as PaymentMethod[]).includes(
            paymentMethod
          ) && (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-10 text-slate-500">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                {paymentMethod === 'gift_card' ? (
                  <Gift className="h-7 w-7 text-brand-orange" />
                ) : paymentMethod === 'credit' ? (
                  <ReceiptText className="h-7 w-7 text-brand-orange" />
                ) : (
                  <Wallet className="h-7 w-7 text-brand-orange" />
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Process {getPaymentMethodLabel(paymentMethod)}
              </h3>
              <p className="mt-1 max-w-sm text-center text-sm">
                Collect <span className="font-bold text-slate-900">{formatCurrency(total)}</span>, then
                complete payment.
              </p>
            </div>
          )}

          {/* Online gateway */}
          {isOnlineGateway && (
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <ShieldCheck className="h-7 w-7 text-brand-orange" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {getPaymentMethodLabel(paymentMethod)} checkout
                  </h3>
                  <p className="text-sm text-slate-500">
                    Collect {formatCurrency(total)} through the outlet gateway.
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  'flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold',
                  gatewayState.status === 'verified'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : gatewayState.status === 'error' || gatewayState.status === 'failed'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-600'
                )}
              >
                {gatewayState.status === 'verified' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                ) : gatewayState.status === 'error' || gatewayState.status === 'failed' ? (
                  <AlertCircle className="h-5 w-5 shrink-0" />
                ) : (
                  <ShieldCheck className="h-5 w-5 shrink-0 text-brand-orange" />
                )}
                <span>{gatewayState.message}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={() => void handleStartGatewayPayment()}
                  disabled={gatewayState.status === 'starting' || gatewayState.status === 'checking'}
                  className="h-12 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800"
                >
                  {gatewayState.status === 'starting' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  Start payment
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCheckGatewayStatus()}
                  disabled={!selectedGatewaySession || gatewayState.status === 'checking'}
                  className="h-12 rounded-xl font-bold"
                >
                  {gatewayState.status === 'checking' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Check status
                </Button>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="mt-auto shrink-0 space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                { label: 'Hold Bill', icon: PauseCircle, action: () => void handleHoldBill() },
                { label: 'Resume', icon: RefreshCw, action: () => navigate('/erp/pos?view=held') },
                {
                  label: 'Split Bill',
                  icon: Split,
                  action: () => handlePaymentMethodChange('split'),
                },
                {
                  label: 'Void Bill',
                  icon: Delete,
                  action: () => setCheckoutNotice('Void bill requires manager approval.'),
                },
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

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Receipt
              </span>
              {(
                [
                  { id: 'print' as const, icon: Printer, label: 'Print' },
                  { id: 'whatsapp' as const, icon: MessageSquare, label: 'WhatsApp' },
                  { id: 'email' as const, icon: Mail, label: 'Email' },
                  { id: 'sms' as const, icon: MessageCircle, label: 'SMS' },
                  { id: 'none' as const, icon: Ban, label: 'None' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    setReceiptPref(item.id);
                    if (item.id === 'print') window.print();
                    if (item.id === 'whatsapp') handleWhatsAppReceipt();
                    if (item.id === 'email')
                      setCheckoutNotice(
                        customerEmail
                          ? `Email receipt queued for ${customerEmail}`
                          : 'Add customer email to send receipt.'
                      );
                    if (item.id === 'sms')
                      setCheckoutNotice(
                        customerPhone
                          ? `SMS receipt queued for ${customerPhone}`
                          : 'Add phone to send SMS receipt.'
                      );
                    if (item.id === 'none') setCheckoutNotice('No receipt will be sent.');
                  }}
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200',
                    receiptPref === item.id
                      ? 'border-brand-orange bg-orange-50 text-brand-orange shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            {checkoutNotice && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                {checkoutNotice}
              </div>
            )}

            <Button
              size="lg"
              className={cn(
                'hidden h-14 w-full rounded-xl text-lg font-black transition-all duration-300 md:flex',
                isReady
                  ? 'bg-emerald-600 text-white shadow-[0_10px_32px_rgba(16,185,129,0.35)] hover:bg-emerald-700 hover:-translate-y-0.5'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-70 shadow-none'
              )}
              disabled={!isReady || isCompleting}
              onClick={() => void handleCompleteOrder()}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Completing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Complete Payment · {formatCurrency(total)}
                </>
              )}
            </Button>
            {checkoutError && (
              <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {checkoutError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div
        className="fixed inset-x-0 z-[70] border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur md:hidden"
        style={{
          bottom:
            'calc(var(--cafepilots-visual-bottom, 0px) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Grand total
            </p>
            <p className="truncate text-xl font-black text-brand-orange">{formatCurrency(total)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {remainingAmount > 0 ? 'Remaining' : 'Change'}
            </p>
            <p
              className={cn(
                'text-sm font-black',
                remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'
              )}
            >
              {formatCurrency(remainingAmount > 0 ? remainingAmount : changeDue)}
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className={cn(
            'h-12 w-full rounded-xl text-base font-black transition-all duration-300',
            isReady
              ? 'bg-emerald-600 text-white shadow-[0_8px_26px_rgba(16,185,129,0.35)] hover:bg-emerald-700'
              : 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-70 shadow-none'
          )}
          disabled={!isReady || isCompleting}
          onClick={() => void handleCompleteOrder()}
        >
          {isCompleting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Completing…
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Complete Payment
            </>
          )}
        </Button>
      </div>

      <ManagerPinDialog
        open={pinOpen}
        title="Discount requires approval"
        description="Discount exceeds the configured threshold."
        action="discount"
        outletId={outletId}
        userId={user?.id}
        entityType="checkout"
        payload={{ discountAmount, discountPct: subtotal > 0 ? (discountAmount / subtotal) * 100 : 0 }}
        onCancel={() => setPinOpen(false)}
        onApproved={(approvalId) => {
          setPinOpen(false);
          setPendingApprovalId(approvalId);
          void handleCompleteOrder(approvalId);
        }}
      />
    </div>
  );
}
