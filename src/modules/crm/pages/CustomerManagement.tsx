import React, { useEffect, useState } from 'react';
import { useCrmStore } from '../store/useCrmStore';
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
  Calendar,
  MessageSquare,
  Gift,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { BRAND } from '@/constants';

dayjs.extend(relativeTime);

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

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const crmStats = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter((customer) => customer.is_active).length,
    liveGuests: liveGuests.length,
    loyaltyPoints: customers.reduce((sum, customer) => sum + (Number(customer.loyalty_points) || 0), 0),
    lifetimeSpend: customers.reduce((sum, customer) => sum + (Number(customer.total_spend) || 0), 0),
    vipCustomers: customers.filter((customer) => Number(customer.total_spend) >= 5000).length,
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: BRAND.orange }} />
            Customers
          </h1>
          <p className="text-slate-500 text-sm">
            Live dine-in guests plus your CRM directory
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search directory…"
              className="pl-9 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 w-56 md:w-64 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-white px-4 py-2 rounded-lg font-medium hover:opacity-95 transition-colors flex items-center gap-2 shadow-sm h-10"
            style={{ backgroundColor: BRAND.orange }}
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        {[
          { label: 'Customers', value: crmStats.totalCustomers, icon: Users, tone: 'bg-slate-50 text-slate-700' },
          { label: 'Live guests', value: crmStats.liveGuests, icon: Radio, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Eligible', value: crmStats.activeCustomers, icon: CheckCircle2, tone: 'bg-green-50 text-green-700' },
          { label: 'Reward points', value: crmStats.loyaltyPoints, icon: Star, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Lifetime spend', value: formatCurrency(crmStats.lifetimeSpend), icon: TrendingUp, tone: 'bg-orange-50 text-orange-700' },
          { label: 'VIP guests', value: crmStats.vipCustomers, icon: Gift, tone: 'bg-sky-50 text-sky-700' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="truncate text-[11px] font-black uppercase tracking-wider text-slate-400">{stat.label}</p>
            <p className="truncate text-lg font-black text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {[
          { label: 'Birthday reminders', value: 'This week', icon: Calendar },
          { label: 'WhatsApp follow-up', value: `${crmStats.liveGuests} live tables`, icon: MessageSquare },
          { label: 'Favorite items', value: 'From order history', icon: Star },
          { label: 'Visit frequency', value: 'Auto ranked', icon: TrendingUp },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm">
              <item.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-800">{item.label}</p>
              <p className="truncate text-xs font-semibold text-slate-500">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-600" />
              Signed in now
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {liveGuests.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void fetchLiveGuests()}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            disabled={liveLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${liveLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {liveLoading && liveGuests.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">Checking live sessions…</div>
        ) : liveGuests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-slate-600">No guests signed in at tables</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              When a customer scans a QR and signs in (Google or email), they appear here. If this
              stays empty after a guest login, run{' '}
              <code className="bg-slate-100 px-1 rounded">scripts/guest_sessions_schema.sql</code>{' '}
              in Supabase.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3 font-semibold">Guest</th>
                    <th className="px-5 py-3 font-semibold">Table</th>
                    <th className="px-5 py-3 font-semibold">Signed in</th>
                    <th className="px-5 py-3 font-semibold">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {liveGuests.map((g) => (
                    <tr key={g.id} className="hover:bg-emerald-50/40">
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-800">{g.guest_name || 'Guest'}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {g.guest_email}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          {g.table_number || '—'}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                          {g.provider || 'email'}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {dayjs(g.started_at).format('h:mm A')}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {dayjs(g.last_seen_at).fromNow()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View for Live Guests */}
            <div className="md:hidden flex flex-col divide-y divide-slate-50">
              {liveGuests.map((g) => (
                <div key={g.id} className="p-4 hover:bg-emerald-50/40 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800">{g.guest_name || 'Guest'}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {g.guest_email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        {g.table_number || '—'}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                        {g.provider || 'email'}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="text-slate-600">
                      <span className="font-semibold text-slate-500">In: </span>
                      {dayjs(g.started_at).format('h:mm A')}
                    </div>
                    <div className="text-slate-500">
                      <span className="font-semibold text-slate-500">Seen: </span>
                      {dayjs(g.last_seen_at).fromNow()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-2 px-0.5">Customer directory</h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 font-medium">Loading customers…</div>
          ) : error && customers.length === 0 && liveGuests.length === 0 ? (
            <div className="p-8 text-center text-red-500 font-medium">{error}</div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No customers in directory yet</h3>
              <p className="text-slate-500 mb-6 text-sm">
                Guests who sign in via QR are added automatically. You can also add manually.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="bg-orange-50 text-orange-700 px-4 py-2 rounded-lg font-medium hover:bg-orange-100 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Customer
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Contact Info</th>
                      <th className="px-6 py-4 font-semibold text-center">Loyalty Points</th>
                      <th className="px-6 py-4 font-semibold text-right">Lifetime Spend</th>
                      <th className="px-6 py-4 font-semibold text-center">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{customer.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Joined {dayjs(customer.created_at).format('MMM YYYY')}
                          </div>
                        </td>
                        <td className="px-6 py-4 space-y-1">
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                              <Phone className="w-4 h-4 text-slate-400" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Mail className="w-4 h-4 text-slate-400" />
                              {customer.email}
                            </div>
                          )}
                          {!customer.phone && !customer.email && (
                            <span className="text-slate-400 italic text-sm">No contact info</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5 font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full w-20">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            {customer.loyalty_points}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-black text-slate-900">
                            {formatCurrency(customer.total_spend)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              customer.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {customer.is_active ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {customer.is_active ? 'Eligible' : 'Banned'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleCustomerStatus(customer.id, customer.is_active)}
                            className={`text-sm font-medium px-3 py-1.5 rounded transition-colors ${
                              customer.is_active
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {customer.is_active ? 'Ban' : 'Unban'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden flex flex-col divide-y divide-slate-100">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-slate-800 text-base">{customer.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Joined {dayjs(customer.created_at).format('MMM YYYY')}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          customer.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {customer.is_active ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {customer.is_active ? 'Eligible' : 'Banned'}
                      </span>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                          <Phone className="w-4 h-4 text-slate-400" />
                          {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {customer.email}
                        </div>
                      )}
                      {!customer.phone && !customer.email && (
                        <span className="text-slate-400 italic text-sm">No contact info</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg mb-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 font-semibold mb-0.5">Loyalty</span>
                        <div className="inline-flex items-center gap-1 font-bold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {customer.loyalty_points}
                        </div>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-xs text-slate-500 font-semibold mb-0.5">Lifetime Spend</span>
                        <div className="font-black text-slate-900">
                          {formatCurrency(customer.total_spend)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-50">
                      <button
                        type="button"
                        onClick={() => toggleCustomerStatus(customer.id, customer.is_active)}
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-colors ${
                          customer.is_active
                            ? 'text-red-600 bg-red-50'
                            : 'text-green-600 bg-green-50'
                        }`}
                      >
                        {customer.is_active ? 'Ban' : 'Unban'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Register Customer</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 shadow-sm h-10 px-3"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  required
                  type="tel"
                  placeholder="e.g. 555-0192"
                  className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 shadow-sm h-10 px-3"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  className="w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 shadow-sm h-10 px-3"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 text-white px-4 py-2 rounded-lg font-medium hover:opacity-95 transition-colors"
                  style={{ backgroundColor: BRAND.orange }}
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
