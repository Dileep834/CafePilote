import React, { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import type { PrinterSize, TableViewMode } from '../store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Settings, Printer, Store, Save, FileText, CheckCircle2, Shield, LayoutGrid, Map } from 'lucide-react';
import { ThermalReceipt } from '../../pos/components/ThermalReceipt';
import { RolesPermissions } from '../components/RolesPermissions';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';

export function SystemSettings() {
  const { user } = useAuthStore();
  const settings = useSettingsStore();
  const [formData, setFormData] = useState({
    printerSize: settings.printerSize,
    cafeName: settings.cafeName,
    cafeAddress: settings.cafeAddress,
    cafePhone: settings.cafePhone,
    taxNumber: settings.taxNumber,
    receiptFooterMessage: settings.receiptFooterMessage,
    tableViewMode: settings.tableViewMode,
  });
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'permissions'>('general');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    settings.updateSettings(formData);
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (user?.role !== 'Super Admin' && user?.role !== 'Admin') {
    return (
      <div className="p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-8 max-w-lg mx-auto shadow-sm">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>You do not have permission to view system settings. Only Admins can access this page.</p>
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
            <Settings className="w-6 h-6 text-purple-600" />
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
              ? 'border-purple-600 text-purple-700' 
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
              ? 'border-purple-600 text-purple-700' 
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
            <Printer className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-800">Printer & Receipt Format</h2>
          </div>
          
          <div className="p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">POS Thermal Printer Size</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* 58mm Option */}
              <label className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                formData.printerSize === '58mm' ? 'border-purple-600 bg-purple-50/50' : 'border-slate-200 hover:border-purple-200'
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
                  {formData.printerSize === '58mm' && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                </div>
                <p className="text-xs text-slate-500">Compact thermal printers. Perfect for quick-service and small counters.</p>
              </label>

              {/* 80mm Option */}
              <label className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                formData.printerSize === '80mm' ? 'border-purple-600 bg-purple-50/50' : 'border-slate-200 hover:border-purple-200'
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
                  {formData.printerSize === '80mm' && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                </div>
                <p className="text-xs text-slate-500">Standard restaurant thermal printers. Wide format with more detail.</p>
              </label>

              {/* Standard A4 Option */}
              <label className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                formData.printerSize === 'standard' ? 'border-purple-600 bg-purple-50/50' : 'border-slate-200 hover:border-purple-200'
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
                  {formData.printerSize === 'standard' && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                </div>
                <p className="text-xs text-slate-500">Full page printing. Usually for office or wholesale environments.</p>
              </label>
            </div>
          </div>
        </div>

        {/* Business Details Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Store className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-800">Receipt Header & Footer</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Business / Cafe Name</label>
              <input 
                type="text" 
                className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600"
                value={formData.cafeName}
                onChange={e => setFormData({ ...formData, cafeName: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tax / GST Number</label>
              <input 
                type="text" 
                className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600"
                value={formData.taxNumber}
                onChange={e => setFormData({ ...formData, taxNumber: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Business Phone Number</label>
              <input 
                type="text" 
                className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600"
                value={formData.cafePhone}
                onChange={e => setFormData({ ...formData, cafePhone: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Business Address</label>
              <textarea 
                rows={2}
                className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600"
                value={formData.cafeAddress}
                onChange={e => setFormData({ ...formData, cafeAddress: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Receipt Footer Message</label>
              <input 
                type="text" 
                placeholder="e.g. Thank you for your visit!"
                className="w-full border-slate-200 rounded-lg focus:ring-purple-600 focus:border-purple-600"
                value={formData.receiptFooterMessage}
                onChange={e => setFormData({ ...formData, receiptFooterMessage: e.target.value })}
              />
            </div>
          </div>
        </div>

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
                    title: 'Normal table view',
                    desc: 'Classic card board — status filters, merge, QR, and bills.',
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
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 pb-12">
          <button 
            type="submit"
            className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg shadow-purple-600/20"
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
