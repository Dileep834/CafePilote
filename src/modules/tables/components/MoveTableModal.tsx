import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import type { Table } from '@/types';
import { getMergeGroup, getMergeLabel } from '../store/useTableStore';
import { ArrowRightLeft, Check, Users, X } from 'lucide-react';

type Props = {
  open: boolean;
  source: Table | null;
  outletTables: Table[];
  error?: string | null;
  onClose: () => void;
  onMove: (targetId: string) => Promise<boolean>;
};

export function MoveTableModal({
  open,
  source,
  outletTables,
  error,
  onClose,
  onMove,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelectedId(null);
  }, [open, source?.id]);

  const group = useMemo(
    () => (source ? getMergeGroup(outletTables, source) : []),
    [outletTables, source]
  );
  const groupLabel = group.length > 1 ? getMergeLabel(group) : source?.tableNumber;

  const candidates = useMemo(() => {
    if (!source) return [];
    return outletTables
      .filter((t) => {
        if (t.id === source.id) return false;
        if (source.mergeGroupId && t.mergeGroupId === source.mergeGroupId) return false;
        if (t.status !== 'available') return false;
        if (t.mergeGroupId) return false;
        return true;
      })
      .sort((a, b) =>
        a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
      );
  }, [outletTables, source]);

  const target = candidates.find((t) => t.id === selectedId) || null;

  if (!open || !source) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    const ok = await onMove(selectedId);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0D1B2A]/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-table-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#F3F3F8]">
          <div>
            <h2
              id="move-table-title"
              className="text-lg font-bold text-[#0D1B2A] flex items-center gap-2"
            >
              <ArrowRightLeft className="w-5 h-5" style={{ color: BRAND.orange }} />
              Move party
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Transfer guests and open bill from {groupLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Moving to
            </p>
            <p className="font-bold text-[#0D1B2A] mt-0.5">
              {groupLabel}
              <span className="text-slate-400 font-semibold mx-2">→</span>
              {target?.tableNumber || 'Select a table'}
            </p>
            {target && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {target.capacity} seats · old table goes to cleaning
              </p>
            )}
            {group.length > 1 && (
              <p className="text-[11px] text-amber-700 mt-2">
                Merged tables will unmerge; the party continues on the new table only.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Available tables
            </p>
            {candidates.length === 0 ? (
              <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center">
                No available tables to move to. Clear or finish another table first.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {candidates.map((t) => {
                  const on = selectedId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all',
                        on
                          ? 'border-[#FF6A00] bg-orange-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div>
                        <p className="font-bold text-[#0D1B2A]">{t.tableNumber}</p>
                        <p className="text-[11px] text-slate-500 capitalize">
                          {t.capacity} seats · {t.type}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'w-6 h-6 rounded-lg border flex items-center justify-center',
                          on ? 'bg-[#FF6A00] border-[#FF6A00] text-white' : 'border-slate-300'
                        )}
                      >
                        {on && <Check className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !selectedId}
              className="flex-1 h-11 rounded-xl text-white font-bold"
              style={{ backgroundColor: BRAND.orange }}
            >
              {saving ? 'Moving…' : 'Move party'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
