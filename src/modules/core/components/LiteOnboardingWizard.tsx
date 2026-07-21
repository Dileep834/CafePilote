import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Store, UtensilsCrossed, Printer, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/modules/settings/store/useSettingsStore';
import { useTenantStore } from '@/store/useTenantStore';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'cafepilots-lite-onboarding-done';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to CafePilots Lite',
    body: 'Set up your café in about 5 minutes. We will keep the screen simple — just what you need to sell.',
  },
  {
    id: 'profile',
    title: 'Restaurant profile',
    body: 'Name and phone appear on receipts and the POS.',
  },
  {
    id: 'tax',
    title: 'GST & tax',
    body: 'Optional GSTIN for compliant receipts. You can skip and add later.',
  },
  {
    id: 'ready',
    title: 'You are ready',
    body: 'Add a few products, then open POS and take your first order.',
  },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LiteOnboardingWizard({ open, onClose }: Props) {
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const companyName = useTenantStore((s) => s.companyName);
  const [step, setStep] = useState(0);
  const [cafeName, setCafeName] = useState(settings.cafeName || companyName || '');
  const [phone, setPhone] = useState(settings.cafePhone || '');
  const [tax, setTax] = useState(settings.taxNumber || '');

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setCafeName(settings.cafeName || companyName || '');
    setPhone(settings.cafePhone || '');
    setTax(settings.taxNumber || '');
  }, [open, settings.cafeName, settings.cafePhone, settings.taxNumber, companyName]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    settings.updateSettings({
      cafeName: cafeName.trim() || settings.cafeName,
      cafePhone: phone.trim(),
      taxNumber: tax.trim(),
    });
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    onClose();
  };

  const next = () => {
    if (step === 1) {
      settings.updateSettings({
        cafeName: cafeName.trim() || settings.cafeName,
        cafePhone: phone.trim(),
      });
    }
    if (step === 2) {
      settings.updateSettings({ taxNumber: tax.trim() });
    }
    if (isLast) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-[#FF6A00]">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950">{current.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{current.body}</p>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Skip onboarding"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="mb-4 flex gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  i <= step ? 'bg-[#FF6A00]' : 'bg-slate-100'
                )}
              />
            ))}
          </div>

          {current.id === 'welcome' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Store, label: 'POS & Tables' },
                { icon: UtensilsCrossed, label: 'Products' },
                { icon: Printer, label: 'Receipts' },
                { icon: Users, label: 'Staff' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <item.icon className="h-4 w-4 text-[#FF6A00]" />
                  <span className="text-xs font-bold text-slate-700">{item.label}</span>
                </div>
              ))}
            </div>
          )}

          {current.id === 'profile' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Café name
                </label>
                <Input
                  value={cafeName}
                  onChange={(e) => setCafeName(e.target.value)}
                  className="mt-1 h-10 rounded-xl"
                  placeholder="e.g. Sunrise Café"
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Phone
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 h-10 rounded-xl"
                  placeholder="Contact number"
                />
              </div>
            </div>
          )}

          {current.id === 'tax' && (
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                GSTIN (optional)
              </label>
              <Input
                value={tax}
                onChange={(e) => setTax(e.target.value.toUpperCase())}
                className="mt-1 h-10 rounded-xl uppercase"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
          )}

          {current.id === 'ready' && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Lite workspace is ready
              </p>
              <p className="mt-1 text-xs text-emerald-700/90">
                Advanced AI, franchise, and developer tools stay hidden until you upgrade.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-xl text-xs font-bold text-slate-500"
            onClick={() => (step === 0 ? finish() : setStep((s) => s - 1))}
          >
            {step === 0 ? 'Skip' : 'Back'}
          </Button>
          <div className="flex gap-2">
            {isLast && (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl text-xs font-bold"
                onClick={() => {
                  finish();
                  navigate('/erp/menu/products');
                }}
              >
                Add products
              </Button>
            )}
            <Button
              type="button"
              className="h-9 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800"
              onClick={() => {
                if (isLast) {
                  finish();
                  navigate('/erp/pos');
                  return;
                }
                next();
              }}
            >
              {isLast ? 'Open POS' : 'Continue'}
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowLiteOnboarding(planIsLite: boolean): boolean {
  if (!planIsLite) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}
