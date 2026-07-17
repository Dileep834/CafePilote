import React from 'react';
import { usePOSStore } from '../store/usePOSStore';
import { formatCurrency } from '@/utils/format';

export function Receipt() {
  const { lastOrder, taxRate } = usePOSStore();

  if (!lastOrder) return null;

  const subtotal = lastOrder.cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return (
    <div id="printable-receipt" className="hidden print:block w-[80mm] p-4 bg-white text-black font-mono text-sm mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold mb-1">CafePilote</h1>
        <p className="text-xs">123 Coffee Street, Food City</p>
        <p className="text-xs">Phone: +91 98765 43210</p>
        <div className="mt-4 border-t border-b border-dashed border-black py-2">
          <p className="text-xs">Date: {new Date(lastOrder.timestamp).toLocaleString()}</p>
          {lastOrder.customer?.name && <p className="text-xs">Customer: {lastOrder.customer.name}</p>}
          {lastOrder.customer?.phone && <p className="text-xs">Phone: {lastOrder.customer.phone}</p>}
        </div>
      </div>

      <div className="mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-dashed border-black">
              <th className="text-left py-1 w-1/2">Item</th>
              <th className="text-center py-1">Qty</th>
              <th className="text-right py-1">Price</th>
            </tr>
          </thead>
          <tbody>
            {lastOrder.cart.map((item: any) => (
              <tr key={item.id}>
                <td className="py-1 break-words pr-2">{item.name}</td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-dashed border-black pt-2 mb-4 space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (18%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-dashed border-black">
          <span>TOTAL</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black pt-4 mb-4 text-xs space-y-1">
        <div className="flex justify-between">
          <span>Payment Method:</span>
          <span className="uppercase">{lastOrder.paymentMethod}</span>
        </div>
        {lastOrder.paymentMethod === 'cash' && lastOrder.tenderedAmount && (
          <div className="flex justify-between">
            <span>Tendered:</span>
            <span>{formatCurrency(parseFloat(lastOrder.tenderedAmount))}</span>
          </div>
        )}
      </div>

      <div className="text-center mt-8">
        <p className="font-bold text-sm mb-1">Thank You!</p>
        <p className="text-xs">Please visit again</p>
      </div>
    </div>
  );
}
