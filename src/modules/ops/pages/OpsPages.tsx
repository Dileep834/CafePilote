import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId, useTenantStore } from '@/store/useTenantStore';
import { fetchAuditLogs } from '../services/auditService';

export function AuditLogsPage() {
  const user = useAuthStore((s) => s.user);
  const outletId = getTenantOutletId(user) || useTenantStore.getState().activeOutletId;
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      setRows(await fetchAuditLogs({ outletId, limit: 150 }));
    } catch (err) {
      setError((err as Error).message || 'Audit table missing — run phase1_production_schema.sql');
      setRows([]);
    }
  };

  useEffect(() => {
    void load();
  }, [outletId]);

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black text-slate-900">Audit log</h1>
          <p className="text-xs text-slate-500">Immutable trail of sensitive POS & ops actions</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
      {error && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)} className="border-t border-slate-50 align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                    {new Date(String(r.created_at)).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-800">{String(r.user_name || '—')}</p>
                    <p className="text-[10px] text-slate-400">{String(r.user_role || '')}</p>
                  </td>
                  <td className="px-3 py-2 font-bold capitalize text-slate-800">{String(r.action)}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-500">
                    {String(r.entity_type || '')}:{String(r.entity_id || '').slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{String(r.reason || '—')}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                    No audit rows yet
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
