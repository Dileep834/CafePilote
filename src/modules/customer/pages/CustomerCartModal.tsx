import React from 'react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCustomerOrderStore } from '../store/useCustomerOrderStore';
import { formatCurrency } from '@/utils/format';
import { Button } from '@/components/ui/button';

interface CustomerCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: any;
}

export function CustomerCartModal({ isOpen, onClose, table }: CustomerCartModalProps) {
  const { cart, updateQuantity, removeItem, getCartTotal, clearCart } = useCustomerOrderStore();

  if (!isOpen) return null;

  const safePrice = (p: any) => p.selling_price || p.sellingPrice || 0;

  const handleSubmitOrder = () => {
    // In a real app, this would send an API request to Supabase to create the order.
    // For now, we will just alert and clear the cart.
    alert('Order submitted successfully! Sending to kitchen...');
    clearCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white w-full max-w-md h-[85vh] rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900">Your Order</h2>
            <p className="text-sm font-medium text-slate-500">Table {table?.tableNumber}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-4 items-center">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800">{item.product.name}</h4>
                  <p className="font-black text-purple-600 mt-0.5">{formatCurrency(safePrice(item.product) * item.quantity)}</p>
                </div>
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-3 bg-slate-50 rounded-full p-1 border border-slate-200">
                  <button 
                    onClick={() => item.quantity === 1 ? removeItem(item.id) : updateQuantity(item.id, -1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-slate-600 hover:text-red-500"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-slate-600 hover:text-purple-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-5 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-slate-500 text-lg">Total Amount</span>
              <span className="font-black text-2xl text-slate-900">{formatCurrency(getCartTotal())}</span>
            </div>
            <Button 
              onClick={handleSubmitOrder}
              className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-[0_8px_25px_rgba(147,51,234,0.25)] text-lg font-bold"
            >
              Confirm & Send to Kitchen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
