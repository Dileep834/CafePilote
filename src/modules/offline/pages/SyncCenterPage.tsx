import { useCallback, useEffect, useState } from 'react';
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
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sync Center</h1>
        <p className="text-sm text-slate-600">
          Offline POS queue — pending jobs are never deleted until the server acknowledges commit.
        </p>
      </header>

      <div
        className={`rounded-lg border p-4 ${
          cache?.ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="text-sm font-medium text-slate-900">
          Offline catalog: {cache?.ready ? 'Ready' : 'Not ready'}
        </div>
        <p className="mt-1 text-sm text-slate-700">
          Cached products: <strong>{cache?.products ?? 0}</strong>
          {' · '}
          recipes: <strong>{cache?.recipes ?? 0}</strong>
          {cache?.lastRefreshedAt
            ? ` · last refresh ${new Date(cache.lastRefreshedAt).toLocaleString()}`
            : ' · never refreshed'}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          While online, click Refresh catalog (or open POS once). Then go offline — POS will use this
          cache.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Connectivity"
          value={connectivity.state}
          hint={connectivity.latencyMs != null ? `${connectivity.latencyMs} ms` : undefined}
        />
        <Stat label="Pending jobs" value={String(counts.pending)} />
        <Stat label="Failed / retry" value={String(counts.failed)} />
        <Stat label="Conflicts" value={String(counts.conflict)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !connectivity.online}
          onClick={() => void onRefreshCatalog()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
        >
          Refresh catalog
        </button>
        <button
          type="button"
          disabled={busy || !connectivity.online}
          onClick={() => void onSync()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Sync now'}
        </button>
        <button
          type="button"
          onClick={() => void onExport()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800"
        >
          Export logs
        </button>
        <span className="text-sm text-slate-500">
          Local orders awaiting sync: <strong>{pendingOrders}</strong>
        </span>
      </div>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}

      <section className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">State</th>
              <th className="px-3 py-2 font-medium">Attempts</th>
              <th className="px-3 py-2 font-medium">Error</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Queue empty — all caught up.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{job.job_type}</td>
                  <td className="px-3 py-2">{job.state}</td>
                  <td className="px-3 py-2">{job.attempts}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-slate-500">{job.last_error || '—'}</td>
                  <td className="px-3 py-2">
                    {job.state === 'Conflict' ? (
                      <button
                        type="button"
                        className="text-amber-700 underline"
                        onClick={() => void onResolveConflict(job)}
                      >
                        Resolve
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-slate-800 underline"
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
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export default SyncCenterPage;
