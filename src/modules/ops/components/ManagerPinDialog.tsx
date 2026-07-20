import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyManagerPin } from '../services/managerPinService';

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  action: string;
  outletId?: string | null;
  userId?: string | null;
  entityType?: string;
  entityId?: string | null;
  payload?: unknown;
  onCancel: () => void;
  onApproved: (approvalId: string | null) => void;
};

export function ManagerPinDialog({
  open,
  title = 'Manager approval required',
  description = 'Enter the manager PIN to continue.',
  action,
  outletId,
  userId,
  entityType,
  entityId,
  payload,
  onCancel,
  onApproved,
}: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await verifyManagerPin({
        pin,
        outletId,
        action,
        entityType,
        entityId,
        requestedBy: userId,
        payload,
      });
      if (!result.ok) {
        setError(result.message);
        setPin('');
        return;
      }
      setPin('');
      onApproved(result.approvalId);
    } catch (err) {
      setError((err as Error)?.message || 'PIN verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">{description}</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <label className="block text-xs font-semibold text-slate-600">
            Manager PIN
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pin.length >= 4) void submit();
              }}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-lg font-bold tracking-[0.35em] outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              placeholder="••••"
            />
          </label>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#FF6A00] text-white hover:bg-[#e55f00]"
              disabled={busy || pin.length < 4}
              onClick={() => void submit()}
            >
              {busy ? 'Checking…' : 'Approve'}
            </Button>
          </div>
          <p className="text-[10px] text-slate-400">
            First-time setup: configure PIN in Ops Settings, or bootstrap with 0000.
          </p>
        </div>
      </div>
    </div>
  );
}
