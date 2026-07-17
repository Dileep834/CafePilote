import React, { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, ShoppingCart, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSStore } from '../store/usePOSStore';
import { formatCurrency } from '@/utils/format';
import { useNavigate } from 'react-router-dom';

export function Cart() {
  const { 
    cart, removeItem, updateQuantity, clearCart, discountType, discountValue,
    heldOrders, holdCurrentOrder, resumeOrder, discardHeldOrder
  } = usePOSStore();
  const navigate = useNavigate();

  const [editingQtyFor, setEditingQtyFor] = useState<string | null>(null);
  const [manualQty, setManualQty] = useState('');
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);

  useEffect(() => {
    fetchHeldOrders();
  }, []);



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

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === 'percentage' ? (subtotal * discountValue) / 100 : discountValue;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = discountedSubtotal * 0.18; // 18% hardcoded for now, can be dynamic later
  const total = discountedSubtotal + tax;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-5 bg-white border-b border-slate-100 flex flex-col gap-3 shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Current Order</h2>
          <div className="flex gap-2">
            {cart.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => holdCurrentOrder('Held ' + new Date().toLocaleTimeString())} className="h-8 px-3 rounded-full text-xs font-bold uppercase tracking-wider text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700">
                  Hold
                </Button>
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-3 rounded-full text-xs font-bold uppercase tracking-wider">
                  Clear All
                </Button>
              </>
            )}
          </div>
        </div>
        {heldOrders.length > 0 && (
          <Button 
            variant="secondary" 
            className="w-full bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            onClick={() => setIsHoldModalOpen(true)}
          >
            <Clock className="w-4 h-4 mr-2" />
            View {heldOrders.length} Held {heldOrders.length === 1 ? 'Order' : 'Orders'}
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
              <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100/50 hover:shadow-md transition-shadow group">
                <div className="flex-1 min-w-0 pr-3">
                  <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{item.name}</h4>
                  <span className="text-xs font-bold text-slate-400">{formatCurrency(item.price)} each</span>
                </div>
                
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="font-black text-slate-900 text-base tabular-nums">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                  <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden h-9 shadow-inner">
                    <Button 
                      variant="ghost" 
                      className="h-full w-9 rounded-none p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                      onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                    >
                      {item.quantity === 1 ? <Trash2 className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4" />}
                    </Button>
                    <button 
                      className="w-12 text-center text-sm font-black text-slate-700 h-full flex items-center justify-center hover:bg-slate-200 transition-colors"
                      onClick={() => handleOpenQtyModal(item.id, item.quantity)}
                      title="Click to enter quantity manually"
                    >
                      {item.quantity}
                    </button>
                    <Button 
                      variant="ghost" 
                      className="h-full w-9 rounded-none p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="p-6 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.04)] flex flex-col gap-3 shrink-0 z-10 border-t border-slate-100">
        <div className="flex justify-between text-sm font-semibold text-slate-500">
          <span>Subtotal</span>
          <span className="text-slate-700">{formatCurrency(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm font-bold text-pink-600">
            <span>Discount</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-semibold text-slate-500">
          <span>Tax (18%)</span>
          <span className="text-slate-700">{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between mt-1 pt-3 border-t border-slate-100">
          <span className="font-black text-slate-800 uppercase tracking-widest text-sm">Total</span>
          <span className="font-black text-2xl text-purple-700 drop-shadow-sm">{formatCurrency(total)}</span>
        </div>
        <Button 
          className="w-full h-14 rounded-2xl text-lg font-black mt-3 bg-purple-600 hover:bg-purple-700 text-white shadow-[0_8px_30px_rgba(147,51,234,0.3)] hover:shadow-[0_8px_40px_rgba(147,51,234,0.4)] hover:-translate-y-0.5 transition-all duration-300" 
          disabled={cart.length === 0}
          onClick={() => navigate('/erp/pos/checkout')}
        >
          Checkout
        </Button>
      </div>

      {/* Manual Quantity Modal */}
      {editingQtyFor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Enter Quantity</h3>
            <p className="text-slate-500 text-sm mb-6 text-center">Type the exact quantity for this item.</p>
            
            <input 
              type="number" 
              autoFocus
              className="w-32 h-16 text-center text-3xl font-black border-2 border-slate-200 rounded-xl focus:border-purple-600 focus:ring-4 focus:ring-purple-600/20 outline-none transition-all"
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
                className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                onClick={handleSaveQty}
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Held Orders Modal */}
      {isHoldModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Orders on Hold</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsHoldModalOpen(false)}>Close</Button>
            </div>
            
            <ScrollArea className="flex-1 p-6">
              <div className="flex flex-col gap-4">
                {heldOrders.map(order => (
                  <div key={order.id} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between bg-slate-50">
                    <div>
                      <h4 className="font-bold text-slate-800">{order.notes || 'Held Order'}</h4>
                      <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleTimeString()} • {order.items.length} items</p>
                      <p className="text-sm font-bold text-purple-700">{formatCurrency(order.total_amount)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => discardHeldOrder(order.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                        title="Discard Order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        onClick={() => {
                          resumeOrder(order.id);
                          setIsHoldModalOpen(false);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      >
                        Resume <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

    </div>
  );
}
