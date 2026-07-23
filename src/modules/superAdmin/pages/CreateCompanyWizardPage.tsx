import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { ONBOARDING_STEPS, type BusinessType } from '../types';
import { useOnboardingWizardStore } from '../store/useOnboardingWizardStore';
import { PLAN_LIMITS } from '@/lib/planLimits';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BUSINESS_TYPES: BusinessType[] = [
  'Cafe',
  'Restaurant',
  'Bakery',
  'Cloud Kitchen',
  'Bar',
  'Food Court',
];

const fieldControlClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus-visible:border-[#FF6A00] focus-visible:ring-2 focus-visible:ring-[#FF6A00]/20';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function AiAssistant() {
  const draft = useOnboardingWizardStore((s) => s.draft);
  const tips: string[] = [];
  if (!draft.progress.menuImported && draft.menuItems.length === 0) {
    tips.push('Upload your printed menu and I will extract items for approval.');
  }
  if (!draft.progress.tablesCreated) {
    tips.push('Generate tables automatically from floors and zones.');
  }
  if (!draft.progress.qrGenerated) {
    tips.push('After tables exist, generate QR codes for dine-in ordering.');
  }
  if (!draft.progress.printerConnected && !draft.printersSkipped) {
    tips.push('No printer yet? Skip printer setup and connect later from Settings.');
  }
  if (!tips.length) {
    tips.push('Looking good — finish remaining steps and hit Start Billing.');
  }
  return (
    <aside className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950 shadow-sm ring-1 ring-amber-200/80">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-950">
        <Bot className="h-4 w-4 shrink-0" />
        AI onboarding assistant
      </div>
      <ul className="space-y-2">
        {tips.map((t) => (
          <li key={t} className="flex gap-2 text-sm font-medium leading-snug text-amber-900">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function CreateCompanyWizardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    draft,
    busy,
    error,
    message,
    setStep,
    next,
    back,
    patchBusiness,
    patchDraft,
    patchProgress,
    provision,
    autosave,
    runCreateTables,
    runImportMenu,
    applyAiMenuText,
    setMenuItems,
    goLive,
  } = useOnboardingWizardStore();

  const [aiText, setAiText] = useState('');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const step = ONBOARDING_STEPS[draft.stepIndex]!;

  useEffect(() => {
    const t = window.setTimeout(() => void autosave(user?.id), 800);
    return () => window.clearTimeout(t);
  }, [draft, autosave, user?.id]);

  useEffect(() => {
    void supabase
      .from('companies')
      .select('id, name')
      .order('name')
      .then(({ data }) => setCompanies((data as any) || []));
  }, []);

  const checklist = useMemo(
    () => [
      ['Company Created', draft.progress.companyCreated],
      ['Menu Imported', draft.progress.menuImported],
      ['QR Generated', draft.progress.qrGenerated],
      ['Tables Created', draft.progress.tablesCreated],
      ['Staff Added', draft.progress.staffAdded],
      ['Taxes Configured', draft.progress.taxesConfigured],
      ['Payment Setup', draft.progress.paymentSetup],
      ['Printer Connected / Skipped', draft.progress.printerConnected || draft.printersSkipped],
    ] as const,
    [draft]
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Create company</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-600">
            Onboard a restaurant and reach first billing in under 10 minutes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
          <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-sm font-bold text-[#FF6A00] ring-1 ring-inset ring-orange-600/15">
            Step {step.number} / {ONBOARDING_STEPS.length}
          </span>
          <span className="hidden sm:inline">{step.label}</span>
        </div>
      </div>

      <Link
        to="/erp/super-admin"
        className="inline-flex text-sm font-semibold text-[#FF6A00] hover:underline"
      >
        ← Super Admin Dashboard
      </Link>

      {/* Stepper */}
      <div className="-mx-1 overflow-x-auto rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100 touch-pan-x sm:mx-0 sm:p-3">
        <ol className="flex min-w-max gap-1.5 sm:gap-2">
          {ONBOARDING_STEPS.map((s, i) => {
            const active = i === draft.stepIndex;
            const done = i < draft.stepIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  className={cn(
                    'flex min-h-10 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-semibold transition touch-manipulation sm:gap-2 sm:px-3',
                    active && 'bg-[#FF6A00] text-white',
                    done && !active && 'bg-emerald-50 text-emerald-800',
                    !active && !done && 'bg-slate-100 text-slate-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      active ? 'bg-white/20 text-white' : 'bg-black/10 text-slate-700'
                    )}
                  >
                    {s.number}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-6">
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            Step {step.number}: {step.label}
          </h2>

          {error ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}

          {/* STEP 1 Business */}
          {step.id === 'business' && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Company Name" required>
                <Input className={fieldControlClass}
                  value={draft.business.companyName}
                  onChange={(e) => patchBusiness({ companyName: e.target.value })}
                  placeholder="Cafe Bluebird"
                />
              </Field>
              <Field label="Business Type" required>
                <select
                  className={fieldControlClass}
                  value={draft.business.businessType}
                  onChange={(e) => patchBusiness({ businessType: e.target.value as BusinessType })}
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Owner Name" required>
                <Input className={fieldControlClass}
                  value={draft.business.ownerName}
                  onChange={(e) => patchBusiness({ ownerName: e.target.value })}
                />
              </Field>
              <Field label="Mobile Number" required>
                <Input className={fieldControlClass}
                  value={draft.business.mobile}
                  onChange={(e) => patchBusiness({ mobile: e.target.value })}
                  placeholder="+91..."
                />
              </Field>
              <Field label="Email">
                <Input className={fieldControlClass}
                  value={draft.business.email || ''}
                  onChange={(e) => patchBusiness({ email: e.target.value })}
                />
              </Field>
              <Field label="GST Number">
                <Input className={fieldControlClass}
                  value={draft.business.gstNumber || ''}
                  onChange={(e) => patchBusiness({ gstNumber: e.target.value })}
                />
              </Field>
              <Field label="FSSAI">
                <Input className={fieldControlClass}
                  value={draft.business.fssai || ''}
                  onChange={(e) => patchBusiness({ fssai: e.target.value })}
                />
              </Field>
              <Field label="Country">
                <Input className={fieldControlClass}
                  value={draft.business.country}
                  onChange={(e) => patchBusiness({ country: e.target.value })}
                />
              </Field>
              <Field label="State">
                <Input className={fieldControlClass}
                  value={draft.business.state || ''}
                  onChange={(e) => patchBusiness({ state: e.target.value })}
                />
              </Field>
              <Field label="City">
                <Input className={fieldControlClass}
                  value={draft.business.city || ''}
                  onChange={(e) => patchBusiness({ city: e.target.value })}
                />
              </Field>
              <Field label="Time Zone">
                <Input className={fieldControlClass}
                  value={draft.business.timezone}
                  onChange={(e) => patchBusiness({ timezone: e.target.value })}
                />
              </Field>
              <Field label="Currency">
                <Input className={fieldControlClass}
                  value={draft.business.currency}
                  onChange={(e) => patchBusiness({ currency: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Language">
                <Input className={fieldControlClass}
                  value={draft.business.language}
                  onChange={(e) => patchBusiness({ language: e.target.value })}
                />
              </Field>
              <Field label="Subscription Plan">
                <select
                  className={fieldControlClass}
                  value={draft.business.planId}
                  onChange={(e) =>
                    patchBusiness({ planId: e.target.value as typeof draft.business.planId })
                  }
                >
                  {Object.values(PLAN_LIMITS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} (₹{p.monthlyPrice ?? '—'})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Trial Days">
                <Input className={fieldControlClass}
                  type="number"
                  min={0}
                  max={90}
                  value={draft.business.trialDays}
                  onChange={(e) => patchBusiness({ trialDays: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Restaurant Logo">
                <Input className={fieldControlClass}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () =>
                      patchBusiness({ logoDataUrl: String(reader.result || '') });
                    reader.readAsDataURL(file);
                  }}
                />
              </Field>
            </div>
          )}

          {/* STEP 2 Provision */}
          {step.id === 'provision' && (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-slate-600">
                This creates company, default outlet, admin user stub, kitchen/cash counter labels,
                roles, taxes, subscription and unique company code in one flow.
              </p>
              {draft.provisionResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                  <p>
                    <strong>Company code:</strong> {draft.provisionResult.companyCode}
                  </p>
                  <p>
                    <strong>Company ID:</strong> {draft.provisionResult.companyId}
                  </p>
                  <p>
                    <strong>Outlet:</strong> {draft.provisionResult.outletCode}
                  </p>
                  <p>
                    <strong>Cash counter:</strong> {draft.provisionResult.cashCounterLabel}
                  </p>
                </div>
              ) : (
                <Button disabled={busy} onClick={() => void provision(user?.id)}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create company bundle
                </Button>
              )}
            </div>
          )}

          {/* STEP 3 Setup progress */}
          {step.id === 'setup_progress' && (
            <ul className="mt-5 space-y-2">
              {[
                ['Company Created', draft.progress.companyCreated],
                ['Import Menu', draft.progress.menuImported],
                ['Generate QR', draft.progress.qrGenerated],
                ['Add Staff', draft.progress.staffAdded],
                ['Payment Setup', draft.progress.paymentSetup],
                ['Start Billing', draft.progress.live],
              ].map(([label, done]) => (
                <li key={label as string} className="flex items-center gap-2 text-sm">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300" />
                  )}
                  {label as string}
                </li>
              ))}
            </ul>
          )}

          {/* STEP 4 Menu */}
          {step.id === 'menu' && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['ai_scan', 'excel', 'manual', 'clone'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => patchDraft({ menuMode: mode })}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-bold',
                      draft.menuMode === mode
                        ? 'bg-[#FF6A00] text-white'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {mode === 'ai_scan'
                      ? 'AI Menu Scanner'
                      : mode === 'excel'
                        ? 'Upload Excel'
                        : mode === 'manual'
                          ? 'Manual Entry'
                          : 'Clone Company'}
                  </button>
                ))}
              </div>

              {draft.menuMode === 'ai_scan' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Paste menu text or OCR output. Review & approve before import.
                  </p>
                  <textarea
                    className="min-h-32 w-full rounded-lg border border-slate-200 p-3 text-sm"
                    placeholder={'COFFEE\nCappuccino - 180\nLatte - 160'}
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => applyAiMenuText(aiText)}>
                      <Upload className="mr-2 h-4 w-4" /> Extract
                    </Button>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <Upload className="h-4 w-4" />
                      Upload image / photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={() =>
                          setMessageHint(
                            'Image stored for review — paste OCR text or type lines Item - Price for extraction.'
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              )}

              {draft.menuMode === 'excel' && (
                <div className="space-y-2 text-sm text-slate-600">
                  <a
                    className="font-medium text-brand-orange underline"
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                      'category,name,description,price,veg\nCoffee,Cappuccino,Foam,180,true\n'
                    )}`}
                    download="cafepilots-menu-template.csv"
                  >
                    Download sample template (CSV)
                  </a>
                  <Input className={fieldControlClass}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const text = await file.text();
                      applyAiMenuText(text.replace(/,/g, ' - '));
                    }}
                  />
                </div>
              )}

              {draft.menuMode === 'manual' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setMenuItems([
                      ...draft.menuItems,
                      {
                        id: crypto.randomUUID(),
                        category: 'General',
                        name: 'New Item',
                        price: 0,
                        approved: true,
                      },
                    ])
                  }
                >
                  Add item row
                </Button>
              )}

              {draft.menuMode === 'clone' && (
                <Field label="Clone menu from company">
                  <select
                    className={fieldControlClass}
                    value={draft.cloneFromCompanyId || ''}
                    onChange={(e) => patchDraft({ cloneFromCompanyId: e.target.value })}
                  >
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {draft.menuItems.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-xl border">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">OK</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.menuItems.map((item, idx) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={item.approved !== false}
                              onChange={(e) => {
                                const next = [...draft.menuItems];
                                next[idx] = { ...item, approved: e.target.checked };
                                setMenuItems(next);
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">{item.category}</td>
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">₹{item.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button disabled={busy || !draft.provisionResult} onClick={() => void runImportMenu()}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Import approved items
              </Button>
            </div>
          )}

          {/* STEP 5 Layout */}
          {step.id === 'layout' && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['dining', 'Dining'],
                  ['takeaway', 'Takeaway'],
                  ['delivery', 'Delivery'],
                  ['cloudKitchen', 'Cloud Kitchen'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.layout[key]}
                    onChange={(e) =>
                      patchDraft({ layout: { ...draft.layout, [key]: e.target.checked } })
                    }
                  />
                  {label}
                </label>
              ))}
              <Field label="Number of Floors">
                <Input className={fieldControlClass}
                  type="number"
                  min={1}
                  value={draft.layout.floors}
                  onChange={(e) =>
                    patchDraft({ layout: { ...draft.layout, floors: Number(e.target.value) || 1 } })
                  }
                />
              </Field>
              <Field label="Tables per floor">
                <Input className={fieldControlClass}
                  type="number"
                  min={1}
                  value={draft.layout.tablesPerFloor}
                  onChange={(e) =>
                    patchDraft({
                      layout: { ...draft.layout, tablesPerFloor: Number(e.target.value) || 1 },
                    })
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <Button disabled={busy || !draft.provisionResult} onClick={() => void runCreateTables()}>
                  Generate tables automatically
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6 QR */}
          {step.id === 'qr' && (
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p>
                QR codes are generated per table from Tables → QR tools after tables exist. Mark this
                step complete when QRs are downloaded/printed.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/erp/tables"
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50"
                >
                  Open Tables / QR
                </Link>
                <Button
                  type="button"
                  onClick={() => patchProgress({ qrGenerated: true })}
                  disabled={!draft.progress.tablesCreated}
                >
                  Mark QR generated
                </Button>
              </div>
            </div>
          )}

          {/* STEP 7 Payments */}
          {step.id === 'payments' && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['cash', 'Cash'],
                  ['upi', 'UPI'],
                  ['card', 'Card'],
                  ['wallet', 'Wallet'],
                  ['phonepe', 'PhonePe'],
                  ['razorpay', 'Razorpay'],
                  ['cashfree', 'Cashfree'],
                  ['stripe', 'Stripe'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.payments[key])}
                    onChange={(e) =>
                      patchDraft({
                        payments: { ...draft.payments, [key]: e.target.checked },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              <Field label="Default payment">
                <select
                  className={fieldControlClass}
                  value={draft.payments.defaultMethod}
                  onChange={(e) =>
                    patchDraft({
                      payments: { ...draft.payments, defaultMethod: e.target.value },
                    })
                  }
                >
                  {['cash', 'upi', 'card', 'wallet'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="button" onClick={() => patchProgress({ paymentSetup: true })}>
                Save payment setup
              </Button>
            </div>
          )}

          {/* STEP 8 Printers */}
          {step.id === 'printers' && (
            <div className="mt-5 space-y-3 text-sm">
              <p className="text-slate-600">
                Configure billing / kitchen / label printers (Bluetooth, USB, Network) from device
                settings after go-live, or skip for now.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    patchDraft({ printersSkipped: true });
                    patchProgress({ printerConnected: false });
                  }}
                >
                  Skip printers
                </Button>
                <Button type="button" onClick={() => patchProgress({ printerConnected: true })}>
                  Mark printer connected
                </Button>
              </div>
            </div>
          )}

          {/* STEP 9 Staff */}
          {step.id === 'staff' && (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-slate-600">
                Default roles seeded: Owner/Admin, Manager, Cashier, Captain, Waiter, Kitchen,
                Delivery. Invite staff from Users with SMS/WhatsApp later.
              </p>
              <Link
                to="/erp/users"
                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50"
              >
                Open Staff & users
              </Link>
              <Button type="button" onClick={() => patchProgress({ staffAdded: true })}>
                Mark staff configured
              </Button>
            </div>
          )}

          {/* STEP 10 Inventory */}
          {step.id === 'inventory' && (
            <div className="mt-5 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.inventoryEnabled}
                  onChange={(e) => {
                    patchDraft({ inventoryEnabled: e.target.checked });
                    patchProgress({ inventoryEnabled: e.target.checked });
                  }}
                />
                Enable inventory (suppliers, opening stock, units, categories)
              </label>
            </div>
          )}

          {/* STEP 11 KDS */}
          {step.id === 'kds' && (
            <div className="mt-5 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.kdsEnabled}
                  onChange={(e) => {
                    patchDraft({ kdsEnabled: e.target.checked });
                    patchProgress({ kdsEnabled: e.target.checked });
                  }}
                />
                Enable Kitchen Display (stations + category mapping)
              </label>
              <Link
                to="/erp/kitchen"
                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50"
              >
                Open KDS
              </Link>
            </div>
          )}

          {/* STEP 12 Hours */}
          {step.id === 'hours' && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Opening time">
                <Input className={fieldControlClass}
                  type="time"
                  value={draft.hours.openTime}
                  onChange={(e) =>
                    patchDraft({ hours: { ...draft.hours, openTime: e.target.value } })
                  }
                />
              </Field>
              <Field label="Closing time">
                <Input className={fieldControlClass}
                  type="time"
                  value={draft.hours.closeTime}
                  onChange={(e) =>
                    patchDraft({ hours: { ...draft.hours, closeTime: e.target.value } })
                  }
                />
              </Field>
            </div>
          )}

          {/* STEP 13 Notifications */}
          {step.id === 'notifications' && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['whatsapp', 'WhatsApp'],
                  ['sms', 'SMS'],
                  ['email', 'Email'],
                  ['push', 'Push Notifications'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.notifications[key]}
                    onChange={(e) =>
                      patchDraft({
                        notifications: { ...draft.notifications, [key]: e.target.checked },
                      })
                    }
                  />
                  Enable {label}
                </label>
              ))}
            </div>
          )}

          {/* STEP 14 Go live */}
          {step.id === 'go_live' && (
            <div className="mt-5 space-y-4">
              <ul className="space-y-2">
                {checklist.map(([label, ok]) => (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300" />
                    )}
                    {label}
                  </li>
                ))}
              </ul>
              <Button
                className="h-12 w-full bg-brand-orange text-base font-bold text-white hover:opacity-95 sm:w-auto sm:px-10"
                disabled={busy || !draft.progress.companyCreated}
                onClick={async () => {
                  const outletId = await goLive();
                  if (outletId) navigate('/erp/pos');
                }}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                START BILLING
              </Button>
            </div>
          )}

          <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-4 sm:backdrop-blur-none">
            <Button
              type="button"
              variant="outline"
              disabled={draft.stepIndex === 0}
              onClick={back}
              className="h-11 min-w-[7rem] flex-1 rounded-xl border-slate-200 px-4 text-sm font-semibold touch-manipulation sm:h-10 sm:flex-none"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step.id !== 'go_live' ? (
              <Button
                type="button"
                className="h-11 min-w-[7rem] flex-1 rounded-xl bg-[#FF6A00] px-5 text-sm font-bold text-white touch-manipulation hover:bg-[#e55f00] sm:h-10 sm:flex-none"
                onClick={() => {
                  if (step.id === 'business') next();
                  else if (step.id === 'provision' && !draft.provisionResult) void provision(user?.id);
                  else next();
                }}
                disabled={busy}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </section>

        <div className="space-y-4">
          <div className="lg:sticky lg:top-2">
            <AiAssistant />
            <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-sm font-bold text-slate-900">Autosave</p>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Draft saves locally and to Supabase when available.
              </p>
              {draft.provisionResult?.companyCode ? (
                <p className="mt-2 font-mono text-xs font-medium text-slate-500">
                  {draft.provisionResult.companyCode}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateCompanyWizardPage;
