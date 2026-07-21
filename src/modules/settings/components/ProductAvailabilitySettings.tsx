import { useEffect, useState } from 'react';
import { Loader2, PackageCheck } from 'lucide-react';
import { saveAvailabilityPolicy, loadAvailabilityPolicy, type ProductAvailabilityPolicy } from '@/modules/availability';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';

type Props = {
  canManageSubscriptions?: boolean;
};

const AVAILABILITY_OPTIONS = [
  { value: 'always_available', label: 'Always Available' },
  { value: 'show_oos', label: 'Show Out Of Stock' },
  { value: 'hide', label: 'Hide Product' },
  { value: 'move_category', label: 'Move To Out Of Stock Category' },
  { value: 'warn_sale', label: 'Allow Sale With Warning' },
] as const;

const MANUAL_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'out_of_stock', label: 'Out Of Stock' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'discontinued', label: 'Discontinued' },
] as const;

export function ProductAvailabilitySettings({ canManageSubscriptions = false }: Props) {
  const user = useAuthStore((s) => s.user);
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const outlets = useTenantStore((s) => s.outlets);
  const fallbackOutletId = outlets[0]?.id || user?.outletId || null;
  const outletId = activeOutletId || fallbackOutletId;

  const [policy, setPolicy] = useState<ProductAvailabilityPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const next = await loadAvailabilityPolicy(outletId);
      if (!cancelled) {
        setPolicy(next);
        setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [outletId]);

  const patch = <K extends keyof ProductAvailabilityPolicy>(key: K, value: ProductAvailabilityPolicy[K]) => {
    setPolicy((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const persist = async () => {
    if (!policy) return;
    setSaving(true);
    const next = await saveAvailabilityPolicy(outletId, policy, user?.id || null);
    setPolicy(next);
    setSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  if (loading || !policy) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading product availability settings…
        </div>
      </div>
    );
  }

  const inventoryOff = !policy.inventoryTrackingEnabled;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <PackageCheck className="w-5 h-5 text-orange-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-800">Product Availability</h2>
          <p className="text-xs text-slate-500">Inventory decides stock. Availability decides whether a product can be sold.</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-bold text-slate-800">Enable Inventory Management</p>
            <p className="mt-1 text-xs text-slate-500">
              When off, billing never blocks for stock and product availability works in manual mode only.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={policy.inventoryTrackingEnabled}
              onChange={(e) => patch('inventoryTrackingEnabled', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-orange-600"
            />
            {policy.inventoryTrackingEnabled ? 'On' : 'Off'}
          </label>
        </div>

        {inventoryOff ? (
          <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">Availability Mode: Manual Only</p>
            <p className="text-sm text-amber-800">
              Automatic product availability requires Inventory Management. Managers can still mark products as:
            </p>
            <div className="flex flex-wrap gap-2">
              {MANUAL_OPTIONS.map((item) => (
                <span
                  key={item.value}
                  className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-amber-200"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Availability Mode</label>
              <select
                value={policy.availabilityMode}
                onChange={(e) => patch('availabilityMode', e.target.value as ProductAvailabilityPolicy['availabilityMode'])}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                {AVAILABILITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Inventory Enforcement</label>
              <select
                value={policy.inventoryEnforcement}
                onChange={(e) => patch('inventoryEnforcement', e.target.value as ProductAvailabilityPolicy['inventoryEnforcement'])}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="track">Track only</option>
                <option value="warn">Warn only</option>
                <option value="strict">Strict block</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Low Stock Threshold %</label>
              <input
                type="number"
                min={1}
                max={100}
                value={policy.lowStockThresholdPct}
                onChange={(e) => patch('lowStockThresholdPct', Number(e.target.value) || 15)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Low Stock Servings</label>
              <input
                type="number"
                min={1}
                value={policy.lowStockServings}
                onChange={(e) => patch('lowStockServings', Number(e.target.value) || 3)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={policy.warnSaleRequiresPin}
                onChange={(e) => patch('warnSaleRequiresPin', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-orange-600"
              />
              Require manager approval for warn-and-sell
            </label>

            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              {[
                ['autoMarkUnavailable', 'Auto mark unavailable'],
                ['autoRestore', 'Auto restore'],
                ['autoNotify', 'Auto notify'],
                ['autoSync', 'Auto sync'],
                ['autoCategoryMove', 'Auto category move'],
              ].map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(policy[key as keyof ProductAvailabilityPolicy])}
                    onChange={(e) => patch(key as keyof ProductAvailabilityPolicy, e.target.checked as never)}
                    className="h-4 w-4 rounded border-slate-300 text-orange-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {canManageSubscriptions
              ? 'Platform owner can define outlet behavior here without changing the menu architecture.'
              : 'Settings are applied per outlet and reused by POS, QR menu, and reports.'}
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void persist()}
            className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save Availability Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
