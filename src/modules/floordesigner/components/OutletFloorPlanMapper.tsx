import React, { useEffect, useMemo, useState } from 'react';
import { BRAND } from '@/constants';
import { Map as MapIcon, Check, Loader2 } from 'lucide-react';
import {
  floorPlanTemplateService,
  type OutletFloorPlanMap,
} from '../services/floorPlanTemplateService';
import type { FloorPlanTemplateMeta } from '../lib/templateCatalog';
import { cn } from '@/lib/utils';

type OutletLite = {
  id: string;
  name: string;
  code?: string;
};

type Props = {
  outlets: OutletLite[];
  companyId?: string | null;
  /** Called after a template is applied so Floor Designer can refresh */
  onApplied?: (outletId: string, floorId: string) => void;
};

export function OutletFloorPlanMapper({ outlets, companyId, onApplied }: Props) {
  const [templates, setTemplates] = useState<FloorPlanTemplateMeta[]>([]);
  const [maps, setMaps] = useState<Record<string, OutletFloorPlanMap>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [tpls, outletMaps] = await Promise.all([
        floorPlanTemplateService.listTemplates(),
        floorPlanTemplateService.listOutletMaps(companyId),
      ]);
      if (cancelled) return;
      setTemplates(tpls);
      const byOutlet: Record<string, OutletFloorPlanMap> = {};
      for (const m of outletMaps) byOutlet[m.outletId] = m;
      setMaps(byOutlet);
      const nextDraft: Record<string, string> = {};
      for (const o of outlets) {
        nextDraft[o.id] = byOutlet[o.id]?.templateId || tpls[0]?.id || '';
      }
      setDraft(nextDraft);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, outlets]);

  const templateById = useMemo(() => {
    const m = new Map<string, FloorPlanTemplateMeta>();
    for (const t of templates) m.set(t.id, t);
    return m;
  }, [templates]);

  const saveAndApply = async (outletId: string) => {
    const templateId = draft[outletId];
    if (!templateId) {
      setError('Select a floor plan first.');
      return;
    }
    setBusyId(outletId);
    setError(null);
    setMessage(null);

    const assigned = await floorPlanTemplateService.assignTemplateToOutlet({
      outletId,
      templateId,
      companyId,
    });
    setMaps((prev) => ({ ...prev, [outletId]: assigned }));

    const result = await floorPlanTemplateService.applyTemplateToOutlet({
      outletId,
      templateId,
      companyId,
    });

    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    const refreshed = await floorPlanTemplateService.getOutletMap(outletId);
    if (refreshed) setMaps((prev) => ({ ...prev, [outletId]: refreshed }));

    const name = templateById.get(templateId)?.name || 'Floor plan';
    setMessage(`Applied “${name}” to this branch. Open Floor Designer to fine-tune.`);
    onApplied?.(outletId, result.floorId);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
        Loading floor plan templates…
      </div>
    );
  }

  if (outlets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        Add a branch first, then map a ready-made floor plan to it.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 bg-[#F3F3F8] flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: BRAND.navy }}
        >
          <MapIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: BRAND.navy }}>
            Floor plan → branch mapping
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose a ready-made layout for each outlet. Apply creates tables and the live floor for
            that branch.
          </p>
        </div>
      </div>

      {(message || error) && (
        <div
          className={cn(
            'px-5 py-2.5 text-xs font-medium border-b',
            error
              ? 'bg-rose-50 text-rose-700 border-rose-100'
              : 'bg-emerald-50 text-emerald-800 border-emerald-100'
          )}
        >
          {error || message}
        </div>
      )}

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <th className="px-5 py-3 font-semibold">Branch</th>
              <th className="px-5 py-3 font-semibold">Floor plan template</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {outlets.map((outlet) => {
              const map = maps[outlet.id];
              const selected = draft[outlet.id] || '';
              const tpl = templateById.get(selected);
              const applied =
                map?.templateId === selected && !!map.appliedAt && map.templateId === selected;
              const busy = busyId === outlet.id;

              return (
                <tr key={outlet.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-800 text-sm">{outlet.name}</p>
                    {outlet.code && (
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">{outlet.code}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 min-w-[220px]">
                    <select
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/25"
                      value={selected}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [outlet.id]: e.target.value }))
                      }
                      disabled={busy}
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {t.previewHint}
                        </option>
                      ))}
                    </select>
                    {tpl && (
                      <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                        {tpl.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {applied ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                        <Check className="w-3 h-3" />
                        Applied
                      </span>
                    ) : map?.templateId ? (
                      <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                        Saved · not applied
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400">Not mapped</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      disabled={busy || !selected}
                      onClick={() => void saveAndApply(outlet.id)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                      style={{ backgroundColor: BRAND.orange }}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Applying…
                        </>
                      ) : (
                        'Save & apply'
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col divide-y divide-slate-100">
        {outlets.map((outlet) => {
          const map = maps[outlet.id];
          const selected = draft[outlet.id] || '';
          const tpl = templateById.get(selected);
          const applied =
            map?.templateId === selected && !!map.appliedAt && map.templateId === selected;
          const busy = busyId === outlet.id;

          return (
            <div key={outlet.id} className="p-4 bg-white hover:bg-slate-50/80 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{outlet.name}</p>
                  {outlet.code && (
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">{outlet.code}</p>
                  )}
                </div>
                <div>
                  {applied ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      <Check className="w-3 h-3" />
                      Applied
                    </span>
                  ) : map?.templateId ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                      Saved
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">Not mapped</span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <select
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/25"
                  value={selected}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [outlet.id]: e.target.value }))
                  }
                  disabled={busy}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.previewHint}
                    </option>
                  ))}
                </select>
                {tpl && (
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                    {tpl.description}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-50">
                <button
                  type="button"
                  disabled={busy || !selected}
                  onClick={() => void saveAndApply(outlet.id)}
                  className="inline-flex justify-center items-center gap-1.5 h-10 w-full rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: BRAND.orange }}
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Applying…
                    </>
                  ) : (
                    'Save & apply'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80">
        <p className="text-[11px] text-slate-500">
          Templates: {templates.map((t) => t.name).join(' · ')}. Run{' '}
          <code className="text-[10px] bg-white px-1 rounded border">floor_plan_templates_schema.sql</code>{' '}
          in Supabase to store mappings in the cloud.
        </p>
      </div>
    </div>
  );
}
