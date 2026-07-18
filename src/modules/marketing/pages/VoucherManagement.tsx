import React, { useEffect, useState } from 'react';
import { useVoucherStore } from '../store/useVoucherStore';
import type { Voucher } from '../store/useVoucherStore';
import { Ticket, Plus, Search, Tag, Percent, Trash2, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export function VoucherManagement() {
  const { vouchers, isLoading, fetchVouchers, createVoucher, updateVoucher, deleteVoucher } = useVoucherStore();
  
  const [searchTerm, setSearchTerm] = useState('');
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
    is_active: true
  });

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleOpenModal = (voucher?: Voucher) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setFormData({
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value.toString(),
        min_order_value: voucher.min_order_value ? voucher.min_order_value.toString() : '',
        max_discount_amount: voucher.max_discount_amount ? voucher.max_discount_amount.toString() : '',
        start_date: voucher.start_date ? voucher.start_date.slice(0, 16) : new Date().toISOString().slice(0, 16),
        end_date: voucher.end_date ? voucher.end_date.slice(0, 16) : '',
        usage_limit: voucher.usage_limit ? voucher.usage_limit.toString() : '',
        is_active: voucher.is_active
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
        is_active: true
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
      max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      is_active: formData.is_active
    };

    if (editingVoucher) {
      await updateVoucher(editingVoucher.id, payload);
    } else {
      await createVoucher(payload);
    }
    
    setIsModalOpen(false);
  };

  const filteredVouchers = vouchers.filter(v => v.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-orange-500" />
            Offers & Vouchers
          </h1>
          <p className="text-slate-500 text-sm">Create and manage promotional codes for customers.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Voucher
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search promo codes..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Vouchers Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading vouchers...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVouchers.map(voucher => (
            <div key={voucher.id} className={`bg-white rounded-xl border ${voucher.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'} shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow`}>
              
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 font-mono font-bold text-slate-800 text-lg tracking-wider mb-2">
                    <Tag className="w-4 h-4 text-orange-500" />
                    {voucher.code}
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {voucher.discount_type === 'percentage' ? `${voucher.discount_value}% OFF` : `$${voucher.discount_value} OFF`}
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <button onClick={() => handleOpenModal(voucher)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteVoucher(voucher.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-5 space-y-3 flex-1 bg-slate-50/50 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Status</span>
                  {voucher.is_active ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-4 h-4" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400 font-bold"><XCircle className="w-4 h-4" /> Inactive</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Min Order</span>
                  <span className="font-bold text-slate-900">${voucher.min_order_value || '0'}</span>
                </div>
                
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Usage Limit</span>
                  <span className="font-bold text-slate-900">{voucher.usage_limit ? `${voucher.used_count} / ${voucher.usage_limit}` : `${voucher.used_count} (Unlimited)`}</span>
                </div>
                
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Valid Until</span>
                  <span className="font-bold text-slate-900">{voucher.end_date ? format(new Date(voucher.end_date), 'MMM dd, yyyy') : 'No Expiry'}</span>
                </div>
              </div>
            </div>
          ))}
          
          {filteredVouchers.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">No vouchers found</h3>
              <p className="text-slate-500">Create your first promotional code to start running campaigns.</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{editingVoucher ? 'Edit Voucher' : 'Create New Voucher'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Promo Code</label>
                  <input 
                    type="text" 
                    required
                    className="w-full border-slate-200 rounded-lg focus:ring-orange-500 focus:border-orange-500 uppercase font-mono tracking-wider font-bold text-lg"
                    placeholder="e.g. SUMMER20"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select 
                    className="w-full border-slate-200 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    value={formData.discount_type}
                    onChange={e => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Discount Value {formData.discount_type === 'percentage' ? '(%)' : '($)'}
                  </label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    className="w-full border-slate-200 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    value={formData.discount_value}
                    onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Minimum Order Value ($)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full border-slate-200 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    value={formData.min_order_value}
                    onChange={e => setFormData({ ...formData, min_order_value: e.target.value })}
                  />
                </div>

                {formData.discount_type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Max Discount Cap ($)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                      className="w-full border-slate-200 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                      value={formData.max_discount_amount}
                      onChange={e => setFormData({ ...formData, max_discount_amount: e.target.value })}
                    />
                  </div>
                )}
                
                <div className={formData.discount_type === 'fixed' ? 'col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Global Usage Limit</label>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="Leave empty for unlimited"
                    className="w-full border-slate-200 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    value={formData.usage_limit}
                    onChange={e => setFormData({ ...formData, usage_limit: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                  <input 
                    type="datetime-local" 
                    required
                    className="w-full border-slate-200 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
                  <input 
                    type="datetime-local" 
                    className="w-full border-slate-200 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div className="col-span-2 mt-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                      checked={formData.is_active}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <div>
                      <div className="font-bold text-slate-800">Voucher is Active</div>
                      <div className="text-sm text-slate-500">Uncheck to immediately disable this promo code.</div>
                    </div>
                  </label>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition-colors"
                >
                  {editingVoucher ? 'Save Changes' : 'Create Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
