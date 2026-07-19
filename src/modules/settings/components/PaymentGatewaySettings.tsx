import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import type { OnlinePaymentMethod } from '@/modules/pos/store/usePOSStore';
import {
  fetchOutletGatewaySettings,
  saveOutletGatewaySettings,
  type OutletGatewaySetting,
  type PaymentGatewayFieldDefinition,
} from '@/modules/pos/services/paymentGatewayService';

type GatewayForm = Record<
  OnlinePaymentMethod,
  {
    isEnabled: boolean;
    mode: 'sandbox' | 'production';
    config: Record<string, string>;
    savedSecrets: Record<string, boolean>;
    configured: boolean;
  }
>;

const gatewayOrder: OnlinePaymentMethod[] = ['paytm', 'phonepe', 'amazonpay'];

const emptyForm: GatewayForm = {
  paytm: { isEnabled: false, mode: 'sandbox', config: {}, savedSecrets: {}, configured: false },
  phonepe: { isEnabled: false, mode: 'sandbox', config: {}, savedSecrets: {}, configured: false },
  amazonpay: { isEnabled: false, mode: 'sandbox', config: {}, savedSecrets: {}, configured: false },
};

function toForm(settings: OutletGatewaySetting[]): GatewayForm {
  return gatewayOrder.reduce((acc, gateway) => {
    const row = settings.find((item) => item.gateway === gateway);
    acc[gateway] = {
      isEnabled: Boolean(row?.isEnabled),
      mode: row?.mode || 'sandbox',
      config: { ...(row?.config || {}) },
      savedSecrets: { ...(row?.savedSecrets || {}) },
      configured: Boolean(row?.configured),
    };
    return acc;
  }, structuredClone(emptyForm));
}

export function PaymentGatewaySettings() {
  const token = useAuthStore((state) => state.token);
  const outlets = useTenantStore((state) => state.outlets);
  const activeOutletId = useTenantStore((state) => state.activeOutletId);
  const companyId = useTenantStore((state) => state.companyId);
  const [selectedOutletId, setSelectedOutletId] = useState(activeOutletId || outlets[0]?.id || 'current-outlet');
  const [labels, setLabels] = useState<Record<OnlinePaymentMethod, string>>({
    paytm: 'Paytm',
    phonepe: 'PhonePe',
    amazonpay: 'Amazon Pay',
  });
  const [fields, setFields] = useState<Record<OnlinePaymentMethod, PaymentGatewayFieldDefinition[]>>({
    paytm: [],
    phonepe: [],
    amazonpay: [],
  });
  const [form, setForm] = useState<GatewayForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === selectedOutletId),
    [outlets, selectedOutletId]
  );

  useEffect(() => {
    if (activeOutletId) setSelectedOutletId(activeOutletId);
  }, [activeOutletId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setMessage(null);

    fetchOutletGatewaySettings(selectedOutletId)
      .then((response) => {
        if (cancelled) return;
        setFields(response.fields);
        setLabels(
          response.gateways.reduce(
            (acc, gateway) => ({ ...acc, [gateway.gateway]: gateway.label }),
            { paytm: 'Paytm', phonepe: 'PhonePe', amazonpay: 'Amazon Pay' }
          )
        );
        setForm(toForm(response.gateways));
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Could not load payment settings.',
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOutletId]);

  const updateGateway = (
    gateway: OnlinePaymentMethod,
    updates: Partial<GatewayForm[OnlinePaymentMethod]>
  ) => {
    setForm((current) => ({
      ...current,
      [gateway]: {
        ...current[gateway],
        ...updates,
      },
    }));
  };

  const updateConfig = (gateway: OnlinePaymentMethod, name: string, value: string) => {
    setForm((current) => ({
      ...current,
      [gateway]: {
        ...current[gateway],
        config: {
          ...current[gateway].config,
          [name]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await saveOutletGatewaySettings(
        {
          outletId: selectedOutletId,
          companyId,
          gateways: gatewayOrder.map((gateway) => ({
            gateway,
            isEnabled: form[gateway].isEnabled,
            mode: form[gateway].mode,
            config: form[gateway].config,
          })),
        },
        token
      );
      setForm(toForm(response.gateways));
      setMessage({ type: 'success', text: 'Payment gateway settings saved.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not save payment gateway settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-orange-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Outlet payment gateways</h2>
              <p className="text-xs text-slate-500">
                {selectedOutlet?.name || 'Selected outlet'} controls which online options appear in POS.
              </p>
            </div>
          </div>

          <select
            value={selectedOutletId}
            onChange={(event) => setSelectedOutletId(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
          >
            {outlets.length === 0 && <option value="current-outlet">Current outlet</option>}
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </div>

        <div className="p-6 space-y-4">
          {message && (
            <div
              className={cn(
                'rounded-xl border p-3 text-sm font-semibold flex items-center gap-2',
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              )}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          {isLoading ? (
            <div className="min-h-48 flex items-center justify-center text-slate-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading gateway settings...
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {gatewayOrder.map((gateway) => {
                const gatewayFields = fields[gateway] || [];
                const row = form[gateway];
                return (
                  <div key={gateway} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-900">{labels[gateway]}</h3>
                        <p className="text-xs font-semibold text-slate-500">
                          {row.configured ? 'Configured' : 'Missing required fields'}
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={row.isEnabled}
                          onChange={(event) => updateGateway(gateway, { isEnabled: event.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-600"
                        />
                        Enabled
                      </label>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Mode
                        </label>
                        <select
                          value={row.mode}
                          onChange={(event) =>
                            updateGateway(gateway, {
                              mode: event.target.value === 'production' ? 'production' : 'sandbox',
                            })
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                        >
                          <option value="sandbox">Sandbox</option>
                          <option value="production">Production</option>
                        </select>
                      </div>

                      {gatewayFields.map((field) => {
                        const savedSecret = Boolean(row.savedSecrets[field.name]);
                        const commonClass =
                          'bg-white border-slate-200 focus-visible:ring-orange-600 rounded-xl text-sm';

                        return (
                          <div key={field.name}>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              {field.label}
                              {field.required && <span className="text-orange-600"> *</span>}
                            </label>
                            {field.multiline ? (
                              <textarea
                                rows={4}
                                value={row.config[field.name] || ''}
                                onChange={(event) => updateConfig(gateway, field.name, event.target.value)}
                                placeholder={savedSecret ? 'Saved - leave blank to keep' : field.placeholder || ''}
                                className={cn('w-full border px-3 py-2', commonClass)}
                              />
                            ) : (
                              <Input
                                type={field.secret ? 'password' : 'text'}
                                value={row.config[field.name] || ''}
                                onChange={(event) => updateConfig(gateway, field.name, event.target.value)}
                                placeholder={savedSecret ? 'Saved - leave blank to keep' : field.placeholder || ''}
                                className={commonClass}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="h-11 rounded-xl bg-orange-600 px-6 font-black text-white hover:bg-orange-700"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save gateway settings
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
        <p>
          Saved secrets are stored server-side and are never sent back to the browser. Blank secret fields keep
          the previously saved value.
        </p>
      </div>
    </div>
  );
}
