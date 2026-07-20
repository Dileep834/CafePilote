import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { fetchExecutiveBi, persistBiSnapshot } from '../services/biService';
import type { ExecutiveBiSummary } from '../types';

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</p>}
    </div>
  );
}

export function ExecutiveBiPage() {
  const user = useAuthStore((s) => s.user);
  const companyId = getScopedCompanyId(user) || useTenantStore.getState().companyId;
  const outletId = getTenantOutletId(user) || useTenantStore.getState().activeOutletId;
  const [data, setData] = useState<ExecutiveBiSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const summary = await fetchExecutiveBi({ companyId, outletId });
      setData(summary);
      void persistBiSnapshot({ companyId, outletId, summary });
    } catch (err) {
      setError((err as Error).message || 'Failed to load BI');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [companyId, outletId]);

  const maxHour = Math.max(1, ...(data?.hourly.map((h) => h.sales) || [1]));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            Executive Intelligence
          </h1>
          <p className="text-xs text-slate-500">Live sales, peak hours, branch comparison, food cost</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Today" value={formatCurrency(data?.todaySales || 0)} hint={`${data?.orderCountToday || 0} orders`} />
        <Metric label="7 days" value={formatCurrency(data?.weekSales || 0)} />
        <Metric label="30 days" value={formatCurrency(data?.monthSales || 0)} />
        <Metric
          label="Avg ticket"
          value={formatCurrency(data?.avgTicketToday || 0)}
          hint={`Refunds ${formatCurrency(data?.refundsToday || 0)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-sm font-black text-slate-900">Peak hours (today)</h2>
          <div className="mt-3 flex h-28 items-end gap-0.5">
            {(data?.hourly || []).map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t bg-orange-500/80"
                  style={{ height: `${Math.max(4, (h.sales / maxHour) * 100)}%` }}
                  title={`${h.hour}:00 · ${formatCurrency(h.sales)}`}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-400">0–23h</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-900">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Best sellers today
          </h2>
          <ul className="space-y-2">
            {(data?.topItems || []).map((item) => (
              <li key={item.name} className="flex items-center justify-between text-xs">
                <span className="truncate font-semibold text-slate-800">{item.name}</span>
                <span className="shrink-0 font-bold text-slate-600">
                  {item.qty} · {formatCurrency(item.revenue)}
                </span>
              </li>
            ))}
            {!data?.topItems?.length && (
              <li className="py-6 text-center text-slate-400">No item sales yet</li>
            )}
          </ul>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">
            Food cost estimate: {formatCurrency(data?.foodCostEstimate || 0)}
            {data && data.todaySales > 0
              ? ` (${((data.foodCostEstimate / data.todaySales) * 100).toFixed(1)}%)`
              : ''}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-black text-slate-900">Branch comparison (today)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Outlet</th>
                <th className="px-3 py-2">Sales</th>
                <th className="px-3 py-2">Orders</th>
                <th className="px-3 py-2">Avg</th>
                <th className="px-3 py-2">Refunds</th>
              </tr>
            </thead>
            <tbody>
              {(data?.branches || []).map((b) => (
                <tr key={b.outletId} className="border-t border-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-800">{b.outletName}</td>
                  <td className="px-3 py-2">{formatCurrency(b.sales)}</td>
                  <td className="px-3 py-2">{b.orders}</td>
                  <td className="px-3 py-2">{formatCurrency(b.avgTicket)}</td>
                  <td className="px-3 py-2 text-slate-500">{formatCurrency(b.refunds)}</td>
                </tr>
              ))}
              {!data?.branches?.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                    No outlets to compare
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
