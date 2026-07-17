import React, { useEffect, useState } from 'react';
import { useFranchiseStore } from '../store/useFranchiseStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Store, Plus, MapPin, Hash, CheckCircle2, XCircle } from 'lucide-react';
import dayjs from 'dayjs';

export function FranchiseManagement() {
  const { user } = useAuthStore();
  const { outlets, isLoading, error, addOutlet, toggleOutletStatus } = useFranchiseStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '' });

  useEffect(() => {
    fetchOutlets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) return;
    
    await addOutlet(formData);
    setIsModalOpen(false);
    setFormData({ name: '', location: '' });
  };

  if (user?.role !== 'Super Admin' && user?.role !== 'Admin') {
    return (
      <div className="p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-8 max-w-lg mx-auto shadow-sm">
          <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>You do not have permission to view or manage franchise branches. Only Super Admins can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Store className="w-6 h-6 text-purple-600" />
            Franchise & Branch Management
          </h1>
          <p className="text-slate-500 text-sm">Manage all cafe locations across your network</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Branch
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading branches...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-medium">{error}</div>
        ) : outlets.length === 0 ? (
          <div className="p-12 text-center">
            <Store className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Branches Setup</h3>
            <p className="text-slate-500 mb-6">Start by adding your first cafe location.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-200 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Branch
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold">Branch Code</th>
                  <th className="px-6 py-4 font-semibold">Branch Name</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Created Date</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outlets.map((outlet) => (
                  <tr key={outlet.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md w-fit">
                        <Hash className="w-3.5 h-3.5" />
                        {outlet.code}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{outlet.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{outlet.location || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {dayjs(outlet.created_at).format('MMM D, YYYY')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${outlet.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {outlet.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {outlet.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleOutletStatus(outlet.id, outlet.is_active)}
                        className={`text-sm font-medium px-3 py-1.5 rounded transition-colors ${
                          outlet.is_active 
                            ? 'text-red-600 hover:bg-red-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {outlet.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Branch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">New Branch Location</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Branch Name *</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Downtown Cafe"
                  className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600 shadow-sm"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Physical Location *</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Full street address..."
                  className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600 shadow-sm resize-none"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
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
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
