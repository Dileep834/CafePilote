import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  CloudOff,
  Download,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Wifi,
  WifiOff,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { cn } from '@/lib/utils';
import { SyncService } from '../services/SyncService';
import { SyncQueueRepository } from '../repositories/SyncQueueRepository';
import { OfflineOrderRepository } from '../repositories/OfflineOrderRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { CacheService, type CatalogCacheStatus } from '../services/CacheService';
import { useConnectivityStore } from '../services/ConnectivityService';
import { ConflictResolver } from '../services/ConflictResolver';
import type { SyncQueueJob } from '../types/entities';
import { bootstrapOfflinePos } from '../bootstrap';
import { useTenantStore } from '@/store/useTenantStore';

type Counts = { pending: number; failed: number; conflict: number; running: number };

function StateChip({ state }: { state: string }) {
  const s = state.toLowerCase();
  const tone =
    s === 'failed'
      ? 'bg-rose-50 text-rose-700 ring-rose-600/15'
      : s === 'conflict'
        ? 'bg-amber-50 text-amber-800 ring-amber-600/15'
        : s === 'pending' || s === 'retry'
          ? 'bg-sky-50 text-sky-700 ring-sky-600/15'
          : 'bg-slate-100 text-slate-700 ring-slate-600/10';
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset',
        tone
      )}
    >
      {state}
    </span>
  );
}

export function SyncCenterPage() {
  const connectivity = useConnectivityStore();
  const companyId = useTenantStore((s) => s.companyId);
  const outletId = useTenantStore((s) => s.activeOutletId);
  const [counts, setCounts] = useState<Counts>({ pending: 0, failed: 0, conflict: 0, running: 0 });
  const [jobs, setJobs] = useState<SyncQueueJob[]>([]);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [cache, setCache] = useState<CatalogCacheStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [c, pending, failed, conflicts, orders, cacheStatus] = await Promise.all([
      SyncQueueRepository.counts(),
      SyncQueueRepository.listByState(['Pending', 'Retry']),
      SyncQueueRepository.listByState(['Failed']),
      SyncQueueRepository.listByState(['Conflict']),
      OfflineOrderRepository.listPending(),
      CacheService.getStatus(),
    ]);
    setCounts(c);
    setJobs([...pending, ...failed, ...conflicts].slice(0, 100));
    setPendingOrders(orders.length);
    setCache(cacheStatus);
  }, []);

  useEffect(() => {
    bootstrapOfflinePos();
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const onSync = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await SyncService.run('manual');
      setMessage(
        `Sync complete — processed ${result.processed}, ok ${result.succeeded}, failed ${result.failed}, conflicts ${result.conflicts}`
      );
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  };

  const onRefreshCatalog = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const status = await CacheService.refreshFromServer({ companyId, outletId });
      setCache(status);
      setMessage(
        status.ready
          ? `Catalog cached: ${status.products} products, ${status.recipes} recipes. Safe to go offline.`
          : 'Catalog refresh returned 0 products. Check company products / connection.'
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Catalog refresh failed');
    } finally {
      setBusy(false);
    }
  };

  const onRetry = async (id: string) => {
    await SyncQueueRepository.requeue(id);
    await refresh();
  };

  const onExport = async () => {
    const logs = await SyncQueueRepository.exportLogs();
    const audit = await AuditLogRepository.recent(200);
    const blob = new Blob([JSON.stringify({ sync_queue: JSON.parse(logs), audit }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cafepilots-sync-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onResolveConflict = async (job: SyncQueueJob) => {
    const conflict = ConflictResolver.detect(job, new Error(job.last_error || 'conflict'));
    if (!conflict) {
      await SyncQueueRepository.requeue(job.id);
      await refresh();
      return;
    }
    const auto = await ConflictResolver.resolveAutomatically(conflict);
    if (auto) {
      await ConflictResolver.apply(conflict, auto);
      await SyncQueueRepository.requeue(job.id);
    } else {
      await ConflictResolver.apply(conflict, { action: 'manual', preferred: 'server' });
      setMessage(`Conflict ${conflict.kind} requires manager review — logged. Job left in Conflict.`);
    }
    await refresh();
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Sync Center</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-600">
            Offline POS queue — pending jobs are never deleted until the server acknowledges commit.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 w-full rounded-xl border-slate-200 touch-manipulation sm:h-9 sm:w-auto"
            disabled={busy || !connectivity.online}
            onClick={() => void onRefreshCatalog()}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', busy && 'animate-spin')} />
            Refresh catalog
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 w-full rounded-xl border-slate-200 touch-manipulation sm:h-9 sm:w-auto"
            onClick={() => void onExport()}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export logs
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-11 w-full rounded-xl bg-[#FF6A00] font-bold text-white touch-manipulation hover:bg-[#e55f00] sm:h-9 sm:w-auto"
            disabled={busy || !connectivity.online}
            onClick={() => void onSync()}
          >
            {busy ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Working…
              </>
            ) : (
              'Sync now'
            )}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'rounded-xl px-4 py-3 text-sm font-medium shadow-sm ring-1',
          cache?.ready
            ? 'bg-emerald-50 text-emerald-900 ring-emerald-600/15'
            : 'bg-amber-50 text-amber-900 ring-amber-600/15'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 font-black">
          {cache?.ready ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <CloudOff className="h-4 w-4 text-amber-600" />
          )}
          Offline catalog: {cache?.ready ? 'Ready' : 'Not ready'}
        </div>
        <p className="mt-1 text-xs font-medium opacity-90">
          Cached products: {cache?.products ?? 0} · recipes: {cache?.recipes ?? 0}
          {cache?.lastRefreshedAt
            ? ` · last refresh ${new Date(cache.lastRefreshedAt).toLocaleString()}`
            : ' · never refreshed'}
          {' · '}
          Local orders awaiting sync: {pendingOrders}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard
          label="Connectivity"
          value={connectivity.state}
          subtitle={
            connectivity.latencyMs != null ? `${connectivity.latencyMs} ms latency` : 'Network status'
          }
          icon={connectivity.online ? Wifi : WifiOff}
          tone={connectivity.online ? 'emerald' : 'red'}
        />
        <InventoryCard
          label="Pending jobs"
          value={String(counts.pending)}
          subtitle="Awaiting server ack"
          icon={Inbox}
          tone={counts.pending > 0 ? 'amber' : 'slate'}
        />
        <InventoryCard
          label="Failed / retry"
          value={String(counts.failed)}
          subtitle="Need attention"
          icon={AlertTriangle}
          tone={counts.failed > 0 ? 'red' : 'slate'}
        />
        <InventoryCard
          label="Conflicts"
          value={String(counts.conflict)}
          subtitle="Manual resolve"
          icon={AlertTriangle}
          tone={counts.conflict > 0 ? 'amber' : 'slate'}
        />
      </div>

      {message ? (
        <p className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-100">
          {message}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-black text-slate-900">Sync queue</h2>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {jobs.length} job{jobs.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 font-black">Type</th>
                <th className="px-4 py-2.5 font-black">State</th>
                <th className="px-4 py-2.5 font-black">Attempts</th>
                <th className="px-4 py-2.5 font-black">Error</th>
                <th className="px-4 py-2.5 font-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-black text-slate-900">Queue empty</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">All caught up.</p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{job.job_type}</td>
                    <td className="px-4 py-2.5">
                      <StateChip state={job.state} />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-600">{job.attempts}</td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-slate-500">
                      {job.last_error || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {job.state === 'Conflict' ? (
                        <button
                          type="button"
                          className="text-xs font-black text-amber-700 hover:underline"
                          onClick={() => void onResolveConflict(job)}
                        >
                          Resolve
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-xs font-black text-[#FF6A00] hover:underline"
                          onClick={() => void onRetry(job.id)}
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default SyncCenterPage;
