import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Download,
  Filter,
  RefreshCw,
  ScrollText,
  Search,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { cn } from '@/lib/utils';
import { fetchAuditLogs } from '../services/auditService';

type AuditRow = Record<string, unknown>;

type Filters = {
  search: string;
  action: string;
  user: string;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_FILTERS: Filters = {
  search: '',
  action: '',
  user: '',
  dateFrom: '',
  dateTo: '',
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function ActionChip({ action }: { action: string }) {
  const a = action.toLowerCase();
  const tone =
    a.includes('refund') || a.includes('void') || a.includes('delete')
      ? 'bg-red-50 text-red-700 ring-red-600/15'
      : a.includes('discount') || a.includes('override') || a.includes('pin')
        ? 'bg-amber-50 text-amber-800 ring-amber-600/15'
        : a.includes('open') || a.includes('close') || a.includes('shift')
          ? 'bg-sky-50 text-sky-700 ring-sky-600/15'
          : 'bg-slate-100 text-slate-700 ring-slate-600/10';
  return (
    <span
      className={cn(
        'inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        tone
      )}
    >
      {action.replace(/_/g, ' ') || '—'}
    </span>
  );
}

function exportCsv(rows: AuditRow[]) {
  const header = ['When', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Reason', 'Terminal'];
  const lines = rows.map((r) =>
    [
      r.created_at,
      r.user_name,
      r.user_role,
      r.action,
      r.entity_type,
      r.entity_id,
      r.reason,
      r.terminal_id,
    ]
      .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditLogsPage() {
  const user = useAuthStore((s) => s.user);
  const outlets = useTenantStore((s) => s.outlets);
  const outletId = getTenantOutletId(user) || useTenantStore.getState().activeOutletId;
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchAuditLogs({ outletId, limit: 200 }));
    } catch (err) {
      setError(
        (err as Error).message ||
          'Audit table missing — run scripts/phase1_production_schema.sql in Supabase.'
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [outletId]);

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const a = String(r.action || '').trim();
      if (a) set.add(a);
    }
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = filters.search.trim().toLowerCase();
      const when = new Date(String(r.created_at || 0));
      const userName = String(r.user_name || '').toLowerCase();
      const action = String(r.action || '');
      const entity = `${r.entity_type || ''}:${r.entity_id || ''}`.toLowerCase();
      const reason = String(r.reason || '').toLowerCase();

      if (
        q &&
        !userName.includes(q) &&
        !action.toLowerCase().includes(q) &&
        !entity.includes(q) &&
        !reason.includes(q)
      ) {
        return false;
      }
      if (filters.action && action !== filters.action) return false;
      if (filters.user && !userName.includes(filters.user.trim().toLowerCase())) return false;
      if (filters.dateFrom) {
        const from = new Date(`${filters.dateFrom}T00:00:00`);
        if (when < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(`${filters.dateTo}T23:59:59`);
        if (when > to) return false;
      }
      return true;
    });
  }, [rows, filters]);

  const kpis = useMemo(() => {
    const today = startOfDay();
    const todayRows = rows.filter((r) => new Date(String(r.created_at)) >= today);
    const users = new Set(rows.map((r) => String(r.user_name || r.user_id || '')).filter(Boolean));
    const sensitive = rows.filter((r) => {
      const a = String(r.action || '').toLowerCase();
      return /refund|void|discount|override|delete|pin|manager/.test(a);
    }).length;
    return {
      today: todayRows.length,
      total: rows.length,
      users: users.size,
      sensitive,
    };
  }, [rows]);

  const activeFilterCount = Object.entries(filters).filter(([, v]) => Boolean(v)).length;
  const outletName = outlets.find((o) => o.id === outletId)?.name || 'Current outlet';

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Audit log</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Immutable trail of sensitive POS and ops actions for {outletName}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-black text-orange-700">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            disabled={!filtered.length}
            onClick={() => exportCsv(filtered)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
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
      </div>

      {error && (
        <p className="rounded-[12px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <InventoryCard
          label="Today's events"
          value={String(kpis.today)}
          subtitle="Since midnight"
          icon={ScrollText}
          tone="orange"
        />
        <InventoryCard
          label="Loaded events"
          value={String(kpis.total)}
          subtitle="Last 200 rows"
          icon={ClipboardList}
          tone="slate"
        />
        <InventoryCard
          label="Actors"
          value={String(kpis.users)}
          subtitle="Distinct users"
          icon={Users}
          tone="blue"
        />
        <InventoryCard
          label="Sensitive actions"
          value={String(kpis.sensitive)}
          subtitle="Refund / void / override"
          icon={ShieldAlert}
          tone="red"
        />
      </div>

      {filtersOpen && (
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[180px] flex-1 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Search
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                  placeholder="User, action, entity, reason…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </label>
            <label className="w-full space-y-1 sm:w-40">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Action
              </span>
              <select
                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none ring-orange-500/30 focus:ring-2"
                value={filters.action}
                onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              >
                <option value="">All</option>
                {actionOptions.map((a) => (
                  <option key={a} value={a}>
                    {a.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-full space-y-1 sm:w-40">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                User
              </span>
              <input
                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none ring-orange-500/30 focus:ring-2"
                placeholder="Name…"
                value={filters.user}
                onChange={(e) => setFilters((f) => ({ ...f, user: e.target.value }))}
              />
            </label>
            <label className="w-[140px] space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                From
              </span>
              <input
                type="date"
                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none ring-orange-500/30 focus:ring-2"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
            </label>
            <label className="w-[140px] space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">To</span>
              <input
                type="date"
                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm outline-none ring-orange-500/30 focus:ring-2"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </label>
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-200"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {!loading && !rows.length && !error ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
            <ScrollText className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900">No audit trails yet</h2>
          <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
            Sensitive actions like refunds, voids, discounts, and shift open/close will appear here
            automatically.
          </p>
        </div>
      ) : !loading && rows.length > 0 && !filtered.length ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-100">
          <h2 className="text-base font-black text-slate-900">No events match your filters</h2>
          <p className="mt-1 text-sm text-slate-500">Clear filters or widen the date range.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 h-9 rounded-xl"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400 backdrop-blur">
                <tr>
                  <th className="px-3 py-2.5">When</th>
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Entity</th>
                  <th className="px-3 py-2.5">Reason</th>
                  <th className="px-3 py-2.5">Terminal</th>
                </tr>
              </thead>
              <tbody>
                {loading && !rows.length ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-16 text-center text-slate-400">
                      <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#FF6A00]" />
                      Loading audit events…
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={String(r.id)}
                      className="border-t border-slate-50 align-top transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-500">
                        {r.created_at
                          ? new Date(String(r.created_at)).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-bold text-slate-900">{String(r.user_name || '—')}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {String(r.user_role || '')}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <ActionChip action={String(r.action || '')} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-black uppercase text-slate-600">
                          {String(r.entity_type || '—')}
                        </span>
                        <span className="ml-1.5">
                          {String(r.entity_id || '').slice(0, 8) || '—'}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-3 py-2.5 text-slate-600">
                        {String(r.reason || '—')}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {String(r.terminal_id || '—')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-400">
            <span>
              Showing {filtered.length} of {rows.length} events
            </span>
            {loading ? <span className="text-[#FF6A00]">Refreshing…</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}
