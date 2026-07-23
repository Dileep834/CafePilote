import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Clock3,
  Lock,
  RefreshCw,
  ReceiptText,
  Shield,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { ManagerPinDialog } from '../components/ManagerPinDialog';
import {
  closeShift,
  getOpenShift,
  getShiftTransactions,
  getTerminalId,
  listShifts,
  openShift,
  recordShiftTransaction,
  type ShiftHeader,
} from '../services/shiftService';
import { setManagerPin } from '../services/managerPinService';

function StatusChip({ status }: { status: string }) {
  const open = status === 'open';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        open
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
          : 'bg-slate-100 text-slate-600 ring-slate-600/10'
      )}
    >
      {status || '—'}
    </span>
  );
}

function TxnChip({ type }: { type: string }) {
  const t = type.toLowerCase();
  const tone =
    t.includes('in') || t === 'sale'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
      : t.includes('out') || t.includes('refund') || t === 'expense'
        ? 'bg-red-50 text-red-700 ring-red-600/15'
        : 'bg-slate-100 text-slate-600 ring-slate-600/10';
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        tone
      )}
    >
      {type.replace(/_/g, ' ')}
    </span>
  );
}

export function ShiftManagementPage() {
  const user = useAuthStore((s) => s.user);
  const outlets = useTenantStore((s) => s.outlets);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const outletId = getTenantOutletId(user) || activeOutletId;
  const outletName = outlets.find((o) => o.id === outletId)?.name || 'Current outlet';
  const terminalId = getTerminalId();

  const [openShiftRow, setOpenShiftRow] = useState<ShiftHeader | null>(null);
  const [history, setHistory] = useState<ShiftHeader[]>([]);
  const [txns, setTxns] = useState<Array<Record<string, unknown>>>([]);
  const [openingCash, setOpeningCash] = useState('0');
  const [countedCash, setCountedCash] = useState('');
  const [cashMove, setCashMove] = useState({
    type: 'cash_in' as 'cash_in' | 'cash_out' | 'expense',
    amount: '',
    notes: '',
  });
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pinClose, setPinClose] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const open = await getOpenShift(outletId);
      setOpenShiftRow(open);
      try {
        setHistory(await listShifts(outletId));
      } catch {
        setHistory([]);
      }
      if (open) {
        try {
          setTxns(await getShiftTransactions(open.id));
        } catch {
          setTxns([]);
        }
      } else {
        setTxns([]);
      }
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleOpen = async () => {
    if (!outletId) {
      setMessage({ type: 'err', text: 'Select an outlet first.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await openShift({
        outletId,
        openingCash: Number(openingCash) || 0,
        userId: user?.id,
        userName: user?.name,
      });
      setMessage({ type: 'ok', text: 'Shift opened.' });
      await reload();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleCashMove = async () => {
    if (!openShiftRow) return;
    const amount = Number(cashMove.amount);
    if (!(amount > 0)) {
      setMessage({ type: 'err', text: 'Enter a positive amount.' });
      return;
    }
    setBusy(true);
    try {
      await recordShiftTransaction({
        shiftId: openShiftRow.id,
        txnType: cashMove.type,
        amount,
        notes: cashMove.notes,
        createdBy: user?.id,
      });
      setCashMove({ type: 'cash_in', amount: '', notes: '' });
      setMessage({ type: 'ok', text: 'Cash movement recorded.' });
      await reload();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const doClose = async (approvalId: string | null) => {
    if (!openShiftRow) return;
    setPinClose(false);
    setBusy(true);
    try {
      const closed = await closeShift({
        shiftId: openShiftRow.id,
        countedCash: Number(countedCash) || 0,
        userId: user?.id,
        userName: user?.name,
      });
      setMessage({
        type: 'ok',
        text: `Shift closed. Expected ${formatCurrency(closed.expected_cash || 0)} · Counted ${formatCurrency(closed.closing_cash_counted || 0)} · Variance ${formatCurrency(closed.variance || 0)}`,
      });
      setCountedCash('');
      await reload();
      void approvalId;
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const expectedCash = useMemo(() => {
    if (!openShiftRow) return 0;
    if (typeof openShiftRow.expected_cash === 'number') return openShiftRow.expected_cash;
    const opening = Number(openShiftRow.opening_cash || 0);
    const sales = Number(openShiftRow.total_sales || 0);
    const refunds = Number(openShiftRow.total_refunds || 0);
    const moves = txns.reduce((sum, t) => {
      const type = String(t.txn_type || '');
      const amt = Number(t.amount || 0);
      if (type === 'cash_in') return sum + amt;
      if (type === 'cash_out' || type === 'expense') return sum - amt;
      return sum;
    }, 0);
    return opening + sales - refunds + moves;
  }, [openShiftRow, txns]);

  const variancePreview =
    countedCash === '' ? null : Number(countedCash) - expectedCash;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Shift / Cash</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Cash drawer for {outletName} · terminal{' '}
            <span className="font-mono font-semibold text-slate-700">{terminalId}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            disabled={loading || busy}
            onClick={() => void reload()}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          {openShiftRow ? (
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-xl bg-slate-900 px-4 font-bold text-white hover:bg-slate-800"
              disabled={busy || countedCash === ''}
              onClick={() => setPinClose(true)}
            >
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              Close shift
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-xl bg-[#FF6A00] px-4 font-bold text-white hover:bg-[#e55f00]"
              disabled={busy || !outletId}
              onClick={() => void handleOpen()}
            >
              <Banknote className="mr-1.5 h-4 w-4" />
              Open shift
            </Button>
          )}
        </div>
      </div>

      {message && (
        <p
          className={cn(
            'rounded-[12px] px-3 py-2 text-xs font-semibold ring-1',
            message.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
              : 'bg-amber-50 text-amber-800 ring-amber-100'
          )}
        >
          {message.text}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard
          label="Shift status"
          value={openShiftRow ? 'Open' : 'Closed'}
          subtitle={
            openShiftRow
              ? `Since ${new Date(openShiftRow.opened_at).toLocaleTimeString()}`
              : 'No active drawer'
          }
          icon={Clock3}
          tone={openShiftRow ? 'emerald' : 'slate'}
        />
        <InventoryCard
          label="Opening cash"
          value={formatCurrency(openShiftRow?.opening_cash || Number(openingCash) || 0)}
          subtitle="Float in drawer"
          icon={Wallet}
          tone="orange"
        />
        <InventoryCard
          label="Sales (shift)"
          value={formatCurrency(openShiftRow?.total_sales || 0)}
          subtitle={`Refunds ${formatCurrency(openShiftRow?.total_refunds || 0)}`}
          icon={ReceiptText}
          tone="blue"
        />
        <InventoryCard
          label="Expected cash"
          value={formatCurrency(openShiftRow ? expectedCash : 0)}
          subtitle={
            variancePreview == null
              ? 'Enter counted cash to compare'
              : `Variance ${formatCurrency(variancePreview)}`
          }
          icon={Banknote}
          tone={variancePreview != null && Math.abs(variancePreview) > 0.01 ? 'red' : 'slate'}
        />
      </div>

      {!openShiftRow ? (
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Open a new shift</h2>
              <p className="mt-0.5 text-sm font-medium text-slate-500">
                Count the float, then open the drawer for this terminal.
              </p>
            </div>
          </div>
          <label className="block max-w-xs space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Opening cash
            </span>
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none ring-orange-500/30 focus:ring-2"
            />
          </label>
          <Button
            type="button"
            className="mt-4 h-10 rounded-xl bg-[#FF6A00] px-5 font-bold text-white hover:bg-[#e55f00]"
            disabled={busy || !outletId}
            onClick={() => void handleOpen()}
          >
            <Banknote className="mr-2 h-4 w-4" />
            Open shift
          </Button>
        </section>
      ) : (
        <div className="grid gap-3 lg:grid-cols-5">
          <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 lg:col-span-3 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  Active shift
                </p>
                <p className="text-base font-black text-slate-900">
                  Opened {new Date(openShiftRow.opened_at).toLocaleString()}
                </p>
              </div>
              <StatusChip status={openShiftRow.status || 'open'} />
            </div>

            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Cash movement
              </p>
              <div className="grid gap-2 sm:grid-cols-4">
                <select
                  value={cashMove.type}
                  onChange={(e) =>
                    setCashMove((c) => ({ ...c, type: e.target.value as typeof cashMove.type }))
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold outline-none ring-orange-500/30 focus:ring-2"
                >
                  <option value="cash_in">Cash in</option>
                  <option value="cash_out">Cash out</option>
                  <option value="expense">Expense</option>
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={cashMove.amount}
                  onChange={(e) => setCashMove((c) => ({ ...c, amount: e.target.value }))}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none ring-orange-500/30 focus:ring-2"
                />
                <input
                  placeholder="Notes"
                  value={cashMove.notes}
                  onChange={(e) => setCashMove((c) => ({ ...c, notes: e.target.value }))}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-orange-500/30 focus:ring-2 sm:col-span-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200"
                  disabled={busy}
                  onClick={() => void handleCashMove()}
                >
                  {cashMove.type === 'cash_in' ? (
                    <ArrowDownLeft className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Record
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl ring-1 ring-slate-100">
              <div className="max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Method</th>
                      <th className="px-3 py-2.5">Notes</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((t) => (
                      <tr
                        key={String(t.id)}
                        className="border-t border-slate-50 transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-3 py-2.5">
                          <TxnChip type={String(t.txn_type || '')} />
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {String(t.payment_method || '—')}
                        </td>
                        <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-500">
                          {String(t.notes || '—')}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm font-black tabular-nums text-slate-900">
                          {formatCurrency(Number(t.amount || 0))}
                        </td>
                      </tr>
                    ))}
                    {!txns.length && (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                          No cash movements yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 lg:col-span-2 sm:p-5">
            <h2 className="text-base font-black text-slate-900">Close shift (Z)</h2>
            <p className="text-sm font-medium text-slate-500">
              Count the drawer, then confirm with manager PIN.
            </p>
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Expected</span>
                <span className="tabular-nums text-slate-900">{formatCurrency(expectedCash)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Sales</span>
                <span className="tabular-nums">{formatCurrency(openShiftRow.total_sales || 0)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Refunds</span>
                <span className="tabular-nums">
                  {formatCurrency(openShiftRow.total_refunds || 0)}
                </span>
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Counted cash
              </span>
              <input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none ring-orange-500/30 focus:ring-2"
              />
            </label>
            {variancePreview != null && (
              <p
                className={cn(
                  'text-sm font-bold tabular-nums',
                  Math.abs(variancePreview) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                Variance {formatCurrency(variancePreview)}
              </p>
            )}
            <Button
              type="button"
              className="h-10 w-full rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800"
              disabled={busy || countedCash === ''}
              onClick={() => setPinClose(true)}
            >
              <Lock className="mr-2 h-4 w-4" />
              Close shift (Z report)
            </Button>
          </section>
        </div>
      )}

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-base font-black text-slate-900">Recent shifts (X / Z history)</h2>
          <p className="text-sm font-medium text-slate-500">Closed and open drawers for this outlet</p>
        </div>
        {!history.length ? (
          <div className="px-6 py-12 text-center">
            <p className="text-base font-black text-slate-900">No shift history yet</p>
            <p className="mt-1 text-sm text-slate-500">Open a shift to start the cash trail.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Opened</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Sales</th>
                  <th className="px-4 py-2.5 text-right">Expected</th>
                  <th className="px-4 py-2.5 text-right">Counted</th>
                  <th className="px-4 py-2.5 text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-slate-50 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-600">
                      {new Date(s.opened_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusChip status={s.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">
                      {formatCurrency(s.total_sales || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                      {formatCurrency(s.expected_cash || 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                      {formatCurrency(s.closing_cash_counted || 0)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-2.5 text-right font-black tabular-nums',
                        Math.abs(Number(s.variance || 0)) > 0.01
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      )}
                    >
                      {formatCurrency(s.variance || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Manager PIN</h2>
            <p className="text-sm font-medium text-slate-500">
              Required for closing shifts and other sensitive POS actions.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="New 4–8 digit PIN"
            className="h-10 w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tracking-widest outline-none ring-orange-500/30 focus:ring-2"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-slate-200"
            onClick={() => {
              void setManagerPin(newPin, outletId, user?.id)
                .then(() => {
                  setMessage({ type: 'ok', text: 'Manager PIN saved.' });
                  setNewPin('');
                })
                .catch((err) => setMessage({ type: 'err', text: (err as Error).message }));
            }}
          >
            Save PIN
          </Button>
        </div>
      </section>

      <ManagerPinDialog
        open={pinClose}
        title="Close shift"
        description="Manager PIN required to close the drawer and print Z totals."
        action="shift_close"
        outletId={outletId}
        userId={user?.id}
        entityType="shift"
        entityId={openShiftRow?.id}
        onCancel={() => setPinClose(false)}
        onApproved={(id) => void doClose(id)}
      />
    </div>
  );
}
