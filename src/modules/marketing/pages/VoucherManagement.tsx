import React, { useEffect, useMemo, useState } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Tag,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  X,
  Percent,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useVoucherStore } from '../store/useVoucherStore';
import type { Voucher } from '../store/useVoucherStore';

type StatusFilter = 'all' | 'active' | 'inactive';

function StatusChip({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        active
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
          : 'bg-slate-100 text-slate-500 ring-slate-600/10'
      )}
    >
      {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-orange-500/30 focus:ring-2';

export function VoucherManagement() {
  const { vouchers, isLoading, error, fetchVouchers, createVoucher, updateVoucher, deleteVoucher } =
    useVoucherStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_value: '',
    max_discount_amount: '',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    usage_limit: '',
    is_active: true,
  });

  useEffect(() => {
    void fetchVouchers();
  }, [fetchVouchers]);

  const handleOpenModal = (voucher?: Voucher) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setFormData({
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value.toString(),
        min_order_value: voucher.min_order_value ? voucher.min_order_value.toString() : '',
        max_discount_amount: voucher.max_discount_amount
          ? voucher.max_discount_amount.toString()
          : '',
        start_date: voucher.start_date
          ? voucher.start_date.slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        end_date: voucher.end_date ? voucher.end_date.slice(0, 16) : '',
        usage_limit: voucher.usage_limit ? voucher.usage_limit.toString() : '',
        is_active: voucher.is_active,
      });
    } else {
      setEditingVoucher(null);
      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_order_value: '',
        max_discount_amount: '',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: '',
        usage_limit: '',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: formData.code,
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value) || 0,
      min_order_value: formData.min_order_value ? parseFloat(formData.min_order_value) : 0,
      max_discount_amount: formData.max_discount_amount
        ? parseFloat(formData.max_discount_amount)
        : null,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit, 10) : null,
      is_active: formData.is_active,
    };

    if (editingVoucher) {
      await updateVoucher(editingVoucher.id, payload);
    } else {
      await createVoucher(payload);
    }
    setIsModalOpen(false);
  };

  const filteredVouchers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (statusFilter === 'active' && !v.is_active) return false;
      if (statusFilter === 'inactive' && v.is_active) return false;
      if (q && !v.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [vouchers, searchTerm, statusFilter]);

  const kpis = useMemo(() => {
    const active = vouchers.filter((v) => v.is_active).length;
    const redemptions = vouchers.reduce((s, v) => s + (Number(v.used_count) || 0), 0);
    const pct = vouchers.filter((v) => v.discount_type === 'percentage').length;
    return { total: vouchers.length, active, redemptions, pct };
  }, [vouchers]);

  const activeFilterCount =
    (searchTerm.trim() ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Offers & vouchers</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Create and manage promotional codes for POS and online orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-black text-orange-700">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            disabled={isLoading}
            onClick={() => void fetchVouchers()}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-xl bg-[#FF6A00] px-4 font-bold text-white hover:bg-[#e55f00]"
            onClick={() => handleOpenModal()}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create voucher
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-[12px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard
          label="Total vouchers"
          value={String(kpis.total)}
          subtitle="All codes"
          icon={Ticket}
          tone="slate"
        />
        <InventoryCard
          label="Active offers"
          value={String(kpis.active)}
          subtitle="Live in POS"
          icon={CheckCircle2}
          tone="emerald"
        />
        <InventoryCard
          label="Redemptions"
          value={String(kpis.redemptions)}
          subtitle="Times used"
          icon={Wallet}
          tone="orange"
        />
        <InventoryCard
          label="Percent deals"
          value={String(kpis.pct)}
          subtitle="vs fixed amount"
          icon={Percent}
          tone="blue"
        />
      </div>

      {filtersOpen && (
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[200px] flex-1 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Search codes
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                  placeholder="SUMMER20…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </label>
            <label className="w-full space-y-1 sm:w-40">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Status
              </span>
              <select
                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none ring-orange-500/30 focus:ring-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-200"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading && vouchers.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-16 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-100">
          Loading vouchers…
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
            <Ticket className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {vouchers.length === 0 ? 'No vouchers yet' : 'No vouchers match filters'}
          </h3>
          <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
            {vouchers.length === 0
              ? 'Create your first promo code to run campaigns at the counter.'
              : 'Clear filters or try another search.'}
          </p>
          {vouchers.length === 0 ? (
            <Button
              type="button"
              size="sm"
              className="mt-4 h-9 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e55f00]"
              onClick={() => handleOpenModal()}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create voucher
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 h-9 rounded-xl"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredVouchers.map((voucher) => (
            <article
              key={voucher.id}
              className={cn(
                'flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md',
                !voucher.is_active && 'opacity-70'
              )}
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-4">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-sm font-black tracking-wider text-slate-800">
                    <Tag className="h-3.5 w-3.5 text-[#FF6A00]" />
                    {voucher.code}
                  </div>
                  <p className="text-2xl font-black tabular-nums text-slate-900">
                    {voucher.discount_type === 'percentage'
                      ? `${voucher.discount_value}% OFF`
                      : `${formatCurrency(voucher.discount_value)} OFF`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    title="Edit"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    onClick={() => handleOpenModal(voucher)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => void deleteVoucher(voucher.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2.5 bg-slate-50/60 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Status</span>
                  <StatusChip active={voucher.is_active} />
                </div>
                <div className="flex items-center justify-between font-semibold text-slate-600">
                  <span>Min order</span>
                  <span className="font-black tabular-nums text-slate-900">
                    {formatCurrency(voucher.min_order_value || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between font-semibold text-slate-600">
                  <span>Usage</span>
                  <span className="font-black tabular-nums text-slate-900">
                    {voucher.usage_limit
                      ? `${voucher.used_count} / ${voucher.usage_limit}`
                      : `${voucher.used_count} · Unlimited`}
                  </span>
                </div>
                <div className="flex items-center justify-between font-semibold text-slate-600">
                  <span>Valid until</span>
                  <span className="font-black text-slate-900">
                    {voucher.end_date
                      ? format(new Date(voucher.end_date), 'MMM dd, yyyy')
                      : 'No expiry'}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-slate-100">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <h2 className="text-lg font-black text-slate-900">
                {editingVoucher ? 'Edit voucher' : 'Create voucher'}
              </h2>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Promo code
                  </span>
                  <input
                    required
                    className={cn(inputClass, 'font-mono text-base font-black uppercase tracking-wider')}
                    placeholder="SUMMER20"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Discount type
                  </span>
                  <select
                    className={inputClass}
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_type: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed amount (₹)</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Discount value
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Min order (₹)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={formData.min_order_value}
                    onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                  />
                </label>

                {formData.discount_type === 'percentage' ? (
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Max discount cap (₹)
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={formData.max_discount_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, max_discount_amount: e.target.value })
                      }
                    />
                  </label>
                ) : (
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Usage limit
                    </span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      className={inputClass}
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    />
                  </label>
                )}

                {formData.discount_type === 'percentage' && (
                  <label className="space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Usage limit
                    </span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      className={inputClass}
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    />
                  </label>
                )}

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Start
                  </span>
                  <input
                    required
                    type="datetime-local"
                    className={inputClass}
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    End
                  </span>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>
                    <span className="block text-sm font-black text-slate-900">Voucher is active</span>
                    <span className="text-xs font-medium text-slate-500">
                      Uncheck to disable this code immediately
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 rounded-xl bg-[#FF6A00] px-5 font-bold text-white hover:bg-[#e55f00]"
                >
                  {editingVoucher ? 'Save changes' : 'Create voucher'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
