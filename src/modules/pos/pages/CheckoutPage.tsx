import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePOSStore, type PaymentMethod } from '../store/usePOSStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Banknote, CreditCard, Smartphone, Delete, CheckCircle2, User, Phone, Printer, Plus, MessageSquare, Ticket } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThermalReceipt } from '../components/ThermalReceipt';
import { useSettingsStore } from '../../settings/store/useSettingsStore';
import { useVoucherStore } from '../../marketing/store/useVoucherStore';

export function CheckoutPage() {
  const navigate = useNavigate();
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
    setDiscount
  } = usePOSStore();

  const { validateVoucher } = useVoucherStore();
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === 'percentage' ? (subtotal * discountValue) / 100 : discountValue;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + tax;

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

  const handleCompleteOrder = async () => {
    if (!isReady) return;
    await processCheckout();
    setIsSuccess(true);
  };

  const handleNewOrder = () => {
    setIsSuccess(false);
    navigate('/erp/pos');
  };

  const tenderedNumeric = parseFloat(tenderedAmount) || 0;
  const changeDue = Math.max(0, tenderedNumeric - total);
  
  // Is the order ready to complete?
  const isReady = paymentMethod !== 'cash' || tenderedNumeric >= total;

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
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-50 p-6 -m-4 sm:-m-6 lg:-m-8 relative">
        <ThermalReceipt 
          orderId={Math.random().toString(36).substr(2, 9).toUpperCase()}
          items={cart}
          totalAmount={total}
          taxAmount={tax}
          discountAmount={discountAmount}
          tenderedAmount={tenderedNumeric}
          changeDue={changeDue}
          paymentMethod={paymentMethod}
          customerName={customerName}
          customerPhone={customerPhone}
        />
        <div className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center text-center max-w-md w-full border border-slate-100 z-10 print:hidden">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Order Complete!</h1>
          <p className="text-slate-500 mb-8">The transaction was processed successfully.</p>
          
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
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Checkout</h1>
        </div>

        {/* Total Summary Header */}
        <div className="px-4 xl:px-8 pt-8 pb-6 flex flex-col items-center justify-center text-center w-full overflow-hidden">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Amount</span>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-purple-700 tracking-tighter drop-shadow-sm truncate max-w-full px-2">
            {formatCurrency(total)}
          </div>
        </div>
        
        {/* Cart List */}
        <ScrollArea className="flex-1 min-h-0 px-8 max-h-[40vh] md:max-h-none border-t border-b border-slate-200/50 bg-white/40">
          <div className="space-y-1 py-4">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0 group">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-700 group-hover:text-purple-700 transition-colors">{item.name}</span>
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
            <div className="flex justify-between text-sm font-bold text-pink-600">
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
                <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                <Input 
                  type="text" 
                  placeholder="Full Name" 
                  className="pl-10 h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-purple-600 shadow-none rounded-xl"
                  value={customerName}
                  onChange={(e) => setCustomerDetails(e.target.value, customerPhone)}
                />
              </div>
              <div className="relative group">
                <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                <Input 
                  type="tel" 
                  placeholder="Phone Number" 
                  className="pl-10 h-10 bg-slate-50/50 border-slate-200 focus-visible:ring-purple-600 shadow-none rounded-xl"
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
                <Ticket className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-pink-600 transition-colors" />
                <Input 
                  type="text" 
                  placeholder="Enter Code" 
                  className={`pl-10 h-10 bg-slate-50/50 uppercase border-slate-200 focus-visible:ring-pink-600 shadow-none rounded-xl ${promoError ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
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
            <div className="flex p-1 bg-slate-100/80 rounded-xl">
              {[
                { id: 'cash', icon: Banknote, label: 'Cash' },
                { id: 'card', icon: CreditCard, label: 'Card' },
                { id: 'upi', icon: Smartphone, label: 'UPI' }
              ].map((method) => {
                const Icon = method.icon;
                const isActive = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all duration-300",
                      isActive 
                        ? "bg-white text-purple-700 shadow-[0_2px_10px_rgba(0,0,0,0.06)] font-bold scale-[1.02]" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 font-medium"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-purple-600" : "text-slate-400")} />
                    <span>{method.label}</span>
                  </button>
                )
              })}
            </div>
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
                  <Button variant="outline" className="h-10 text-sm font-bold border-slate-200 rounded-lg hover:bg-slate-50 hover:text-purple-700 transition-colors shadow-none" onClick={() => handleQuickAmount(total)}>Exact Amount</Button>
                  <Button variant="outline" className="h-10 text-sm font-bold border-slate-200 rounded-lg hover:bg-slate-50 hover:text-purple-700 transition-colors shadow-none" onClick={() => handleQuickAmount(100)}>₹100</Button>
                  <Button variant="outline" className="h-10 text-sm font-bold border-slate-200 rounded-lg hover:bg-slate-50 hover:text-purple-700 transition-colors shadow-none" onClick={() => handleQuickAmount(500)}>₹500</Button>
                  <Button variant="outline" className="h-10 text-sm font-bold border-slate-200 rounded-lg hover:bg-slate-50 hover:text-purple-700 transition-colors shadow-none" onClick={() => handleQuickAmount(2000)}>₹2000</Button>
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

          {/* Non-Cash Placeholder */}
          {paymentMethod !== 'cash' && (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-500 min-h-0 py-12">
              <div className="w-20 h-20 bg-white shadow-sm rounded-full flex items-center justify-center mb-6">
                {paymentMethod === 'card' ? <CreditCard className="w-8 h-8 text-purple-500" /> : <Smartphone className="w-8 h-8 text-purple-500" />}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Process {paymentMethod.toUpperCase()} Payment</h3>
              <p className="text-center text-slate-500 max-w-sm">Please use your external terminal to collect <span className="font-bold text-slate-900">{formatCurrency(total)}</span>. Once successful, click below to complete the order.</p>
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
