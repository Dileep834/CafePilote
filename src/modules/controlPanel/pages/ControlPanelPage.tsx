import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { useHasPermission } from '@/hooks/useHasPermission';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { usePermissionsStore } from '@/store/usePermissionsStore';
import { hasPlanModule } from '@/lib/planLimits';
import { isSuperAdmin } from '@/lib/access';
import { PERMISSIONS } from '@/constants/permissions';
import { cn } from '@/lib/utils';
import { CONTROL_MODULE_CARDS, QUICK_ACTIONS, searchControlCatalog } from '../catalog';
import { CONTROL_MODULE_FLAGS } from '../moduleFlags';
import { useControlPanelData } from '../hooks/useControlPanelData';
import { OperationsMonitoring } from '../components/OperationsMonitoring';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { UpgradeLockedCard } from '@/components/UpgradeLockedCard';
import type { ControlModule, ControlStatus } from '../types';
import type { FeatureFlagKey } from '@/lib/featureFlags';

const STATUS_BADGE: Record<ControlStatus, string> = {
  live: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  partial: 'bg-amber-50 text-amber-700 ring-amber-100',
  planned: 'bg-slate-100 text-slate-500 ring-slate-200',
  demo: 'bg-sky-50 text-sky-700 ring-sky-100',
};

const STATUS_LABEL: Record<ControlStatus, string> = {
  live: 'Live',
  partial: 'Partial',
  planned: 'Planned',
  demo: 'Demo',
};

function ModuleCard({ module }: { module: ControlModule }) {
  const navigate = useNavigate();
  const Icon = module.icon;
  return (
    <button
      type="button"
      onClick={() => navigate(module.href)}
      className="group flex min-h-[168px] flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1',
            STATUS_BADGE[module.status]
          )}
        >
          {STATUS_LABEL[module.status]}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-black text-slate-900">{module.title}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{module.description}</p>
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-[11px] font-bold text-[#FF6A00]">{module.quickActionLabel}</span>
        <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </div>
    </button>
  );
}

export function ControlPanelPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const planId = useTenantStore((s) => s.planId);
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const canAccess = useHasPermission(PERMISSIONS.SETTINGS_MANAGE) || isSuperAdmin(user);
  const { loading, kpis, ops, systemStatus, error, refresh } = useControlPanelData();
  const { has: hasFlag, planLabel, marketingPlan } = useFeatureFlags();
  const [query, setQuery] = useState('');
  const [exportNotice, setExportNotice] = useState('');

  const visibleModules = useMemo(() => {
    return CONTROL_MODULE_CARDS.filter((mod) => {
      const flag = CONTROL_MODULE_FLAGS[mod.id] || mod.featureFlag;
      if (flag && !hasFlag(flag)) return false;
      if (mod.requiredPlanModule && !hasPlanModule(planId, mod.requiredPlanModule)) return false;
      if (isSuperAdmin(user)) return true;
      if (mod.requiredPermission && user?.role && !hasPermission(user.role, mod.requiredPermission)) {
        return false;
      }
      return true;
    });
  }, [hasFlag, hasPermission, planId, user]);

  const lockedModules = useMemo(() => {
    return CONTROL_MODULE_CARDS.filter((mod) => {
      const flag = CONTROL_MODULE_FLAGS[mod.id] || mod.featureFlag;
      if (!flag) return false;
      return !hasFlag(flag);
    }).slice(0, 8);
  }, [hasFlag]);

  const searchHits = useMemo(() => searchControlCatalog(query), [query]);

  const visibleActions = useMemo(() => {
    return QUICK_ACTIONS.filter((action) => {
      if (isSuperAdmin(user)) return true;
      if (!action.requiredPermission) return true;
      return user?.role ? hasPermission(user.role, action.requiredPermission) : false;
    });
  }, [hasPermission, user]);

  const goUpgrade = () => navigate('/erp/settings');

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      kpis,
      ops,
      modules: visibleModules.map((m) => ({ id: m.id, title: m.title, status: m.status, href: m.href })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cafepilots-control-panel-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Configuration snapshot exported.');
    window.setTimeout(() => setExportNotice(''), 2500);
  };

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h1 className="text-lg font-black text-slate-900">Access denied</h1>
          <p className="mt-2 text-sm text-slate-600">
            Control Panel requires Settings manage permission (Owner / Admin).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-[#FF6A00]">Administration</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Control Panel</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage your restaurant platform, users, security, integrations and business configuration.
            <span className="ml-1 font-semibold text-slate-700">({planLabel} plan)</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
            <span>ERP</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-700">Control Panel</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-9 rounded-xl text-xs font-bold" onClick={() => void refresh()}>
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl text-xs font-bold" onClick={handleExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl text-xs font-bold"
            onClick={() => navigate('/erp/platform')}
          >
            <Server className="mr-1.5 h-3.5 w-3.5" />
            Backup
          </Button>
          <span
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-black ring-1',
              systemStatus === 'healthy' && 'bg-emerald-50 text-emerald-700 ring-emerald-100',
              systemStatus === 'warning' && 'bg-amber-50 text-amber-700 ring-amber-100',
              systemStatus === 'critical' && 'bg-rose-50 text-rose-700 ring-rose-100'
            )}
          >
            {systemStatus === 'healthy' ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            System {systemStatus === 'healthy' ? 'OK' : systemStatus}
          </span>
        </div>
      </div>

      {(error || exportNotice) && (
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-xs font-semibold',
            error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
          )}
        >
          {error || exportNotice}
        </div>
      )}

      <div className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search settings — try "GST", "Printer", "Payment", "User"…'
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm font-medium"
          />
        </div>
        {query.trim() && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80">
            {searchHits.length === 0 ? (
              <p className="p-4 text-center text-xs font-semibold text-slate-400">No matching settings</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {searchHits.map((hit) => (
                  <li key={`${hit.moduleId}-${hit.topicLabel}-${hit.href}`}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white"
                      onClick={() => navigate(hit.href)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{hit.topicLabel}</p>
                        <p className="truncate text-[11px] font-medium text-slate-500">{hit.moduleTitle}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1',
                          STATUS_BADGE[(hit.status as ControlStatus) || 'planned']
                        )}
                      >
                        {STATUS_LABEL[(hit.status as ControlStatus) || 'planned']}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="min-h-[140px] animate-pulse rounded-xl bg-white p-4 ring-1 ring-slate-100">
                <div className="h-10 w-10 rounded-xl bg-slate-100" />
                <div className="mt-4 h-3 w-20 rounded bg-slate-100" />
                <div className="mt-2 h-7 w-16 rounded bg-slate-100" />
              </div>
            ))
          : kpis.map((kpi) => (
              <InventoryCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                subtitle={kpi.subtitle}
                icon={Sparkles}
                tone={kpi.tone}
                onClick={kpi.href ? () => navigate(kpi.href!) : undefined}
              />
            ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">Quick actions</h2>
          <p className="text-[11px] font-semibold text-slate-400">Common admin tasks</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {visibleActions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="outline"
              className="h-11 justify-between rounded-xl border-slate-200 text-xs font-bold"
              onClick={() => navigate(action.href)}
            >
              {action.label}
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900">Configuration modules</h2>
            <p className="text-xs text-slate-500">Single place to open every CafePilots admin surface</p>
          </div>
          <p className="text-[11px] font-bold text-slate-400">{visibleModules.length} modules</p>
        </div>
        {visibleModules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-bold text-slate-700">No modules available for your role</p>
            <p className="mt-1 text-xs text-slate-500">Ask an admin to grant Settings or related permissions.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleModules.map((mod) => (
              <ModuleCard key={mod.id} module={mod} />
            ))}
          </div>
        )}
      </section>

      {lockedModules.length > 0 && marketingPlan !== 'enterprise' && (
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-black text-slate-900">Unlock with a higher plan</h2>
            <p className="text-xs text-slate-500">
              These modules stay hidden from day-to-day navigation until you upgrade.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {lockedModules.map((mod) => (
              <UpgradeLockedCard
                key={`locked-${mod.id}`}
                flag={(CONTROL_MODULE_FLAGS[mod.id] || 'controlPanel') as FeatureFlagKey}
                title={mod.title}
                description={mod.description}
                onUpgrade={goUpgrade}
              />
            ))}
          </div>
        </section>
      )}

      {hasFlag('systemHealth') || hasFlag('platformOps') || hasFlag('developerTools') ? (
        <div className="border-t border-slate-200 pt-5">
          <OperationsMonitoring ops={ops} loading={loading} onRefresh={() => void refresh()} />
        </div>
      ) : (
        <div className="border-t border-slate-200 pt-5">
          <UpgradeLockedCard
            flag="systemHealth"
            title="Operations & Monitoring"
            description="Platform health, backups, security center, and developer tools for enterprise operations."
            onUpgrade={goUpgrade}
            className="max-w-xl"
          />
        </div>
      )}
    </div>
  );
}
