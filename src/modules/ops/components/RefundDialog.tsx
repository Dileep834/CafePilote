import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/format';
import { ManagerPinDialog } from './ManagerPinDialog';
import { processRefund } from '../services/refundService';
import { REFUND_REASON_LABELS, type RefundReasonCode, type RefundType } from '../types';
import { useAuthStore } from '@/store/useAuthStore';

type OrderRow = {
  id: string;
  total_amount: number;
  refunded_amount?: number;
  payment_method: string;
  status: string;
  customer_name?: string;
  created_at: string;
};

type Props = {
  open: boolean;
  outletId: string | null;
  initialOrderId?: string | null;
  onClose: () => void;
  onCompleted?: () => void;
};

export function RefundDialog({ open, outletId, initialOrderId, onClose, onCompleted }: Props) {
  const user = useAuthStore((s) => s.user);
  const [query, setQuery] = useState(initialOrderId || '');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<
    Array<{ product_id: string; product_name: string; quantity: number; unit_price: number; selectedQty: number }>
  >([]);
  const [refundType, setRefundType] = useState<RefundType>('full');
  const [amount, setAmount] = useState('');
  const [reasonCode, setReasonCode] = useState<RefundReasonCode>('customer_cancelled');
  const [reasonNotes, setReasonNotes] = useState('');
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || !outletId) return;
    void (async () => {
      const { data } = await supabase
        .from('pos_orders')
        .select('id, total_amount, refunded_amount, payment_method, status, customer_name, created_at')
        .eq('outlet_id', outletId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(40);
      setOrders((data || []) as OrderRow[]);
      if (initialOrderId) {
        const found = (data || []).find((o) => o.id === initialOrderId);
        if (found) void selectOrder(found as OrderRow);
      }
    })();
  }, [open, outletId, initialOrderId]);

  const remaining = useMemo(() => {
    if (!selected) return 0;
    return Math.max(0, Number(selected.total_amount) - Number(selected.refunded_amount || 0));
  }, [selected]);

  const selectOrder = async (order: OrderRow) => {
    setSelected(order);
    setMethod(order.payment_method || 'cash');
    setRefundType('full');
    setAmount(String(Math.max(0, Number(order.total_amount) - Number(order.refunded_amount || 0))));
    const { data } = await supabase
      .from('pos_order_items')
      .select('product_id, product_name, quantity, unit_price')
      .eq('order_id', order.id);
    setItems(
      (data || []).map((i) => ({
        ...i,
        selectedQty: 0,
      }))
    );
  };

  const itemRefundTotal = items.reduce(
    (s, i) => s + Number(i.unit_price) * Number(i.selectedQty || 0),
    0
  );

  useEffect(() => {
    if (refundType === 'item') setAmount(String(itemRefundTotal.toFixed(2)));
    if (refundType === 'full' && selected) setAmount(String(remaining.toFixed(2)));
  }, [refundType, itemRefundTotal, selected, remaining]);

  const requestRefund = () => {
    setError('');
    const amt = Number(amount);
    if (!selected) {
      setError('Select a bill first.');
      return;
    }
    if (!(amt > 0)) {
      setError('Enter a valid refund amount.');
      return;
    }
    if (amt > remaining + 0.01) {
      setError('Amount exceeds refundable balance.');
      return;
    }
    setPinOpen(true);
  };

  const executeRefund = async (approvalId: string | null) => {
    if (!selected || !outletId) return;
    setPinOpen(false);
    setBusy(true);
    setError('');
    try {
      await processRefund({
        outletId,
        orderId: selected.id,
        refundType,
        amount: Number(amount),
        reasonCode,
        reasonNotes,
        method,
        items:
          refundType === 'item'
            ? items
                .filter((i) => i.selectedQty > 0)
                .map((i) => ({
                  productId: i.product_id,
                  productName: i.product_name,
                  quantity: i.selectedQty,
                  unitPrice: Number(i.unit_price),
                }))
            : undefined,
        userId: user?.id,
        userName: user?.name,
        userRole: user?.role,
        managerApprovalId: approvalId,
      });
      setMessage('Refund processed successfully.');
      onCompleted?.();
      setTimeout(() => {
        onClose();
        setMessage('');
      }, 900);
    } catch (err) {
      setError((err as Error)?.message || 'Refund failed');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[190] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <div className="flex h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-2xl">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Process refund</h2>
              <p className="text-[11px] text-slate-500">Manager PIN required · inventory restored automatically</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-2">
            <div className="border-b border-slate-100 p-3 md:border-b-0 md:border-r">
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search order id / customer"
                  className="h-9 w-full rounded-xl bg-slate-50 pl-8 pr-3 text-xs outline-none ring-1 ring-slate-100"
                />
              </div>
              <div className="max-h-[40vh] space-y-1.5 overflow-y-auto md:max-h-[50vh]">
                {orders
                  .filter(
                    (o) =>
                      !query ||
                      o.id.includes(query) ||
                      (o.customer_name || '').toLowerCase().includes(query.toLowerCase())
                  )
                  .map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => void selectOrder(o)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                        selected?.id === o.id ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex justify-between gap-2 font-bold">
                        <span className="truncate">#{o.id.slice(0, 8)}</span>
                        <span>{formatCurrency(o.total_amount)}</span>
                      </div>
                      <p className={`mt-0.5 truncate ${selected?.id === o.id ? 'text-white/70' : 'text-slate-400'}`}>
                        {o.customer_name || 'Guest'} · {o.payment_method}
                      </p>
                    </button>
                  ))}
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto p-4">
              {!selected ? (
                <p className="py-10 text-center text-xs text-slate-400">Select a completed bill</p>
              ) : (
                <>
                  <div className="rounded-xl bg-slate-50 p-3 text-xs">
                    <p className="font-bold text-slate-800">Refundable {formatCurrency(remaining)}</p>
                    <p className="text-slate-400">Already refunded {formatCurrency(selected.refunded_amount || 0)}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(['full', 'partial', 'item'] as RefundType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRefundType(t)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize ${
                          refundType === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {refundType === 'item' && (
                    <ul className="space-y-1.5">
                      {items.map((item, idx) => (
                        <li key={`${item.product_id}-${idx}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 flex-1 truncate font-medium">{item.product_name}</span>
                          <input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={item.selectedQty}
                            onChange={(e) => {
                              const v = Math.min(item.quantity, Math.max(0, Number(e.target.value) || 0));
                              setItems((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, selectedQty: v } : p))
                              );
                            }}
                            className="h-8 w-16 rounded-lg bg-slate-50 px-2 text-right font-bold ring-1 ring-slate-100"
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  <label className="block text-xs font-semibold text-slate-600">
                    Amount
                    <input
                      type="number"
                      value={amount}
                      disabled={refundType === 'full' || refundType === 'item'}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl bg-slate-50 px-3 font-bold ring-1 ring-slate-100"
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-600">
                    Reason
                    <select
                      value={reasonCode}
                      onChange={(e) => setReasonCode(e.target.value as RefundReasonCode)}
                      className="mt-1 h-10 w-full rounded-xl bg-slate-50 px-3 text-xs font-semibold ring-1 ring-slate-100"
                    >
                      {Object.entries(REFUND_REASON_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <input
                    value={reasonNotes}
                    onChange={(e) => setReasonNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="h-10 w-full rounded-xl bg-slate-50 px-3 text-xs ring-1 ring-slate-100"
                  />

                  <label className="block text-xs font-semibold text-slate-600">
                    Refund method
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl bg-slate-50 px-3 text-xs font-semibold ring-1 ring-slate-100"
                    >
                      {['cash', 'upi', 'card', 'wallet', 'store_credit', 'online'].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>

                  {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
                  {message && <p className="text-xs font-medium text-emerald-600">{message}</p>}

                  <Button
                    type="button"
                    className="h-11 w-full bg-[#FF6A00] text-white hover:bg-[#e55f00]"
                    disabled={busy || remaining <= 0}
                    onClick={requestRefund}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {busy ? 'Processing…' : `Refund ${formatCurrency(Number(amount) || 0)}`}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ManagerPinDialog
        open={pinOpen}
        action="refund"
        outletId={outletId}
        userId={user?.id}
        entityType="pos_order"
        entityId={selected?.id}
        payload={{ amount: Number(amount), reasonCode }}
        onCancel={() => setPinOpen(false)}
        onApproved={(id) => void executeRefund(id)}
      />
    </>
  );
}
