import React, { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import type { PrinterSize, TableViewMode, TableBoardLayout } from '../store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { PLAN_LIMITS, type SubscriptionPlanId } from '@/lib/planLimits';
import { Settings, Printer, Store, Save, FileText, CheckCircle2, Shield, LayoutGrid, Map, List, CreditCard } from 'lucide-react';
import { ThermalReceipt } from '../../pos/components/ThermalReceipt';
import { RolesPermissions } from '../components/RolesPermissions';
import { BRAND, HQ_COMPANY_NAME } from '@/constants';
import { PERMISSIONS } from '@/constants/permissions';
import { cn } from '@/lib/utils';
import { OutletFloorPlanMapper } from '@/modules/floordesigner/components/OutletFloorPlanMapper';
import { useNavigate } from 'react-router-dom';
import { isSuperAdmin } from '@/lib/access';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useHasPermission } from '@/hooks/useHasPermission';

export function SystemSettings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canManageSettings = useHasPermission(PERMISSIONS.SETTINGS_MANAGE);
  const settings = useSettingsStore();
  const planId = useTenantStore((s) => s.planId);
  const setPlanId = useTenantStore((s) => s.setPlanId);
  const companyName = useTenantStore((s) => s.companyName);
  const companyId = useTenantStore((s) => s.companyId);
  const outlets = useTenantStore((s) => s.outlets);
  const [formData, setFormData] = useState({
    printerSize: settings.printerSize,
    cafeName: settings.cafeName,
    cafeAddress: settings.cafeAddress,
    cafePhone: settings.cafePhone,
    taxNumber: settings.taxNumber,
    receiptFooterMessage: settings.receiptFooterMessage,
    tableViewMode: settings.tableViewMode,
    tableBoardLayout: settings.tableBoardLayout,
  });
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'permissions'>('general');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    settings.updateSettings(formData);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (!canManageSettings) {
    return (
      <div className="p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-8 max-w-lg mx-auto shadow-sm">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>You do not have permission to view system settings.</p>
        </div>
      </div>
    );
  }

  const displayCompany =
    isSuperAdmin(user) ? HQ_COMPANY_NAME : companyName || user?.companyId || '—';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-600" />
            System Configuration
          </h1>
          <p className="text-slate-500 text-sm">Manage global preferences and staff access levels.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'general'
              ? 'border-orange-600 text-orange-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Store className="w-4 h-4" />
          General & Receipts
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'permissions'
              ? 'border-orange-600 text-orange-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Roles & Permissions
        </button>
      </div>

      {activeTab === 'general' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Form */}
          <form onSubmit={handleSave} className="space-y-6 lg:col-span-2">

          {/* Receipt & Printer Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-800">Printer & Receipt Format</h2>
          </div>

          <div className="p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">POS Thermal Printer Size</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* 58mm Option */}
              <label className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                formData.printerSize === '58mm' ? 'border-orange-600 bg-orange-50/50' : 'border-slate-200 hover:border-orange-200'
              }`}>
                <input
                  type="radio"
                  name="printerSize"
                  value="58mm"
                  className="sr-only"
                  checked={formData.printerSize === '58mm'}
                  onChange={() => setFormData({ ...formData, printerSize: '58mm' })}
                />
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-slate-800">58mm Receipt</div>
                  {formData.printerSize === '58mm' && <CheckCircle2 className="w-5 h-5 text-orange-600" />}
                </div>
                <p className="text-xs text-slate-500">Compact thermal printers. Perfect for quick-service and small counters.</p>
              </label>

              {/* 80mm Option */}
              <label className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                formData.printerSize === '80mm' ? 'border-orange-600 bg-orange-50/50' : 'border-slate-200 hover:border-orange-200'
              }`}>
                <input
                  type="radio"
                  name="printerSize"
                  value="80mm"
                  className="sr-only"
                  checked={formData.printerSize === '80mm'}
                  onChange={() => setFormData({ ...formData, printerSize: '80mm' })}
                />
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-slate-800">80mm Receipt</div>
                  {formData.printerSize === '80mm' && <CheckCircle2 className="w-5 h-5 text-orange-600" />}
                </div>
                <p className="text-xs text-slate-500">Standard restaurant thermal printers. Wide format with more detail.</p>
              </label>

              {/* Standard A4 Option */}
              <label className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                formData.printerSize === 'standard' ? 'border-orange-600 bg-orange-50/50' : 'border-slate-200 hover:border-orange-200'
              }`}>
                <input
                  type="radio"
                  name="printerSize"
                  value="standard"
                  className="sr-only"
                  checked={formData.printerSize === 'standard'}
                  onChange={() => setFormData({ ...formData, printerSize: 'standard' })}
                />
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-slate-800">Standard A4/Letter</div>
                  {formData.printerSize === 'standard' && <CheckCircle2 className="w-5 h-5 text-orange-600" />}
                </div>
                <p className="text-xs text-slate-500">Full page printing. Usually for office or wholesale environments.</p>
              </label>
            </div>
          </div>
        </div>

        {/* Business Details Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-800">Receipt Header & Footer</h2>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Business / Cafe Name</label>
              <input
                type="text"
                className="w-full border-slate-200 rounded-lg focus:ring-orange-600 focus:border-orange-600"
                value={formData.cafeName}
                onChange={e => setFormData({ ...formData, cafeName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tax / GST Number</label>
              <input
                type="text"
                className="w-full border-slate-200 rounded-lg focus:ring-orange-600 focus:border-orange-600"
                value={formData.taxNumber}
                onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Business Phone Number</label>
              <input
                type="text"
                className="w-full border-slate-200 rounded-lg focus:ring-orange-600 focus:border-orange-600"
                value={formData.cafePhone}
                onChange={e => setFormData({ ...formData, cafePhone: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Business Address</label>
              <textarea
                rows={2}
                className="w-full border-slate-200 rounded-lg focus:ring-orange-600 focus:border-orange-600"
                value={formData.cafeAddress}
                onChange={e => setFormData({ ...formData, cafeAddress: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Receipt Footer Message</label>
              <input
                type="text"
                placeholder="e.g. Thank you for your visit!"
                className="w-full border-slate-200 rounded-lg focus:ring-orange-600 focus:border-orange-600"
                value={formData.receiptFooterMessage}
                onChange={e => setFormData({ ...formData, receiptFooterMessage: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Subscription / tenant */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <CreditCard className="w-5 h-5" style={{ color: BRAND.orange }} />
            <h2 className="text-lg font-bold text-slate-800">Subscription & branches</h2>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-sm text-slate-500">
              Company: <span className="font-bold text-slate-800">{displayCompany}</span>
              {' · '}
              {outlets.length} branch{outlets.length === 1 ? '' : 'es'} loaded
            </p>
            <p className="text-xs text-slate-500">
              Floor plans and tables are scoped to the active branch (header switcher). Plan limits
              block extra floors/tables when you hit the quota.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.keys(PLAN_LIMITS) as SubscriptionPlanId[]).map((id) => {
                const p = PLAN_LIMITS[id];
                const on = planId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPlanId(id)}
                    className={cn(
                      'text-left border-2 rounded-xl p-4 transition-all',
                      on ? 'border-[#FF6A00] bg-orange-50/40' : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-slate-800">{p.label}</p>
                      {on && <CheckCircle2 className="w-5 h-5" style={{ color: BRAND.orange }} />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {p.maxOutlets} branches · {p.maxFloorsPerOutlet} floors · {p.maxTablesPerOutlet}{' '}
                      tables/branch
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400">
              Demo: plan is stored locally (and in company_subscriptions when that SQL is applied).
            </p>
          </div>
        </div>

        <ErrorBoundary area="floor plan mapper">
          <OutletFloorPlanMapper
            outlets={outlets.map((o) => ({ id: o.id, name: o.name }))}
            companyId={companyId}
            onApplied={() => navigate('/erp/floor')}
          />
        </ErrorBoundary>

        {/* Table view preference */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" style={{ color: BRAND.orange }} />
            <h2 className="text-lg font-bold text-slate-800">Table Management view</h2>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-sm text-slate-500">
              Choose how staff see tables under Table Management. You can also switch this on the Tables page.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  {
                    id: 'normal' as TableViewMode,
                    title: 'Table board',
                    desc: 'Searchable card or list board — status filters, merge, QR, and bills.',
                    Icon: LayoutGrid,
                  },
                  {
                    id: 'floor' as TableViewMode,
                    title: 'Floor plan view',
                    desc: 'Live cafe layout with status colors. Edit layout in Floor Designer.',
                    Icon: Map,
                  },
                ] as const
              ).map(({ id, title, desc, Icon }) => {
                const on = formData.tableViewMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormData({ ...formData, tableViewMode: id })}
                    className={cn(
                      'text-left border-2 rounded-xl p-4 transition-all',
                      on ? 'border-[#FF6A00] bg-orange-50/40' : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <Icon className="w-4 h-4" style={{ color: on ? BRAND.orange : BRAND.navy }} />
                        {title}
                      </div>
                      {on && <CheckCircle2 className="w-5 h-5" style={{ color: BRAND.orange }} />}
                    </div>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </button>
                );
              })}
            </div>

            {formData.tableViewMode === 'normal' && (
              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Board layout
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {(
                    [
                      { id: 'grid' as TableBoardLayout, title: 'Grid cards', Icon: LayoutGrid },
                      { id: 'list' as TableBoardLayout, title: 'List rows', Icon: List },
                    ] as const
                  ).map(({ id, title, Icon }) => {
                    const on = formData.tableBoardLayout === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormData({ ...formData, tableBoardLayout: id })}
                        className={cn(
                          'flex items-center gap-2 border-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all',
                          on
                            ? 'border-[#0D1B2A] bg-slate-50 text-[#0D1B2A]'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 pb-12">
          <button
            type="submit"
            className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-lg shadow-orange-600/20"
          >
            {isSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            {isSaved ? 'Settings Saved!' : 'Save Settings'}
          </button>
        </div>

        </form>

        {/* Live Preview Pane */}
        <div className="lg:col-span-1 space-y-4">
          <div className="sticky top-6">
            <div className="bg-slate-100 rounded-xl p-4 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-700">Live Receipt Preview</h2>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex items-start justify-center overflow-x-auto min-h-[500px]">
              <ThermalReceipt
                previewMode={true}
                previewSettings={formData}
                orderId="PREVIEW-123"
                items={[
                  { name: "Cappuccino (Large)", quantity: 2, price: 4.50 },
                  { name: "Butter Croissant", quantity: 1, price: 3.00 },
                  { name: "Avocado Toast", quantity: 1, price: 8.50 }
                ]}
                totalAmount={21.45}
                taxAmount={0.95}
                tenderedAmount={25.00}
                changeDue={3.55}
                paymentMethod="card"
                customerName="John Doe"
              />
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <RolesPermissions />
        </div>
      )}
    </div>
  );
}
