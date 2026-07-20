import { useEffect, useState } from 'react';
import { Activity, ArrowLeftRight, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { useFranchiseStore } from '@/modules/franchise/store/useFranchiseStore';
import { fetchRecentHealthEvents, recordHealthEvent } from '../services/featureFlagService';
import { createStockTransfer, listStockTransfers, updateStockTransferStatus } from '../services/stockTransferService';
import { enqueueAccountingExport, listAccountingJobs } from '../services/accountingExportService';

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
  const [msg, setMsg] = useState('');

  const load = async () => {
    setError('');
    try {
      await fetchOutlets(companyId);
      setHealth(await fetchRecentHealthEvents(30));
      setTransfers(await listStockTransfers(companyId));
      if (companyId) setJobs(await listAccountingJobs(companyId));
    } catch (err) {
      setError((err as Error).message);
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
    try {
      const { transferId } = await createStockTransfer({
        companyId,
        fromOutletId: outletId,
        toOutletId: toOutlet,
        items: [{ productId, quantity: Number(qty) || 1 }],
        userId: user?.id,
      });
      setMsg(`Transfer requested ${transferId.slice(0, 8)}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onCsvExport = async () => {
    if (!companyId) return;
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
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
            <Activity className="h-5 w-5 text-orange-500" />
            Platform ops
          </h1>
          <p className="text-xs text-slate-500">
            Inter-store transfer, accounting export queue, system health
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {error && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>}
      {msg && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{msg}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="flex items-center gap-1.5 text-sm font-black text-slate-900">
            <ArrowLeftRight className="h-4 w-4" />
            Inter-store stock transfer
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">From active branch → destination</p>
          <div className="mt-3 space-y-2">
            <select
              value={toOutlet}
              onChange={(e) => setToOutlet(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 px-2 text-sm"
            >
              <option value="">Destination outlet</option>
              {outlets
                .filter((o) => o.id !== outletId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </select>
            <input
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Product UUID"
              className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm font-mono"
            />
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              type="number"
              min={0.001}
              step="any"
              className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm"
            />
            <Button type="button" className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => void onTransfer()}>
              Request transfer
            </Button>
          </div>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-[11px]">
            {transfers.slice(0, 8).map((t) => (
              <li key={String(t.id)} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="truncate font-mono">
                  {String(t.id).slice(0, 8)} · {String(t.status)}
                </span>
                {t.status === 'requested' && (
                  <button
                    type="button"
                    className="font-bold text-orange-600"
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
                    Approve+Receive
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="flex items-center gap-1.5 text-sm font-black text-slate-900">
            <Download className="h-4 w-4" />
            Accounting export
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            CSV available now · Tally / Zoho / QuickBooks / Xero jobs queue for workers
          </p>
          <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void onCsvExport()}>
            Export last 7 days (CSV)
          </Button>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-[11px]">
            {jobs.map((j) => (
              <li key={String(j.id)} className="rounded-lg bg-slate-50 px-2 py-1.5 font-mono">
                {String(j.provider)} · {String(j.status)} · {String(j.id).slice(0, 8)}
                {j.file_url && typeof j.file_url === 'string' && j.file_url.startsWith('data:') && (
                  <a className="ml-2 font-bold text-orange-600" href={j.file_url} download="cafepilots-sales.csv">
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-black text-slate-900">System health events</h2>
        </div>
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Component</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {health.map((e) => (
                <tr key={String(e.id)} className="border-t border-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                    {new Date(String(e.created_at)).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-bold">{String(e.component)}</td>
                  <td className="px-3 py-2">{String(e.severity)}</td>
                  <td className="px-3 py-2 text-slate-600">{String(e.message)}</td>
                </tr>
              ))}
              {!health.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                    No health events (run phase3 schema)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
