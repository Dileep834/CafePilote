import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, Ticket, Plus, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { cn } from '@/lib/utils';
import { CompanyOnboardingRepository } from '../repositories/companyOnboardingRepository';

type TrialRow = {
  id: string;
  business_name: string;
  owner_name?: string | null;
  mobile?: string | null;
  email?: string | null;
  business_type?: string | null;
  city?: string | null;
  status: string;
  created_at?: string;
};

function StatusChip({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone =
    s === 'approved' || s === 'converted'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
      : s === 'rejected'
        ? 'bg-rose-50 text-rose-700 ring-rose-600/15'
        : 'bg-amber-50 text-amber-800 ring-amber-600/15';
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        tone
      )}
    >
      {status}
    </span>
  );
}

export function TrialRequestsPage() {
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await CompanyOnboardingRepository.listTrialRequests()) as TrialRow[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setStatus = async (id: string, status: string) => {
    try {
      await CompanyOnboardingRepository.updateTrialStatus(id, status);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const kpis = useMemo(() => {
    const pending = rows.filter((r) => r.status === 'pending').length;
    const approved = rows.filter((r) => r.status === 'approved').length;
    const converted = rows.filter((r) => r.status === 'converted').length;
    const rejected = rows.filter((r) => r.status === 'rejected').length;
    return { total: rows.length, pending, approved, converted, rejected };
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Trial requests</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Approve leads and convert them via Create Company.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            disabled={loading}
            onClick={() => void reload()}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Link
            to="/erp/super-admin/create-company"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#FF6A00] px-4 text-sm font-bold text-white hover:bg-[#e55f00]"
          >
            <Plus className="h-4 w-4" />
            Convert to company
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-[12px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard label="Total" value={String(kpis.total)} subtitle="All requests" icon={Ticket} tone="slate" />
        <InventoryCard label="Pending" value={String(kpis.pending)} subtitle="Needs review" icon={Clock3} tone="amber" />
        <InventoryCard label="Approved" value={String(kpis.approved)} subtitle="Ready to convert" icon={CheckCircle2} tone="emerald" />
        <InventoryCard label="Rejected" value={String(kpis.rejected)} subtitle="Closed" icon={XCircle} tone="red" />
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        {loading && !rows.length ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FF6A00]" /> Loading…
          </div>
        ) : !rows.length ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
              <Ticket className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">No trial requests</h3>
            <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
              Run <code className="rounded bg-slate-100 px-1 text-xs">super_admin_onboarding_schema.sql</code>{' '}
              if the table is missing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Business</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-slate-50 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-slate-900">{t.business_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {[t.business_type, t.city].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <p className="font-semibold">{t.owner_name || '—'}</p>
                      <p className="text-[11px]">{t.mobile || t.email || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusChip status={t.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        {t.status === 'pending' ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e55f00]"
                              onClick={() => void setStatus(t.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-xl border-slate-200"
                              onClick={() => void setStatus(t.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                        <Link
                          to="/erp/super-admin/create-company"
                          className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-2.5 text-xs font-bold hover:bg-slate-50"
                        >
                          Convert
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default TrialRequestsPage;
