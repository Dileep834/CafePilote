import { useCallback, useEffect, useState } from 'react';
import { Banknote, Lock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/format';
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

export function ShiftManagementPage() {
  const user = useAuthStore((s) => s.user);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const outletId = getTenantOutletId(user) || activeOutletId;
  const [openShiftRow, setOpenShiftRow] = useState<ShiftHeader | null>(null);
  const [history, setHistory] = useState<ShiftHeader[]>([]);
  const [txns, setTxns] = useState<Array<Record<string, unknown>>>([]);
  const [openingCash, setOpeningCash] = useState('0');
  const [countedCash, setCountedCash] = useState('');
  const [cashMove, setCashMove] = useState({ type: 'cash_in' as 'cash_in' | 'cash_out' | 'expense', amount: '', notes: '' });
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pinClose, setPinClose] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!outletId) return;
    const open = await getOpenShift(outletId);
    setOpenShiftRow(open);
    try {
      const list = await listShifts(outletId);
      setHistory(list);
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

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Shift & cash drawer</h1>
          <p className="text-xs text-slate-500">
            Terminal <span className="font-mono font-semibold">{getTerminalId()}</span> · one open shift per terminal
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {message && (
        <div
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
            message.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {!openShiftRow ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-3 text-sm font-bold text-slate-900">Open shift</h2>
          <label className="block text-xs font-semibold text-slate-600">
            Opening cash
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="mt-1 h-10 w-full max-w-xs rounded-xl bg-slate-50 px-3 font-bold ring-1 ring-slate-100"
            />
          </label>
          <Button
            type="button"
            className="mt-3 bg-[#FF6A00] text-white hover:bg-[#e55f00]"
            disabled={busy}
            onClick={() => void handleOpen()}
          >
            <Banknote className="mr-2 h-4 w-4" />
            Open shift
          </Button>
        </section>
      ) : (
        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Shift open</p>
              <p className="text-sm font-black text-slate-900">
                Since {new Date(openShiftRow.opened_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right text-xs">
              <p>Opening {formatCurrency(openShiftRow.opening_cash)}</p>
              <p>Sales {formatCurrency(openShiftRow.total_sales || 0)}</p>
              <p>Refunds {formatCurrency(openShiftRow.total_refunds || 0)}</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <select
              value={cashMove.type}
              onChange={(e) =>
                setCashMove((c) => ({ ...c, type: e.target.value as typeof cashMove.type }))
              }
              className="h-10 rounded-xl bg-slate-50 px-2 text-xs font-semibold ring-1 ring-slate-100"
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
              className="h-10 rounded-xl bg-slate-50 px-3 text-xs font-bold ring-1 ring-slate-100"
            />
            <input
              placeholder="Notes"
              value={cashMove.notes}
              onChange={(e) => setCashMove((c) => ({ ...c, notes: e.target.value }))}
              className="h-10 rounded-xl bg-slate-50 px-3 text-xs ring-1 ring-slate-100"
            />
            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleCashMove()}>
              Record
            </Button>
          </div>

          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-400">
                <tr>
                  <th className="px-2 py-1.5">Type</th>
                  <th className="px-2 py-1.5">Method</th>
                  <th className="px-2 py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={String(t.id)} className="border-t border-slate-50">
                    <td className="px-2 py-1.5 font-semibold capitalize">{String(t.txn_type)}</td>
                    <td className="px-2 py-1.5">{String(t.payment_method || '—')}</td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums">
                      {formatCurrency(Number(t.amount || 0))}
                    </td>
                  </tr>
                ))}
                {!txns.length && (
                  <tr>
                    <td colSpan={3} className="px-2 py-4 text-center text-slate-400">
                      No movements yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <label className="text-xs font-semibold text-slate-600">
              Counted cash (Z)
              <input
                type="number"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="mt-1 block h-10 w-40 rounded-xl bg-slate-50 px-3 font-bold ring-1 ring-slate-100"
              />
            </label>
            <Button
              type="button"
              className="bg-slate-900 text-white"
              disabled={busy || countedCash === ''}
              onClick={() => setPinClose(true)}
            >
              <Lock className="mr-2 h-4 w-4" />
              Close shift (Z report)
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-2 text-sm font-bold text-slate-900">Recent shifts (X / Z history)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="text-[10px] uppercase text-slate-400">
              <tr>
                <th className="py-2">Opened</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Sales</th>
                <th className="py-2 text-right">Expected</th>
                <th className="py-2 text-right">Counted</th>
                <th className="py-2 text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} className="border-t border-slate-50">
                  <td className="py-2">{new Date(s.opened_at).toLocaleString()}</td>
                  <td className="py-2 capitalize">{s.status}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(s.total_sales || 0)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(s.expected_cash || 0)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(s.closing_cash_counted || 0)}</td>
                  <td className="py-2 text-right font-bold tabular-nums">{formatCurrency(s.variance || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-2 text-sm font-bold text-slate-900">Manager PIN</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="New 4–8 digit PIN"
            className="h-10 w-48 rounded-xl bg-slate-50 px-3 text-sm font-bold tracking-widest ring-1 ring-slate-100"
          />
          <Button
            type="button"
            variant="outline"
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
