import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Table, TableStatus, TableType } from '@/types';
import type { TableFormInput } from '../store/useTableStore';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  mode: 'add' | 'edit';
  initial?: Table | null;
  defaultOutletId: string;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: TableFormInput) => Promise<boolean>;
};

const TYPES: { value: TableType; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'round', label: 'Round' },
  { value: 'sofa', label: 'Sofa' },
];

const STATUSES: TableStatus[] = ['available', 'occupied', 'reserved', 'cleaning'];

export function TableFormModal({
  open,
  mode,
  initial,
  defaultOutletId,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [tableNumber, setTableNumber] = useState('T-01');
  const [capacity, setCapacity] = useState(4);
  const [type, setType] = useState<TableType>('square');
  const [status, setStatus] = useState<TableStatus>('available');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setTableNumber(initial.tableNumber);
      setCapacity(initial.capacity);
      setType(initial.type);
      setStatus(initial.status);
    } else {
      setTableNumber('');
      setCapacity(4);
      setType('square');
      setStatus('available');
    }
  }, [open, mode, initial]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit({
      outletId: initial?.outletId || defaultOutletId,
      tableNumber,
      capacity: Math.max(1, Math.min(50, Number(capacity) || 1)),
      type,
      status,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0D1B2A]/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-form-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#F3F3F8]">
          <div>
            <h2 id="table-form-title" className="text-lg font-bold text-[#0D1B2A]">
              {mode === 'add' ? 'Add table' : 'Edit table'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'add' ? 'Create a floor table for dine-in & QR' : 'Update table details'}
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
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Table number</label>
            <Input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. T-07"
              className="mt-1.5 h-11 rounded-xl"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Capacity</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="mt-1.5 h-11 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Shape</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`h-11 rounded-xl text-sm font-bold border transition-colors ${
                    type === t.value
                      ? 'bg-[#FF6A00] text-white border-[#FF6A00]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'edit' && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`h-10 rounded-xl text-xs font-bold capitalize border transition-colors ${
                      status === s
                        ? 'bg-[#0D1B2A] text-white border-[#0D1B2A]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !tableNumber.trim()}
              className="flex-1 h-11 rounded-xl bg-[#FF6A00] hover:bg-[#e55f00] text-white font-bold"
            >
              {saving ? 'Saving…' : mode === 'add' ? 'Add table' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
