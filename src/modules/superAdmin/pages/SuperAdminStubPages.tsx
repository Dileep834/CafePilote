import { Link } from 'react-router-dom';
import {
  Plug,
  Banknote,
  Bell,
  Settings,
  ExternalLink,
  CreditCard,
  MessageSquare,
  Smartphone,
  Mail,
  Building2,
} from 'lucide-react';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';

function PageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-600">{description}</p>
        </div>
        {actions ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-base font-black text-slate-900">{title}</h2>
      <div className="mt-3 text-sm font-medium text-slate-600">{children}</div>
    </section>
  );
}

export function SuperAdminIntegrationsPage() {
  return (
    <PageShell
      title="Integrations"
      description="Platform-level connectors for payments, messaging, and APIs."
      actions={
        <Link
          to="/erp/api-platform"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          API Platform
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard label="Payments" value="4" subtitle="Razorpay · Stripe…" icon={CreditCard} tone="orange" />
        <InventoryCard label="Messaging" value="3" subtitle="WhatsApp · SMS · Email" icon={MessageSquare} tone="blue" />
        <InventoryCard label="UPI apps" value="PhonePe" subtitle="Outlet settings" icon={Smartphone} tone="emerald" />
        <InventoryCard label="API" value="Open" subtitle="Developer keys" icon={Plug} tone="slate" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Payment gateways">
          <ul className="space-y-2">
            <li>Razorpay / Cashfree / Stripe — configure per company in Create Company Step 7</li>
            <li>PhonePe / UPI — outlet payment settings after go-live</li>
            <li>Cash remains available offline on Lite+</li>
          </ul>
        </Card>
        <Card title="Platform connectors">
          <ul className="space-y-2">
            <li>
              API Platform —{' '}
              <Link className="font-black text-[#FF6A00] hover:underline" to="/erp/api-platform">
                open API Platform
              </Link>
            </li>
            <li>Delivery aggregators — roadmap (Swiggy / Zomato adapters)</li>
            <li>Accounting export — Platform ops CSV / Tally queue</li>
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}

export function SuperAdminBillingPage() {
  return (
    <PageShell
      title="Billing"
      description="Tenant subscriptions, trials, and renewal overview."
      actions={
        <Link
          to="/erp/super-admin/companies"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#FF6A00] px-4 text-sm font-bold text-white hover:bg-[#e55f00]"
        >
          <Building2 className="h-4 w-4" />
          View companies
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
        <InventoryCard label="Subscriptions" value="DB" subtitle="company_subscriptions" icon={Banknote} tone="orange" />
        <InventoryCard label="Plans" value="4" subtitle="Lite → Enterprise" icon={CreditCard} tone="blue" />
        <InventoryCard label="Trials" value="14d" subtitle="Default window" icon={Bell} tone="amber" />
      </div>

      <Card title="How billing works">
        <p>
          Plans are written to{' '}
          <code className="rounded bg-slate-100 px-1 text-xs">company_subscriptions</code> during
          provisioning. Use Companies for per-tenant status and Control Panel for operational
          toggles.
        </p>
        <Link
          className="mt-3 inline-flex font-black text-[#FF6A00] hover:underline"
          to="/erp/super-admin/plans"
        >
          View plan limits →
        </Link>
      </Card>
    </PageShell>
  );
}

export function SuperAdminNotificationsPage() {
  return (
    <PageShell title="Notifications" description="Platform notification channels for onboarding and ops.">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard label="WhatsApp" value="Per co." subtitle="Step 13 wizard" icon={MessageSquare} tone="emerald" />
        <InventoryCard label="SMS" value="Per co." subtitle="Invite / alerts" icon={Smartphone} tone="blue" />
        <InventoryCard label="Email" value="On" subtitle="Default enabled" icon={Mail} tone="orange" />
        <InventoryCard label="Push" value="On" subtitle="In-app center" icon={Bell} tone="slate" />
      </div>

      <Card title="Channel notes">
        <p>
          Per-company WhatsApp / SMS / Email / Push are configured in Create Company Step 13. Global
          alerts use the in-app notification center for staff.
        </p>
      </Card>
    </PageShell>
  );
}

export function SuperAdminSettingsPage() {
  return (
    <PageShell
      title="Settings"
      description="Super Admin defaults for new tenant onboarding."
      actions={
        <Link
          to="/erp/super-admin/create-company"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#FF6A00] px-4 text-sm font-bold text-white hover:bg-[#e55f00]"
        >
          Open Create Company
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard label="Trial days" value="14" subtitle="Wizard default" icon={Settings} tone="orange" />
        <InventoryCard label="Timezone" value="IST" subtitle="Asia/Kolkata" icon={Settings} tone="slate" />
        <InventoryCard label="Currency" value="INR" subtitle="Default" icon={Banknote} tone="emerald" />
        <InventoryCard label="Language" value="en" subtitle="Default" icon={Settings} tone="blue" />
      </div>

      <Card title="Defaults & schema">
        <ul className="space-y-2">
          <li>Default trial days: 14 (editable in wizard)</li>
          <li>Default timezone: Asia/Kolkata · currency: INR</li>
          <li>
            Schema: <code className="rounded bg-slate-100 px-1 text-xs">scripts/super_admin_onboarding_schema.sql</code>
          </li>
          <li>See repo root ONBOARDING.md for the full 10-minute go-live flow</li>
        </ul>
      </Card>
    </PageShell>
  );
}
