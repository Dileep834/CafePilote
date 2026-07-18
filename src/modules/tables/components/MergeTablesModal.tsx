import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';
import type { Table } from '@/types';
import {
  getCombinedCapacity,
  getMergeGroup,
  getMergeLabel,
} from '../store/useTableStore';
import { Check, Combine, Users, X } from 'lucide-react';

type Props = {
  open: boolean;
  primary: Table | null;
  outletTables: Table[];
  error?: string | null;
  onClose: () => void;
  onMerge: (partnerIds: string[]) => Promise<boolean>;
};

export function MergeTablesModal({
  open,
  primary,
  outletTables,
  error,
  onClose,
  onMerge,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelected([]);
  }, [open, primary?.id]);

  const candidates = useMemo(() => {
    if (!primary) return [];
    return outletTables.filter((t) => {
      if (t.id === primary.id) return false;
      if (t.status === 'cleaning') return false;
      // Already in this same merge group — skip
      if (primary.mergeGroupId && t.mergeGroupId === primary.mergeGroupId) return false;
      // In another merge — skip
      if (t.mergeGroupId) return false;
      return true;
    });
  }, [outletTables, primary]);

  const previewGroup = useMemo(() => {
    if (!primary) return [];
    const current = getMergeGroup(outletTables, primary);
    const extras = candidates.filter((t) => selected.includes(t.id));
    const map = new Map<string, Table>();
    [...current, ...extras].forEach((t) => map.set(t.id, t));
    return [...map.values()].sort((a, b) =>
      a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
    );
  }, [primary, outletTables, candidates, selected]);

  if (!open || !primary) return null;

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0) return;
    setSaving(true);
    const ok = await onMerge(selected);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0D1B2A]/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-tables-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#F3F3F8]">
          <div>
            <h2 id="merge-tables-title" className="text-lg font-bold text-[#0D1B2A] flex items-center gap-2">
              <Combine className="w-5 h-5" style={{ color: BRAND.orange }} />
              Merge tables
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Combine seats for a larger party with {primary.tableNumber}
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
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Preview</p>
            <p className="font-bold text-[#0D1B2A] mt-0.5">
              {getMergeLabel(previewGroup) || primary.tableNumber}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              Combined capacity: {getCombinedCapacity(previewGroup)} seats
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select tables to add
            </p>
            {candidates.length === 0 ? (
              <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center">
                No free tables available to merge. Unmerge another group or finish cleaning first.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {candidates.map((t) => {
                  const on = selected.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle(t.id)}
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
                          {t.capacity} seats · {t.status}
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
              disabled={saving || selected.length === 0}
              className="flex-1 h-11 rounded-xl text-white font-bold"
              style={{ backgroundColor: BRAND.orange }}
            >
              {saving ? 'Merging…' : `Merge ${selected.length || ''}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
