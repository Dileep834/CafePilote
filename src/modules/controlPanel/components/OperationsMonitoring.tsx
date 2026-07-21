import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  Flag,
  HardDrive,
  KeyRound,
  Lock,
  RefreshCw,
  Server,
  Shield,
  Webhook,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  HealthLevel,
  IntegrationStatus,
  OpsMonitoringData,
  TaskPriority,
} from '../types';
import { relativeTime } from '../hooks/useControlPanelData';

type Props = {
  ops: OpsMonitoringData | null;
  loading: boolean;
  onRefresh: () => void;
};

const HEALTH_TONE: Record<HealthLevel, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-700 ring-amber-100',
  critical: 'bg-rose-50 text-rose-700 ring-rose-100',
  unknown: 'bg-slate-100 text-slate-500 ring-slate-200',
};

const PRIORITY_TONE: Record<TaskPriority, string> = {
  critical: 'bg-rose-50 text-rose-700 ring-rose-100',
  high: 'bg-orange-50 text-orange-700 ring-orange-100',
  medium: 'bg-amber-50 text-amber-700 ring-amber-100',
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const INT_TONE: Record<IntegrationStatus, string> = {
  connected: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  disconnected: 'bg-slate-100 text-slate-500 ring-slate-200',
  pending: 'bg-sky-50 text-sky-700 ring-sky-100',
};

function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2">
      <div>
        <h2 className="text-sm font-black text-slate-900">{title}</h2>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5', className)}>
      {children}
    </section>
  );
}

function Spark({ values, tone = '#FF6A00' }: { values?: number[]; tone?: string }) {
  if (!values?.length) return null;
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div className="mt-2 h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Area type="monotone" dataKey="v" stroke={tone} fill={tone} fillOpacity={0.12} strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Progress({ pct, tone = 'bg-[#FF6A00]' }: { pct: number; tone?: string }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

function SkeletonGrid({ count, className }: { count: number; className?: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('h-24 animate-pulse rounded-xl bg-slate-100', className)} />
      ))}
    </>
  );
}

export function OperationsMonitoring({ ops, loading, onRefresh }: Props) {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-[#FF6A00]">Operations & Monitoring</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Platform operations console</h2>
          <p className="mt-1 text-sm text-slate-500">
            Health, activity, security, license and developer visibility for this tenant.
          </p>
        </div>
        <Button type="button" variant="outline" className="h-9 rounded-xl text-xs font-bold" onClick={onRefresh}>
          <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh ops
        </Button>
      </div>

      {/* 1. Platform Health */}
      <Panel>
        <SectionTitle title="Platform health" subtitle="Live component status · last checked per service" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading || !ops ? (
            <SkeletonGrid count={9} />
          ) : (
            ops.health.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">{item.label}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.detail}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1',
                      HEALTH_TONE[item.level]
                    )}
                  >
                    {item.level}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <Clock3 className="h-3 w-3" />
                  Last checked · {relativeTime(item.lastChecked)}
                </p>
              </div>
            ))
          )}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* 2. Recent Activity */}
        <Panel className="lg:col-span-3">
          <SectionTitle
            title="Recent activity"
            subtitle="Logins, payments, inventory and settings"
            action={
              <button
                type="button"
                className="text-[11px] font-bold text-[#FF6A00] hover:underline"
                onClick={() => navigate('/erp/audit')}
              >
                Audit →
              </button>
            }
          />
          <ol className="relative max-h-[420px] space-y-0 overflow-y-auto border-l border-slate-200 pl-4">
            {loading || !ops ? (
              <SkeletonGrid count={6} className="mb-3 h-12" />
            ) : (
              ops.activity.map((item) => (
                <li key={item.id} className="relative pb-4 last:pb-0">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#FF6A00] ring-4 ring-white" />
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-black text-slate-900">{item.title}</p>
                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      {item.kind}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{item.detail}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {new Date(item.at).toLocaleString()}
                  </p>
                </li>
              ))
            )}
          </ol>
        </Panel>

        {/* 3. Pending Tasks */}
        <Panel className="lg:col-span-2">
          <SectionTitle title="Pending tasks" subtitle="Action required" />
          <div className="space-y-2.5">
            {loading || !ops ? (
              <SkeletonGrid count={4} className="h-20" />
            ) : (
              ops.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-slate-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-black text-slate-900">{task.title}</p>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1',
                        PRIORITY_TONE[task.priority]
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">{task.description}</p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2 h-8 rounded-lg bg-slate-900 text-[11px] font-bold text-white hover:bg-slate-800"
                    onClick={() => navigate(task.href)}
                  >
                    {task.actionLabel}
                  </Button>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {/* 4. Integrations */}
      <Panel>
        <SectionTitle title="Integrations" subtitle="Connection status · version · last sync" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {loading || !ops ? (
            <SkeletonGrid count={8} />
          ) : (
            ops.integrations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.href)}
                className="rounded-xl border border-slate-100 bg-white p-3.5 text-left shadow-sm ring-1 ring-slate-50 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-900">{item.name}</p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1',
                      INT_TONE[item.status]
                    )}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-500">Version · {item.version}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Last sync · {item.lastSync ? relativeTime(item.lastSync) : 'Never'}
                </p>
              </button>
            ))
          )}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 5. License */}
        <Panel>
          <SectionTitle title="License" subtitle="Plan entitlements & credits" />
          {loading || !ops ? (
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Current Plan', value: ops.license.planLabel },
                  { label: 'License', value: ops.license.licenseKey },
                  { label: 'Expiry', value: ops.license.expiry },
                  { label: 'SMS Credits', value: String(ops.license.smsCredits) },
                  { label: 'WhatsApp Credits', value: String(ops.license.whatsappCredits) },
                  {
                    label: 'API Calls',
                    value: `${ops.license.apiCallsUsed.toLocaleString('en-IN')} / ${ops.license.apiCallsLimit.toLocaleString('en-IN')}`,
                  },
                ].map((row) => (
                  <div key={row.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{row.label}</p>
                    <p className="mt-1 truncate text-sm font-black text-slate-900">{row.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Storage used</span>
                  <span>{ops.license.storageLabel}</span>
                </div>
                <Progress pct={ops.license.storageUsedPct} />
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>API quota</span>
                  <span>
                    {Math.min(100, Math.round((ops.license.apiCallsUsed / ops.license.apiCallsLimit) * 100))}%
                  </span>
                </div>
                <Progress
                  pct={(ops.license.apiCallsUsed / ops.license.apiCallsLimit) * 100}
                  tone="bg-sky-500"
                />
              </div>
            </div>
          )}
        </Panel>

        {/* 7. Security Center */}
        <Panel>
          <SectionTitle
            title="Security center"
            subtitle="Sessions, PIN, audit"
            action={<Shield className="h-4 w-4 text-slate-400" />}
          />
          {loading || !ops ? (
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Active Sessions', value: String(ops.security.activeSessions), icon: Activity },
                { label: 'Failed Login', value: String(ops.security.failedLogins), icon: AlertTriangle },
                {
                  label: 'Password Expiry',
                  value: ops.security.passwordExpiryDays != null ? `${ops.security.passwordExpiryDays}d` : '—',
                  icon: Lock,
                },
                {
                  label: '2FA',
                  value: ops.security.twoFactorEnabled ? 'Enabled' : 'Off',
                  icon: Shield,
                },
                {
                  label: 'Manager PIN',
                  value: ops.security.managerPinConfigured ? 'Configured' : 'Missing',
                  icon: KeyRound,
                },
                { label: 'Audit Summary', value: `${ops.security.auditEventsToday} today`, icon: Database },
                { label: 'Blocked Users', value: String(ops.security.blockedUsers), icon: Lock },
              ].map((row) => (
                <div key={row.label} className="rounded-xl border border-slate-100 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <row.icon className="h-3 w-3" />
                    {row.label}
                  </div>
                  <p className="mt-1 text-sm font-black text-slate-900">{row.value}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* 6. System Usage */}
      <Panel>
        <SectionTitle title="System usage" subtitle="Orders, catalog and API demand" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {loading || !ops ? (
            <SkeletonGrid count={8} />
          ) : (
            ops.usage.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-1 text-xl font-black tabular-nums text-slate-950">{item.value}</p>
                {typeof item.pct === 'number' ? <Progress pct={item.pct} /> : null}
                <Spark values={item.spark} />
              </div>
            ))
          )}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 8. Backup Center */}
        <Panel>
          <SectionTitle title="Backup center" subtitle="Restore points & schedule" />
          {loading || !ops ? (
            <div className="h-36 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Last Backup</p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {ops.backup.lastBackupAt ? new Date(ops.backup.lastBackupAt).toLocaleString() : 'Never'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{relativeTime(ops.backup.lastBackupAt)}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                <span className="text-xs font-bold text-slate-600">Backup Status</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-black uppercase ring-1',
                    ops.backup.status === 'ok'
                      ? HEALTH_TONE.healthy
                      : ops.backup.status === 'running'
                        ? INT_TONE.pending
                        : HEALTH_TONE.warning
                  )}
                >
                  {ops.backup.status}
                </span>
              </div>
              <div className="rounded-xl border border-slate-100 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Restore Point</p>
                <p className="mt-1 text-xs font-bold text-slate-800">
                  {ops.backup.restorePoint ? new Date(ops.backup.restorePoint).toLocaleString() : '—'}
                </p>
              </div>
              <p className="text-[11px] font-semibold text-slate-500">Schedule · {ops.backup.schedule}</p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl text-xs font-bold"
                  onClick={() => navigate('/erp/platform')}
                >
                  <HardDrive className="mr-1.5 h-3.5 w-3.5" />
                  Manual Backup
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl text-xs font-bold"
                  onClick={() => navigate('/erp/platform')}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download Backup
                </Button>
                <Button
                  type="button"
                  className="h-9 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800"
                  onClick={() => navigate('/erp/platform')}
                >
                  <Server className="mr-1.5 h-3.5 w-3.5" />
                  Schedule Backup
                </Button>
              </div>
            </div>
          )}
        </Panel>

        {/* 9. Developer Center */}
        <Panel>
          <SectionTitle title="Developer center" subtitle="Keys, flags, environment" />
          {loading || !ops ? (
            <div className="h-36 animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <div className="space-y-2">
              {[
                { label: 'API Keys', value: String(ops.developer.apiKeyCount), icon: KeyRound, href: '/erp/api-platform' },
                {
                  label: 'Webhook Logs',
                  value: `${ops.developer.webhookEventsToday} today`,
                  icon: Webhook,
                  href: '/erp/api-platform',
                },
                {
                  label: 'Feature Flags',
                  value: String(ops.developer.featureFlagCount),
                  icon: Flag,
                  href: '/erp/platform',
                },
                {
                  label: 'Environment',
                  value: ops.developer.environment,
                  icon: Server,
                  href: '/erp/api-platform',
                },
                {
                  label: 'Debug Mode',
                  value: ops.developer.debugMode ? 'On' : 'Off',
                  icon: Activity,
                  href: '/erp/api-platform',
                },
                { label: 'Version', value: ops.developer.version, icon: CheckCircle2, href: '/erp/control-panel' },
              ].map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => navigate(row.href)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                    <row.icon className="h-3.5 w-3.5 text-slate-400" />
                    {row.label}
                  </span>
                  <span className="text-xs font-black text-slate-900">{row.value}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        {/* 10. Platform Metrics */}
        <Panel>
          <SectionTitle title="Platform metrics" subtitle="Latency, resources, errors" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {loading || !ops ? (
              <SkeletonGrid count={7} className="h-16" />
            ) : (
              ops.metrics.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{m.label}</p>
                    <p className="text-sm font-black tabular-nums text-slate-900">{m.value}</p>
                  </div>
                  <Spark
                    values={m.spark}
                    tone={
                      m.tone === 'red'
                        ? '#e11d48'
                        : m.tone === 'amber'
                          ? '#d97706'
                          : m.tone === 'emerald'
                            ? '#059669'
                            : m.tone === 'blue'
                              ? '#0284c7'
                              : '#FF6A00'
                    }
                  />
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
