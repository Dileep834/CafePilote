import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, RefreshCw, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompanyOnboardingRepository } from '../repositories/companyOnboardingRepository';
import { onboardingHealth } from '../services/companyProvisioningService';
import { statusColor } from '../lib/companyCode';
import type { CompanyOnboardingStatusRow } from '../types';
import { cn } from '@/lib/utils';

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

export function SuperAdminCompaniesPage() {
  const [rows, setRows] = useState<CompanyOnboardingStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await CompanyOnboardingRepository.listCompaniesWithOnboarding());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Companies</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Onboarding progress: Account → Menu → QR → Billing → Live
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

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        {loading && !rows.length ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FF6A00]" /> Loading…
          </div>
        ) : !rows.length ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">No companies yet</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Provision a tenant from Create Company.
            </p>
            <Link
              to="/erp/super-admin/create-company"
              className="mt-4 inline-flex h-9 items-center rounded-xl bg-[#FF6A00] px-4 text-sm font-bold text-white hover:bg-[#e55f00]"
            >
              Create company
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Company</th>
                  <th className="px-4 py-2.5">Plan</th>
                  <th className="px-4 py-2.5">Progress</th>
                  <th className="px-4 py-2.5">Milestones</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const { percent, flags } = onboardingHealth(c.onboarding_progress);
                  return (
                    <tr
                      key={c.id}
                      className="border-t border-slate-50 transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {c.company_code || c.id.slice(0, 8)}
                          {c.city ? ` · ${c.city}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 font-medium capitalize text-slate-600">
                        {c.plan_id || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill percent={percent} />
                      </td>
                      <td className="px-4 py-2.5 text-[11px] font-medium text-slate-500">
                        Acct {flags.companyCreated ? '✓' : '○'} · Menu {flags.menuImported ? '✓' : '○'}{' '}
                        · QR {flags.qrGenerated ? '✓' : '○'} · Bill {flags.paymentSetup ? '✓' : '○'} ·
                        Live {flags.live ? '✓' : '○'}
                      </td>
                      <td className="px-4 py-2.5 capitalize text-slate-600">
                        {c.onboarding_status || 'setup'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs font-medium text-slate-500">
        Legacy master list:{' '}
        <Link to="/erp/companies" className="font-bold text-[#FF6A00] hover:underline">
          /erp/companies
        </Link>
      </p>
    </div>
  );
}

export default SuperAdminCompaniesPage;
