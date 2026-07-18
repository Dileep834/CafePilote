import React, { useState } from 'react';
import { X, Minus, Plus, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { useCustomerOrderStore } from '../store/useCustomerOrderStore';
import { useTableStore } from '@/modules/tables/store/useTableStore';
import { useTableBillStore } from '@/modules/tables/store/useTableBillStore';
import { useGuestAuthStore } from '../store/useGuestAuthStore';
import { formatCurrency } from '@/utils/format';
import { BRAND } from '@/constants';
import type { Table } from '@/types';

interface CustomerCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table;
  onViewStatus?: () => void;
}

export function CustomerCartModal({ isOpen, onClose, table, onViewStatus }: CustomerCartModalProps) {
  const { cart, updateQuantity, removeItem, getCartTotal, clearCart, setCustomerDetails } =
    useCustomerOrderStore();
  const guest = useGuestAuthStore((s) => s.guest);
  const tables = useTableStore((s) => s.tables);
  const addItemsToTable = useTableBillStore((s) => s.addItemsToTable);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const safePrice = (p: any) => Number(p.selling_price || p.sellingPrice || 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (guest) {
        setCustomerDetails(guest.name, guest.email);
      }
      // Ensure the scanned table is in the list even if guest store hasn't finished loading
      const allTables = tables.some((t) => t.id === table.id)
        ? tables
        : [table, ...tables];
      await addItemsToTable(
        table,
        allTables,
        cart.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          price: safePrice(item.product),
          quantity: item.quantity,
          notes: item.notes,
        })),
        'qr',
        {
          fireKitchen: true,
          guestName: guest?.name,
          guestEmail: guest?.email,
        }
      );
      clearCart();
      setDone(true);
    } catch (e: any) {
      const storeErr = useTableBillStore.getState().lastError;
      setError(storeErr || e?.message || 'Could not send order. Please ask staff.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-auto">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={handleClose} />

      <div className="relative bg-white w-full max-w-md h-[85vh] rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
        <div className="flex items-center justify-between p-5 border-b border-black/5">
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: BRAND.navy }}>
              {done ? 'Order sent' : 'Your Order'}
            </h2>
            <p className="text-sm text-slate-500">
              Table{' '}
              <span className="font-bold" style={{ color: BRAND.orange }}>
                {table?.tableNumber}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
            style={{ backgroundColor: BRAND.gray }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${BRAND.orange}18` }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: BRAND.orange }} />
            </div>
            <p className="text-lg font-bold" style={{ color: BRAND.navy }}>
              Sent to kitchen
            </p>
            <p className="text-sm text-slate-500 mt-2 max-w-xs">
              Your items are with the kitchen. Track progress under Order status.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs mt-8">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onViewStatus?.();
                }}
                className="h-12 rounded-2xl text-white font-bold"
                style={{ backgroundColor: BRAND.orange }}
              >
                View order status
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="h-12 rounded-2xl font-bold border border-slate-200"
                style={{ color: BRAND.navy }}
              >
                Back to menu
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate" style={{ color: BRAND.navy }}>
                        {item.product.name}
                      </h4>
                      <p className="font-extrabold mt-0.5" style={{ color: BRAND.orange }}>
                        {formatCurrency(safePrice(item.product) * item.quantity)}
                      </p>
                    </div>

                    <div
                      className="flex items-center gap-2 rounded-full p-1 border border-black/5"
                      style={{ backgroundColor: BRAND.gray }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          item.quantity === 1 ? removeItem(item.id) : updateQuantity(item.id, -1)
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-slate-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold w-4 text-center" style={{ color: BRAND.navy }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm"
                        style={{ color: BRAND.orange }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 bg-white border-t border-black/5 shadow-[0_-10px_40px_rgba(13,27,42,0.06)]">
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">
                    {error}
                  </p>
                )}
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-slate-500 text-base">Total Amount</span>
                  <span className="font-extrabold text-2xl" style={{ color: BRAND.navy }}>
                    {formatCurrency(getCartTotal())}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className="w-full h-14 text-white rounded-2xl text-lg font-bold transition-transform active:scale-[0.99] disabled:opacity-60"
                  style={{
                    backgroundColor: BRAND.orange,
                    boxShadow: `0 10px 24px ${BRAND.orange}45`,
                  }}
                >
                  {submitting ? 'Sending…' : 'Confirm & Send to Kitchen'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
