import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  Download,
  RefreshCw,
  HeartPulse,
  Truck,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { useFranchiseStore } from '@/modules/franchise/store/useFranchiseStore';
import { fetchRecentHealthEvents, recordHealthEvent } from '../services/featureFlagService';
import {
  createStockTransfer,
  listStockTransfers,
  updateStockTransferStatus,
} from '../services/stockTransferService';
import { enqueueAccountingExport, listAccountingJobs } from '../services/accountingExportService';

function SeverityChip({ severity }: { severity: string }) {
  const s = String(severity || '').toLowerCase();
  const tone =
    s === 'error' || s === 'critical'
      ? 'bg-rose-50 text-rose-700 ring-rose-600/15'
      : s === 'warn' || s === 'warning'
        ? 'bg-amber-50 text-amber-800 ring-amber-600/15'
        : 'bg-slate-100 text-slate-600 ring-slate-600/10';
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        tone
      )}
    >
      {severity || 'info'}
    </span>
  );
}

function TransferChip({ status }: { status: string }) {
  const s = String(status || '').toLowerCase();
  const tone =
    s === 'received' || s === 'completed'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
      : s === 'requested'
        ? 'bg-amber-50 text-amber-800 ring-amber-600/15'
        : 'bg-slate-100 text-slate-600 ring-slate-600/10';
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        tone
      )}
    >
      {status || '—'}
    </span>
  );
}

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-orange-500/30 focus:ring-2';

export function PlatformOpsPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = getScopedCompanyId(user) || useTenantStore.getState().companyId;
  const outletId = getTenantOutletId(user) || useTenantStore.getState().activeOutletId;
  const outlets = useFranchiseStore((s) => s.outlets);
  const fetchOutlets = useFranchiseStore((s) => s.fetchOutlets);

  const [health, setHealth] = useState<Array<Record<string, unknown>>>([]);
  const [transfers, setTransfers] = useState<Array<Record<string, unknown>>>([]);
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);
  const [toOutlet, setToOutlet] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState('');
  const [schemaHint, setSchemaHint] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    setSchemaHint('');
    try {
      await fetchOutlets(companyId);
      try {
        setHealth(await fetchRecentHealthEvents(30));
      } catch {
        setHealth([]);
      }
      try {
        setTransfers(await listStockTransfers(companyId));
      } catch (err) {
        setTransfers([]);
        const m = (err as Error).message || '';
        if (/stock_transfers|schema cache/i.test(m)) {
          setSchemaHint(
            'Stock transfers need scripts/phase3_saas_schema.sql in Supabase (table public.stock_transfers).'
          );
        } else {
          setError(m);
        }
      }
      try {
        if (companyId) setJobs(await listAccountingJobs(companyId));
        else setJobs([]);
      } catch {
        setJobs([]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void recordHealthEvent({
      companyId,
      outletId,
      component: 'realtime',
      message: 'Platform ops panel opened',
    });
  }, [companyId, outletId]);

  const onTransfer = async () => {
    if (!outletId || !toOutlet || !productId) {
      setError('Need source outlet, destination, and product UUID');
      return;
    }
    setMsg('');
    try {
      const { transferId } = await createStockTransfer({
        companyId,
        fromOutletId: outletId,
        toOutletId: toOutlet,
        items: [{ productId, quantity: Number(qty) || 1 }],
        userId: user?.id,
      });
      setMsg(`Transfer requested ${transferId.slice(0, 8)}`);
      setError('');
      await load();
    } catch (err) {
      const m = (err as Error).message || '';
      if (/stock_transfers|schema cache/i.test(m)) {
        setSchemaHint(
          'Stock transfers need scripts/phase3_saas_schema.sql in Supabase (table public.stock_transfers).'
        );
      } else {
        setError(m);
      }
    }
  };

  const onCsvExport = async () => {
    if (!companyId) return;
    setMsg('');
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    try {
      const { jobId } = await enqueueAccountingExport({
        companyId,
        outletId,
        provider: 'csv',
        periodStart: start,
        periodEnd: end,
        userId: user?.id,
      });
      setMsg(`Accounting CSV job ${jobId.slice(0, 8)}`);
      setError('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const kpis = useMemo(() => {
    const pending = transfers.filter((t) => String(t.status) === 'requested').length;
    const warns = health.filter((e) =>
      /warn|error|critical/i.test(String(e.severity || ''))
    ).length;
    return {
      transfers: transfers.length,
      pending,
      jobs: jobs.length,
      health: health.length,
      warns,
    };
  }, [transfers, jobs, health]);

  const sourceName =
    outlets.find((o) => o.id === outletId)?.name || 'Active branch';

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Platform ops</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Inter-store transfer, accounting export queue, and system health · from {sourceName}
          </p>
        </div>
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
      </div>

      {schemaHint && (
        <p className="flex items-start gap-2 rounded-[12px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {schemaHint}
        </p>
      )}
      {error && (
        <p className="rounded-[12px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-[12px] bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
          {msg}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard
          label="Transfers"
          value={String(kpis.transfers)}
          subtitle={`${kpis.pending} pending`}
          icon={Truck}
          tone="orange"
        />
        <InventoryCard
          label="Export jobs"
          value={String(kpis.jobs)}
          subtitle="Accounting queue"
          icon={FileSpreadsheet}
          tone="blue"
        />
        <InventoryCard
          label="Health events"
          value={String(kpis.health)}
          subtitle="Recent"
          icon={HeartPulse}
          tone="slate"
        />
        <InventoryCard
          label="Alerts"
          value={String(kpis.warns)}
          subtitle="Warn / error"
          icon={Activity}
          tone="red"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Inter-store stock transfer</h2>
              <p className="text-sm font-medium text-slate-500">
                From active branch → destination outlet
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Destination outlet
              </span>
              <select
                value={toOutlet}
                onChange={(e) => setToOutlet(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select destination</option>
                {outlets
                  .filter((o) => o.id !== outletId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Product UUID
              </span>
              <input
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className={cn(fieldClass, 'font-mono text-xs')}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Quantity
              </span>
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                type="number"
                min={0.001}
                step="any"
                className={fieldClass}
              />
            </label>
            <Button
              type="button"
              className="h-10 w-full rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e55f00]"
              onClick={() => void onTransfer()}
            >
              Request transfer
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-slate-100">
            <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Recent transfers
            </div>
            {!transfers.length ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">No transfers yet</p>
            ) : (
              <ul className="max-h-44 divide-y divide-slate-50 overflow-y-auto">
                {transfers.slice(0, 8).map((t) => (
                  <li
                    key={String(t.id)}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono font-bold text-slate-800">
                        {String(t.id).slice(0, 8)}
                      </p>
                      <div className="mt-1">
                        <TransferChip status={String(t.status)} />
                      </div>
                    </div>
                    {t.status === 'requested' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0 rounded-xl border-orange-200 text-[#FF6A00] hover:bg-orange-50"
                        onClick={async () => {
                          await updateStockTransferStatus({
                            transferId: String(t.id),
                            status: 'approved',
                            userId: user?.id,
                          });
                          await updateStockTransferStatus({
                            transferId: String(t.id),
                            status: 'received',
                            userId: user?.id,
                          });
                          await load();
                        }}
                      >
                        Approve + receive
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Accounting export</h2>
              <p className="text-sm font-medium text-slate-500">
                CSV now · Tally / Zoho / QuickBooks / Xero via worker queue
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl border-slate-200 font-bold"
            onClick={() => void onCsvExport()}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export last 7 days (CSV)
          </Button>

          <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-slate-100">
            <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Export jobs
            </div>
            {!jobs.length ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">No export jobs yet</p>
            ) : (
              <ul className="max-h-44 divide-y divide-slate-50 overflow-y-auto">
                {jobs.map((j) => (
                  <li key={String(j.id)} className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold capitalize text-slate-900">{String(j.provider)}</p>
                      <p className="font-mono text-[11px] text-slate-500">
                        {String(j.id).slice(0, 8)} · {String(j.status)}
                      </p>
                    </div>
                    {j.file_url &&
                    typeof j.file_url === 'string' &&
                    j.file_url.startsWith('data:') ? (
                      <a
                        className="shrink-0 text-xs font-black text-[#FF6A00] hover:underline"
                        href={j.file_url}
                        download="cafepilots-sales.csv"
                      >
                        Download
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-base font-black text-slate-900">System health events</h2>
          <p className="text-sm font-medium text-slate-500">
            Recent platform signals · run phase3 schema if this stays empty
          </p>
        </div>
        {!health.length ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <HeartPulse className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">No health events yet</h3>
            <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
              Apply <code className="rounded bg-slate-100 px-1 text-xs">phase3_saas_schema.sql</code>{' '}
              for <code className="rounded bg-slate-100 px-1 text-xs">system_health_events</code>.
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400 backdrop-blur">
                <tr>
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Component</th>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Message</th>
                </tr>
              </thead>
              <tbody>
                {health.map((e) => (
                  <tr
                    key={String(e.id)}
                    className="border-t border-slate-50 transition-colors hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-500">
                      {new Date(String(e.created_at)).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">{String(e.component)}</td>
                    <td className="px-4 py-2.5">
                      <SeverityChip severity={String(e.severity)} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{String(e.message)}</td>
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
