import React, { useEffect, useState } from 'react';
import { useFranchiseStore } from '../store/useFranchiseStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { getPlanLimits } from '@/lib/planLimits';
import { BRAND } from '@/constants';
import { PERMISSIONS } from '@/constants/permissions';
import { Store, Plus, MapPin, Hash, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import dayjs from 'dayjs';
import { OutletFloorPlanMapper } from '@/modules/floordesigner/components/OutletFloorPlanMapper';
import { useNavigate } from 'react-router-dom';
import { useHasPermission } from '@/hooks/useHasPermission';

export function FranchiseManagement() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canManageOutlets = useHasPermission(PERMISSIONS.FRANCHISE_MANAGE);
  const { outlets, isLoading, error, fetchOutlets, addOutlet, toggleOutletStatus } =
    useFranchiseStore();
  const companyId = useTenantStore((s) => s.companyId);
  const companyName = useTenantStore((s) => s.companyName);
  const planId = useTenantStore((s) => s.planId);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const setActiveOutletId = useTenantStore((s) => s.setActiveOutletId);
  const hydrateTenant = useTenantStore((s) => s.hydrateFromUser);
  const plan = getPlanLimits(planId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hydrateTenant(user);
  }, [user, hydrateTenant]);

  useEffect(() => {
    void fetchOutlets(companyId);
  }, [fetchOutlets, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) return;
    setBusy(true);
    const created = await addOutlet({
      name: formData.name.trim(),
      location: formData.location.trim(),
      companyId: companyId || undefined,
    });
    setBusy(false);
    if (!created) return;
    setIsModalOpen(false);
    setFormData({ name: '', location: '' });
  };

  if (!canManageOutlets) {
    return (
      <div className="p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-8 max-w-lg mx-auto shadow-sm">
          <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>
            You do not have permission to manage outlets / branches. Your assigned branch is
            selected in the header.
          </p>
        </div>
      </div>
    );
  }

  const activeCount = outlets.filter((o) => o.is_active).length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A] flex items-center gap-2">
            <Store className="w-6 h-6" style={{ color: BRAND.orange }} />
            Outlets / Branches
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {companyName || 'Company'} · each branch has its own floor plan & tables
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {plan.label} plan · {activeCount}/{plan.maxOutlets} active branches
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-11 px-4 rounded-xl font-bold text-white flex items-center gap-2 shadow-sm"
          style={{ backgroundColor: BRAND.orange }}
        >
          <Plus className="w-5 h-5" />
          New outlet
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 flex items-start gap-3 min-w-0">
        <Building2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: BRAND.navy }} />
        <p className="flex-1 min-w-0">
          Use the header branch switcher for day-to-day work. Floor Designer and Table Management
          always load the <strong>active outlet</strong>.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading outlets…</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 font-medium">{error}</div>
        ) : outlets.length === 0 ? (
          <div className="p-12 text-center">
            <Store className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No outlets yet</h3>
            <p className="text-slate-500 mb-6">Add your first cafe location (branch).</p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl font-bold text-white inline-flex items-center gap-2"
              style={{ backgroundColor: BRAND.navy }}
            >
              <Plus className="w-5 h-5" />
              Add outlet
            </button>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-4 font-semibold">Code</th>
                    <th className="px-6 py-4 font-semibold">Outlet / branch</th>
                    <th className="px-6 py-4 font-semibold">Location</th>
                    <th className="px-6 py-4 font-semibold">Created</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outlets.map((outlet) => {
                    const isActiveBranch = outlet.id === activeOutletId;
                    return (
                      <tr
                        key={outlet.id}
                        className={
                          isActiveBranch ? 'bg-orange-50/40' : 'hover:bg-slate-50 transition-colors'
                        }
                      >
                        <td className="px-6 py-4">
                          <div
                            className="flex items-center gap-1.5 font-mono text-sm font-bold px-2 py-1 rounded-md w-fit"
                            style={{ color: BRAND.navy, backgroundColor: '#F3F3F8' }}
                          >
                            <Hash className="w-3.5 h-3.5" />
                            {outlet.code}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {outlet.name}
                            {isActiveBranch && (
                              <span
                                className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white"
                                style={{ backgroundColor: BRAND.orange }}
                              >
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{outlet.location || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                          {dayjs(outlet.created_at).format('MMM D, YYYY')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              outlet.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {outlet.is_active ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {outlet.is_active ? 'Open' : 'Closed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {outlet.is_active && !isActiveBranch && (
                            <button
                              type="button"
                              onClick={() => setActiveOutletId(outlet.id)}
                              className="text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
                              style={{ color: BRAND.navy }}
                            >
                              Switch here
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void toggleOutletStatus(outlet.id, outlet.is_active)}
                            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              outlet.is_active
                                ? 'text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {outlet.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col divide-y divide-slate-100">
              {outlets.map((outlet) => {
                const isActiveBranch = outlet.id === activeOutletId;
                return (
                  <div key={outlet.id} className={`p-4 ${isActiveBranch ? 'bg-orange-50/40' : 'bg-white hover:bg-slate-50 transition-colors'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-bold text-slate-800 flex items-center gap-2 text-base">
                        {outlet.name}
                        {isActiveBranch && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: BRAND.orange }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-1.5 font-mono text-xs font-bold px-1.5 py-0.5 rounded-md w-fit"
                        style={{ color: BRAND.navy, backgroundColor: '#F3F3F8' }}
                      >
                        <Hash className="w-3.5 h-3.5" />
                        {outlet.code}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm text-slate-600 font-medium mb-3">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{outlet.location || '—'}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-4">
                      <div className="text-slate-600 font-medium">
                        {dayjs(outlet.created_at).format('MMM D, YYYY')}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          outlet.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {outlet.is_active ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {outlet.is_active ? 'Open' : 'Closed'}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
                      {outlet.is_active && !isActiveBranch && (
                        <button
                          type="button"
                          onClick={() => setActiveOutletId(outlet.id)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                          style={{ color: BRAND.navy }}
                        >
                          Switch here
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void toggleOutletStatus(outlet.id, outlet.is_active)}
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${
                          outlet.is_active
                            ? 'text-rose-600 bg-rose-50'
                            : 'text-emerald-600 bg-emerald-50'
                        }`}
                      >
                        {outlet.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <OutletFloorPlanMapper
        outlets={outlets.filter((o) => o.is_active).map((o) => ({
          id: o.id,
          name: o.name,
          code: o.code,
        }))}
        companyId={companyId}
        onApplied={(outletId) => {
          setActiveOutletId(outletId);
          navigate('/erp/floor');
        }}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D1B2A]/45 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#F3F3F8]">
              <h2 className="text-lg font-bold text-[#0D1B2A]">New outlet / branch</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
              {error && (
                <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Counts toward {plan.label}: {activeCount}/{plan.maxOutlets} branches.
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Outlet name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Downtown Cafe"
                  className="w-full h-10 border border-slate-200 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Location *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Street address / city"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30 resize-none"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 h-11 text-white rounded-xl font-bold disabled:opacity-50"
                  style={{ backgroundColor: BRAND.orange }}
                >
                  {busy ? 'Creating…' : 'Create outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
