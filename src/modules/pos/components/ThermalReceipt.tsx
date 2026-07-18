import React from 'react';
import { useSettingsStore } from '../../settings/store/useSettingsStore';
import { formatCurrency } from '@/utils/format';
import dayjs from 'dayjs';

interface PrintReceiptProps {
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  taxAmount: number;
  discountAmount?: number;
  tenderedAmount: number;
  changeDue: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  previewMode?: boolean;
  previewSettings?: any;
}

export function ThermalReceipt({
  orderId,
  items,
  totalAmount,
  taxAmount,
  discountAmount = 0,
  tenderedAmount,
  changeDue,
  paymentMethod,
  customerName,
  customerPhone,
  previewMode = false,
  previewSettings
}: PrintReceiptProps) {
  const globalSettings = useSettingsStore();
  const settings = previewSettings || globalSettings;

  // Define widths based on thermal paper sizes
  // 58mm usually has a printable width of ~48mm (approx 180px - 200px)
  // 80mm usually has a printable width of ~72mm (approx 270px - 300px)
  let printContainerClass = '';
  switch (settings.printerSize) {
    case '58mm':
      printContainerClass = 'w-[180px] text-[10px] mx-auto';
      break;
    case '80mm':
      printContainerClass = 'w-[280px] text-[12px] mx-auto';
      break;
    default:
      printContainerClass = 'w-full max-w-md mx-auto text-sm';
      break;
  }

  const visibilityClass = previewMode ? 'block shadow-xl border border-slate-200 rounded p-4' : 'hidden print:block';

  return (
    <div className={`${visibilityClass} font-mono ${printContainerClass} text-black bg-white`}>
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="font-bold text-lg mb-1">{settings.cafeName}</h1>
        <p>{settings.cafeAddress}</p>
        <p>Tel: {settings.cafePhone}</p>
        {settings.taxNumber && <p>Tax ID: {settings.taxNumber}</p>}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Order Info */}
      <div className="mb-4">
        <p>Date: {dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <p>Order #: {orderId}</p>
        {customerName && <p>Customer: {customerName}</p>}
        {customerPhone && <p>Phone: {customerPhone}</p>}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Items */}
      <table className="w-full mb-4">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left font-normal pb-1">Item</th>
            <th className="text-right font-normal pb-1 w-8">Qty</th>
            <th className="text-right font-normal pb-1 w-16">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td className="py-1 break-words pr-2">{item.name}</td>
              <td className="py-1 text-right align-top">{item.quantity}</td>
              <td className="py-1 text-right align-top">{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Totals */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(totalAmount - taxAmount + discountAmount)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Discount</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex justify-between font-bold text-base mt-2">
          <span>TOTAL</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Payment */}
      <div className="space-y-1 mb-6">
        <div className="flex justify-between">
          <span>Paid ({paymentMethod})</span>
          <span>{formatCurrency(tenderedAmount)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Change</span>
          <span>{formatCurrency(changeDue)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="font-bold">{settings.receiptFooterMessage}</p>
        <p className="mt-2 text-[0.8em]">Powered by CafePilots</p>
      </div>
    </div>
  );
}
