import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Loader2,
  Plus,
  Rocket,
  RefreshCw,
  Users,
  ShoppingBag,
  Wallet,
  BadgeCheck,
  Timer,
  Store,
  Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { CompanyProvisioningService, onboardingHealth } from '../services/companyProvisioningService';
import type { SuperAdminDashboardStats } from '../types';
import { statusColor } from '../lib/companyCode';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';

function StatusPill({ percent }: { percent: number }) {
  const color = statusColor(percent);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        color === 'green' && 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
        color === 'yellow' && 'bg-amber-50 text-amber-800 ring-amber-600/15',
        color === 'red' && 'bg-rose-50 text-rose-700 ring-rose-600/15'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          color === 'green' && 'bg-emerald-500',
          color === 'yellow' && 'bg-amber-400',
          color === 'red' && 'bg-rose-500'
        )}
      />
      {percent}%
    </span>
  );
}

export function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<SuperAdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await CompanyProvisioningService.getDashboardStats());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center text-sm font-medium text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#FF6A00]" />
        Loading Super Admin dashboard…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Tenant health, trials, and onboarding progress across CafePilots.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Link
            to="/erp/super-admin/create-company"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#FF6A00] px-4 text-sm font-bold text-white hover:bg-[#e55f00]"
          >
            <Plus className="h-4 w-4" />
            Create company
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-[12px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard
          label="Total companies"
          value={String(stats?.totalCompanies ?? 0)}
          subtitle="All tenants"
          icon={Building2}
          tone="slate"
        />
        <InventoryCard
          label="Active companies"
          value={String(stats?.activeCompanies ?? 0)}
          subtitle="is_active"
          icon={Store}
          tone="emerald"
        />
        <InventoryCard
          label="Trial companies"
          value={String(stats?.trialCompanies ?? 0)}
          subtitle="Trialing plans"
          icon={Timer}
          tone="amber"
        />
        <InventoryCard
          label="Paid companies"
          value={String(stats?.paidCompanies ?? 0)}
          subtitle="Active billing"
          icon={BadgeCheck}
          tone="blue"
        />
        <InventoryCard
          label="Revenue"
          value={stats?.revenueLabel || '—'}
          subtitle="See Billing"
          icon={Wallet}
          tone="orange"
        />
        <InventoryCard
          label="Today's orders"
          value={String(stats?.todayOrders ?? 0)}
          subtitle="Platform-wide"
          icon={ShoppingBag}
          tone="slate"
        />
        <InventoryCard
          label="Today's sales"
          value={formatCurrency(stats?.todaySales ?? 0)}
          subtitle="Completed bills"
          icon={Wallet}
          tone="emerald"
        />
        <InventoryCard
          label="Total users"
          value={String(stats?.totalUsers ?? 0)}
          subtitle="Staff accounts"
          icon={Users}
          tone="blue"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-base font-black text-slate-900">Recent companies</h2>
              <p className="text-sm font-medium text-slate-500">Latest tenants and setup progress</p>
            </div>
            <Link
              to="/erp/super-admin/companies"
              className="text-xs font-black text-[#FF6A00] hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {(stats?.recentCompanies || []).map((c) => {
              const { percent } = onboardingHealth(c.onboarding_progress);
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50/80 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{c.name}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                      {c.company_code || c.id.slice(0, 8)} · {c.plan_id || '—'} ·{' '}
                      <span className="capitalize">{c.onboarding_status || 'setup'}</span>
                    </p>
                  </div>
                  <StatusPill percent={percent} />
                </li>
              );
            })}
            {!stats?.recentCompanies?.length ? (
              <li className="px-4 py-10 text-center text-sm text-slate-400 sm:px-5">
                No companies yet
              </li>
            ) : null}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
              <Rocket className="h-4 w-4 text-[#FF6A00]" />
              Pending setup
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Account · Menu · QR · Billing · Live
            </p>
          </div>
          <ul className="divide-y divide-slate-50">
            {(stats?.pendingSetup || []).map((c) => {
              const { percent, flags } = onboardingHealth(c.onboarding_progress);
              return (
                <li key={c.id} className="px-4 py-3 text-sm sm:px-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900">{c.name}</p>
                    <StatusPill percent={percent} />
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    Acct {flags.companyCreated ? '✓' : '○'} · Menu {flags.menuImported ? '✓' : '○'} ·
                    QR {flags.qrGenerated ? '✓' : '○'} · Bill {flags.paymentSetup ? '✓' : '○'} · Live{' '}
                    {flags.live ? '✓' : '○'}
                  </p>
                </li>
              );
            })}
            {!stats?.pendingSetup?.length ? (
              <li className="flex flex-col items-center px-4 py-10 text-center sm:px-5">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <p className="text-sm font-black text-slate-900">All caught up</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  No tenants stuck in onboarding
                </p>
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
              <Ticket className="h-4 w-4 text-[#FF6A00]" />
              Recent trial requests
            </h2>
            <p className="text-sm font-medium text-slate-500">Inbound leads waiting for review</p>
          </div>
          <Link
            to="/erp/super-admin/trials"
            className="text-xs font-black text-[#FF6A00] hover:underline"
          >
            View all trials →
          </Link>
        </div>
        {!stats?.recentTrials?.length ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
              <Ticket className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">No trial requests</h3>
            <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
              New leads from the marketing site will show here after schema is applied.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {(stats?.recentTrials || []).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5"
              >
                <span className="font-bold text-slate-900">{t.business_name}</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default SuperAdminDashboardPage;
