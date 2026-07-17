import React, { useEffect, useState } from 'react';
import { useCrmStore } from '../store/useCrmStore';
import { Users, Plus, Star, Phone, Mail, CheckCircle2, XCircle, Search } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import dayjs from 'dayjs';

export function CustomerManagement() {
  const { customers, isLoading, error, fetchCustomers, addCustomer, toggleCustomerStatus } = useCrmStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;
    
    await addCustomer(formData);
    setIsModalOpen(false);
    setFormData({ name: '', phone: '', email: '' });
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            Customer Directory
          </h1>
          <p className="text-slate-500 text-sm">Manage your loyal patrons and view their lifetime value</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search customers..."
              className="pl-9 border-slate-200 rounded-lg text-sm focus:ring-purple-600 focus:border-purple-600 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading customers...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-medium">{error}</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Customers Yet</h3>
            <p className="text-slate-500 mb-6">Build your CRM by adding your first loyal customer.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-200 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                      {!customer.phone && !customer.email && <span className="text-slate-400 italic text-sm">No contact info</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5 font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full w-20">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {customer.loyalty_points}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-black text-slate-900">{formatCurrency(customer.total_spend)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${customer.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {customer.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {customer.is_active ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
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
        )}
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Register Customer</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. John Doe"
                  className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600 shadow-sm"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input 
                  required
                  type="tel" 
                  placeholder="e.g. 555-0192"
                  className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600 shadow-sm"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
                <input 
                  type="email" 
                  placeholder="e.g. john@example.com"
                  className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600 shadow-sm"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
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
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
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
