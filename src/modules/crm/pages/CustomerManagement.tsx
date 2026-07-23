import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Star,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Search,
  Radio,
  RefreshCw,
  MapPin,
  Gift,
  TrendingUp,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useCrmStore } from '../store/useCrmStore';

dayjs.extend(relativeTime);

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
      {active ? 'Eligible' : 'Banned'}
    </span>
  );
}

export function CustomerManagement() {
  const {
    customers,
    liveGuests,
    isLoading,
    liveLoading,
    error,
    fetchCustomers,
    fetchLiveGuests,
    addCustomer,
    toggleCustomerStatus,
  } = useCrmStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    void fetchCustomers();
    void fetchLiveGuests();
    const timer = window.setInterval(() => void fetchLiveGuests(), 20000);
    return () => window.clearInterval(timer);
  }, [fetchCustomers, fetchLiveGuests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;
    await addCustomer(formData);
    setIsModalOpen(false);
    setFormData({ name: '', phone: '', email: '' });
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'banned' && c.is_active) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    });
  }, [customers, searchQuery, statusFilter]);

  const crmStats = useMemo(
    () => ({
      totalCustomers: customers.length,
      activeCustomers: customers.filter((c) => c.is_active).length,
      liveGuests: liveGuests.length,
      loyaltyPoints: customers.reduce((sum, c) => sum + (Number(c.loyalty_points) || 0), 0),
      lifetimeSpend: customers.reduce((sum, c) => sum + (Number(c.total_spend) || 0), 0),
      vipCustomers: customers.filter((c) => Number(c.total_spend) >= 5000).length,
    }),
    [customers, liveGuests]
  );

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">CRM / Guests</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Live dine-in guests plus your customer directory and loyalty.
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
            disabled={liveLoading || isLoading}
            onClick={() => {
              void fetchCustomers();
              void fetchLiveGuests();
            }}
          >
            <RefreshCw
              className={cn('mr-1.5 h-3.5 w-3.5', (liveLoading || isLoading) && 'animate-spin')}
            />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-xl bg-[#FF6A00] px-4 font-bold text-white hover:bg-[#e55f00]"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add customer
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-[12px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-6 lg:gap-3">
        <InventoryCard
          label="Customers"
          value={String(crmStats.totalCustomers)}
          subtitle="Directory"
          icon={Users}
          tone="slate"
        />
        <InventoryCard
          label="Live guests"
          value={String(crmStats.liveGuests)}
          subtitle="Signed in now"
          icon={Radio}
          tone="emerald"
        />
        <InventoryCard
          label="Eligible"
          value={String(crmStats.activeCustomers)}
          subtitle="Active profiles"
          icon={CheckCircle2}
          tone="blue"
        />
        <InventoryCard
          label="Reward points"
          value={String(crmStats.loyaltyPoints)}
          subtitle="Loyalty balance"
          icon={Star}
          tone="amber"
        />
        <InventoryCard
          label="Lifetime spend"
          value={formatCurrency(crmStats.lifetimeSpend)}
          subtitle="All customers"
          icon={TrendingUp}
          tone="orange"
        />
        <InventoryCard
          label="VIP guests"
          value={String(crmStats.vipCustomers)}
          subtitle="Spend ≥ ₹5,000"
          icon={Gift}
          tone="red"
        />
      </div>

      {filtersOpen && (
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[200px] flex-1 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Search directory
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                  placeholder="Name, phone, email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="all">All</option>
                <option value="active">Eligible</option>
                <option value="banned">Banned</option>
              </select>
            </label>
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-200"
                onClick={() => {
                  setSearchQuery('');
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

      {/* Live guests */}
      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h2 className="text-base font-black text-slate-900">Signed in now</h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
              {liveGuests.length}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl border-slate-200"
            disabled={liveLoading}
            onClick={() => void fetchLiveGuests()}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', liveLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {liveLoading && liveGuests.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">Checking live sessions…</div>
        ) : liveGuests.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Radio className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">No guests signed in</h3>
            <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
              Guests who scan a QR and sign in appear here. If this stays empty, run{' '}
              <code className="rounded bg-slate-100 px-1 text-xs">guest_sessions_schema.sql</code>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Guest</th>
                  <th className="px-4 py-2.5">Table</th>
                  <th className="px-4 py-2.5">Signed in</th>
                  <th className="px-4 py-2.5">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {liveGuests.map((g) => (
                  <tr
                    key={g.id}
                    className="border-t border-slate-50 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-slate-900">{g.guest_name || 'Guest'}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                        <Mail className="h-3 w-3" />
                        {g.guest_email}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                        <MapPin className="h-3.5 w-3.5 text-[#FF6A00]" />
                        {g.table_number || '—'}
                      </span>
                      <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                        {g.provider || 'email'}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-600">
                      {dayjs(g.started_at).format('h:mm A')}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{dayjs(g.last_seen_at).fromNow()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Directory */}
      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-base font-black text-slate-900">Customer directory</h2>
          <p className="text-sm font-medium text-slate-500">
            Showing {filteredCustomers.length} of {customers.length}
          </p>
        </div>

        {isLoading && customers.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">Loading customers…</div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">No customers yet</h3>
            <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
              QR sign-ins are added automatically, or add a profile manually.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-4 h-9 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e55f00]"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add customer
            </Button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h3 className="text-base font-black text-slate-900">No customers match filters</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 h-9 rounded-xl"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400 backdrop-blur">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5 text-center">Loyalty</th>
                  <th className="px-4 py-2.5 text-right">Lifetime spend</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-t border-slate-50 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-slate-900">{customer.name}</p>
                      <p className="text-[11px] text-slate-400">
                        Joined {dayjs(customer.created_at).format('MMM YYYY')}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 space-y-1">
                      {customer.phone ? (
                        <p className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {customer.phone}
                        </p>
                      ) : null}
                      {customer.email ? (
                        <p className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {customer.email}
                        </p>
                      ) : null}
                      {!customer.phone && !customer.email ? (
                        <span className="italic text-slate-400">No contact</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-inset ring-amber-600/15">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {customer.loyalty_points}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-black tabular-nums text-slate-900">
                      {formatCurrency(customer.total_spend)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusChip active={customer.is_active} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-8 rounded-xl',
                          customer.is_active
                            ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        )}
                        onClick={() => void toggleCustomerStatus(customer.id, customer.is_active)}
                      >
                        {customer.is_active ? 'Ban' : 'Unban'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-black text-slate-900">Register customer</h2>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 p-5">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Full name *
                </span>
                <input
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Phone *
                </span>
                <input
                  required
                  type="tel"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Email
                </span>
                <input
                  type="email"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </label>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 flex-1 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e55f00]"
                >
                  Save profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
