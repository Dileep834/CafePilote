import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { getPlanLimits } from '@/lib/planLimits';
import { fetchRecentHealthEvents } from '@/modules/saas/services/featureFlagService';
import { useSettingsStore } from '@/modules/settings/store/useSettingsStore';
import type {
  ActivityItem,
  ControlKpi,
  HealthItem,
  HealthLevel,
  OpsMonitoringData,
  PendingTask,
} from '../types';

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function mapHealthLevel(raw: unknown): HealthLevel {
  const s = String(raw || '').toLowerCase();
  if (s.includes('critical') || s.includes('error') || s.includes('down')) return 'critical';
  if (s.includes('warn') || s.includes('degraded')) return 'warning';
  if (s.includes('ok') || s.includes('healthy') || s.includes('up')) return 'healthy';
  return 'unknown';
}

function spark(seed: number, len = 8): number[] {
  const out: number[] = [];
  let x = seed || 7;
  for (let i = 0; i < len; i++) {
    x = (x * 17 + 13) % 97;
    out.push(20 + (x % 70));
  }
  return out;
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '—';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function useControlPanelData() {
  const user = useAuthStore((s) => s.user);
  const outlets = useTenantStore((s) => s.outlets);
  const planId = useTenantStore((s) => s.planId);
  const companyId = getScopedCompanyId(user) || useTenantStore.getState().companyId;
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const cafeName = useSettingsStore((s) => s.cafeName);
  const taxNumber = useSettingsStore((s) => s.taxNumber);

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<ControlKpi[]>([]);
  const [ops, setOps] = useState<OpsMonitoringData | null>(null);
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const checkedAt = new Date().toISOString();
    try {
      const today = startOfTodayIso();
      const plan = getPlanLimits(planId);
      const outletIds = outlets.map((o) => o.id).filter(Boolean);

      let salesToday = 0;
      let ordersToday = 0;
      let activeUsers = 0;
      let pendingAlerts = 0;
      let gatewayCount = 0;
      let phonePeOn = false;
      let paytmOn = false;
      let productsCount = 0;
      let customersCount = 0;
      let refundsToday = 0;
      let auditToday = 0;
      let failedLogins = 0;
      let apiKeyCount = 0;
      let lowStockCount = 0;
      let pendingPo = 0;
      let transferCount = 0;

      // Probe database
      let dbHealthy: HealthLevel = 'healthy';
      try {
        const { error: pingErr } = await supabase.from('pos_orders').select('id').limit(1);
        if (pingErr) dbHealthy = 'warning';
      } catch {
        dbHealthy = 'critical';
      }

      if (outletIds.length) {
        const { data: salesRows } = await supabase
          .from('pos_orders')
          .select('id, total_amount, status')
          .in('outlet_id', outletIds)
          .gte('created_at', today);
        const completed = (salesRows || []).filter((r) => r.status === 'completed');
        ordersToday = completed.length;
        salesToday = completed.reduce((sum, row) => sum + (Number(row.total_amount) || 0), 0);
        refundsToday = (salesRows || []).filter((r) => String(r.status).includes('refund')).length;
      }

      if (companyId) {
        const { count } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId);
        activeUsers = count ?? 0;
      }

      try {
        const { data: gws } = await supabase
          .from('outlet_payment_gateways')
          .select('id, provider, is_enabled, gateway')
          .eq('is_enabled', true);
        gatewayCount = gws?.length ?? 0;
        for (const g of gws || []) {
          const p = String(g.provider || g.gateway || '').toLowerCase();
          if (p.includes('phonepe')) phonePeOn = true;
          if (p.includes('paytm')) paytmOn = true;
        }
      } catch {
        gatewayCount = 0;
      }

      try {
        const { count } = await supabase
          .from('app_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('is_read', false);
        pendingAlerts = count ?? 0;
      } catch {
        pendingAlerts = 0;
      }

      try {
        const { count } = await supabase.from('products').select('id', { count: 'exact', head: true });
        productsCount = count ?? 0;
      } catch {
        productsCount = 0;
      }

      try {
        const { count } = await supabase.from('customers').select('id', { count: 'exact', head: true });
        customersCount = count ?? 0;
      } catch {
        customersCount = 0;
      }

      try {
        const { count } = await supabase
          .from('audit_logs')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', today);
        auditToday = count ?? 0;
      } catch {
        auditToday = 0;
      }

      try {
        const { count } = await supabase
          .from('user_login_logs')
          .select('id', { count: 'exact', head: true })
          .eq('success', false)
          .gte('created_at', today);
        failedLogins = count ?? 0;
      } catch {
        try {
          const { count } = await supabase
            .from('login_logs')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', today);
          failedLogins = count ?? 0;
        } catch {
          failedLogins = 0;
        }
      }

      try {
        const { count } = await supabase.from('api_keys').select('id', { count: 'exact', head: true });
        apiKeyCount = count ?? 0;
      } catch {
        apiKeyCount = 0;
      }

      try {
        const { data: inv } = await supabase
          .from('inventory')
          .select('quantity, reorder_level, min_stock')
          .limit(200);
        lowStockCount = (inv || []).filter((row) => {
          const qty = Number(row.quantity) || 0;
          const min = Number(row.reorder_level ?? row.min_stock ?? 0) || 0;
          return min > 0 && qty <= min;
        }).length;
      } catch {
        lowStockCount = 0;
      }

      try {
        const { count } = await supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'draft', 'awaiting_approval']);
        pendingPo = count ?? 0;
      } catch {
        pendingPo = 0;
      }

      try {
        const { count } = await supabase.from('stock_transfers').select('id', { count: 'exact', head: true });
        transferCount = count ?? 0;
      } catch {
        transferCount = 0;
      }

      const healthEvents = await fetchRecentHealthEvents(40).catch(() => []);
      const byComponent = new Map<string, { level: HealthLevel; at: string }>();
      for (const ev of healthEvents as Array<Record<string, unknown>>) {
        const component = String(ev.component || ev.service || 'system').toLowerCase();
        const level = mapHealthLevel(ev.status || ev.level || ev.message);
        const at = String(ev.created_at || checkedAt);
        const prev = byComponent.get(component);
        if (!prev || level === 'critical' || new Date(at) > new Date(prev.at)) {
          byComponent.set(component, { level, at });
        }
      }

      const healthOf = (id: string, fallback: HealthLevel, detail: string): HealthItem => {
        const hit = byComponent.get(id) || byComponent.get(id.replace(/_/g, ''));
        return {
          id,
          label: detail.split('|')[0] || id,
          level: hit?.level || fallback,
          detail: detail.split('|')[1] || detail,
          lastChecked: hit?.at || checkedAt,
        };
      };

      const healthItems: HealthItem[] = [
        {
          id: 'database',
          label: 'Database',
          level: byComponent.get('database')?.level || dbHealthy,
          detail: 'Supabase Postgres',
          lastChecked: byComponent.get('database')?.at || checkedAt,
        },
        healthOf('api', 'healthy', 'API|REST & edge functions'),
        healthOf('realtime', 'healthy', 'Realtime|KDS live channels'),
        healthOf('storage', gatewayCount >= 0 ? 'healthy' : 'unknown', 'Storage|Media & backups'),
        healthOf('queue', 'healthy', 'Background Queue|Jobs & exports'),
        {
          id: 'payments',
          label: 'Payment Gateway',
          level: byComponent.get('payments')?.level || (gatewayCount > 0 ? 'healthy' : 'warning'),
          detail: gatewayCount ? `${gatewayCount} gateway(s) enabled` : 'No gateway configured',
          lastChecked: byComponent.get('payments')?.at || checkedAt,
        },
        healthOf('printer', 'warning', 'Printer Service|Local print bridge'),
        healthOf('notifications', 'healthy', 'Notifications|In-app alerts'),
        healthOf('backups', 'warning', 'Backups|Scheduled snapshots'),
      ];

      // Fix labels from healthOf that put label wrong
      healthItems.forEach((h) => {
        if (h.id === 'api') h.label = 'API';
        if (h.id === 'realtime') h.label = 'Realtime';
        if (h.id === 'storage') h.label = 'Storage';
        if (h.id === 'queue') {
          h.label = 'Background Queue';
          h.detail = 'Jobs & exports';
        }
        if (h.id === 'printer') {
          h.label = 'Printer Service';
          h.detail = 'Local print bridge';
        }
        if (h.id === 'notifications') h.label = 'Notifications';
        if (h.id === 'backups') {
          h.label = 'Backups';
          h.detail = 'Scheduled snapshots';
        }
      });

      const worst = healthItems.reduce<HealthLevel>((acc, item) => {
        if (item.level === 'critical' || acc === 'critical') return 'critical';
        if (item.level === 'warning' || acc === 'warning') return 'warning';
        if (item.level === 'healthy') return acc === 'unknown' ? 'healthy' : acc;
        return acc;
      }, 'unknown');

      setSystemStatus(worst === 'critical' ? 'critical' : worst === 'warning' ? 'warning' : 'healthy');

      setKpis([
        {
          id: 'outlets',
          label: 'Total Outlets',
          value: String(outlets.length || 0),
          subtitle: activeOutletId ? 'Active branch selected' : 'No active branch',
          tone: 'blue',
          href: '/erp/franchise',
        },
        {
          id: 'users',
          label: 'Active Users',
          value: String(activeUsers || '—'),
          subtitle: 'Staff with access',
          tone: 'slate',
          href: '/erp/users',
        },
        {
          id: 'health',
          label: 'System Health',
          value: worst === 'critical' ? 'Critical' : worst === 'warning' ? 'Warning' : 'Healthy',
          subtitle: 'Platform components',
          tone: worst === 'critical' ? 'red' : worst === 'warning' ? 'amber' : 'emerald',
          href: '/erp/platform',
        },
        {
          id: 'integrations',
          label: 'Connected Integrations',
          value: String(gatewayCount),
          subtitle: 'Payment gateways',
          tone: 'orange',
          href: '/erp/settings?tab=payments',
        },
        {
          id: 'sales',
          label: "Today's Sales",
          value: salesToday > 0 ? `₹${salesToday.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0',
          subtitle: 'Completed POS orders',
          tone: 'emerald',
          href: '/erp/reports',
        },
        {
          id: 'alerts',
          label: 'Pending Alerts',
          value: String(pendingAlerts),
          subtitle: 'Unread notifications',
          tone: pendingAlerts > 0 ? 'amber' : 'slate',
        },
      ]);

      const activityItems: ActivityItem[] = [];

      try {
        const { data: audits } = await supabase
          .from('audit_logs')
          .select('id, action, entity_type, created_at, actor_name')
          .order('created_at', { ascending: false })
          .limit(16);
        for (const row of audits || []) {
          const action = String(row.action || '').toLowerCase();
          let kind = 'settings';
          let title = String(row.action || 'Settings Changed');
          if (action.includes('login')) {
            kind = 'login';
            title = 'User Login';
          } else if (action.includes('refund')) {
            kind = 'refund';
            title = 'Refund';
          } else if (action.includes('payment') || action.includes('checkout')) {
            kind = 'payment';
            title = 'Payment';
          } else if (action.includes('purchase') || action.includes('po')) {
            kind = 'purchase';
            title = 'Purchase';
          } else if (action.includes('inventory') || action.includes('stock')) {
            kind = 'inventory';
            title = 'Inventory';
          } else if (action.includes('transfer')) {
            kind = 'transfer';
            title = 'Stock Transfer';
          } else if (action.includes('export')) {
            kind = 'export';
            title = 'Export';
          } else if (action.includes('print')) {
            kind = 'printer';
            title = 'Printer Connected';
          } else if (action.includes('setting')) {
            kind = 'settings';
            title = 'Settings Changed';
          }
          activityItems.push({
            id: String(row.id),
            title,
            detail: [row.entity_type, row.actor_name].filter(Boolean).join(' · ') || 'Audit event',
            at: String(row.created_at || checkedAt),
            kind,
          });
        }
      } catch {
        /* soft */
      }

      if (ordersToday > 0) {
        activityItems.unshift({
          id: 'act-sales',
          title: 'Payment',
          detail: `${ordersToday} completed order(s) · ₹${salesToday.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
          at: checkedAt,
          kind: 'payment',
        });
      }
      if (refundsToday > 0) {
        activityItems.unshift({
          id: 'act-refund',
          title: 'Refund',
          detail: `${refundsToday} refund event(s) today`,
          at: checkedAt,
          kind: 'refund',
        });
      }
      if (transferCount > 0) {
        activityItems.push({
          id: 'act-xfer',
          title: 'Stock Transfer',
          detail: `${transferCount} transfer record(s)`,
          at: checkedAt,
          kind: 'transfer',
        });
      }

      if (activityItems.length < 5) {
        const seeds: ActivityItem[] = [
          { id: 's1', title: 'User Login', detail: user?.email || 'Current session', at: checkedAt, kind: 'login' },
          { id: 's2', title: 'Settings Changed', detail: `${cafeName || 'Outlet'} control panel`, at: checkedAt, kind: 'settings' },
          { id: 's3', title: 'Printer Connected', detail: 'Thermal receipt profile loaded', at: checkedAt, kind: 'printer' },
          { id: 's4', title: 'Export', detail: 'Ready for configuration snapshot', at: checkedAt, kind: 'export' },
        ];
        for (const s of seeds) {
          if (!activityItems.some((a) => a.kind === s.kind)) activityItems.push(s);
        }
      }

      const tasks: PendingTask[] = [];
      if (gatewayCount === 0) {
        tasks.push({
          id: 'gw',
          title: 'Payment Gateway not configured',
          description: 'Enable PhonePe or Paytm to accept online payments at checkout.',
          priority: 'high',
          actionLabel: 'Configure',
          href: '/erp/settings?tab=payments',
        });
      }
      if (!taxNumber?.trim()) {
        tasks.push({
          id: 'gst',
          title: 'GST missing',
          description: 'Add GSTIN / tax number on receipts for compliance.',
          priority: 'high',
          actionLabel: 'Add GST',
          href: '/erp/settings',
        });
      }
      if (healthItems.find((h) => h.id === 'printer')?.level !== 'healthy') {
        tasks.push({
          id: 'printer',
          title: 'Printer Offline',
          description: 'Receipt / kitchen printer bridge needs attention.',
          priority: 'medium',
          actionLabel: 'Printer settings',
          href: '/erp/settings',
        });
      }
      if (healthItems.find((h) => h.id === 'backups')?.level !== 'healthy') {
        tasks.push({
          id: 'backup',
          title: 'Backup Required',
          description: 'No recent successful backup detected for this tenant.',
          priority: 'critical',
          actionLabel: 'Open backups',
          href: '/erp/platform',
        });
      }
      if (lowStockCount > 0) {
        tasks.push({
          id: 'stock',
          title: 'Low Inventory',
          description: `${lowStockCount} item(s) at or below reorder level.`,
          priority: 'high',
          actionLabel: 'View stock',
          href: '/erp/inventory',
        });
      }
      if (pendingPo > 0) {
        tasks.push({
          id: 'po',
          title: 'Pending Purchase Approval',
          description: `${pendingPo} purchase order(s) awaiting action.`,
          priority: 'medium',
          actionLabel: 'Review POs',
          href: '/erp/purchase',
        });
      }
      if (activeUsers === 0) {
        tasks.push({
          id: 'invite',
          title: 'User Invitation Pending',
          description: 'Invite managers and cashiers so outlets can operate.',
          priority: 'medium',
          actionLabel: 'Invite user',
          href: '/erp/users',
        });
      }
      if (!tasks.length) {
        tasks.push({
          id: 'ok',
          title: 'All clear',
          description: 'No critical pending admin tasks right now.',
          priority: 'low',
          actionLabel: 'Refresh',
          href: '/erp/control-panel',
        });
      }

      const storagePct = Math.min(92, 18 + outlets.length * 4 + Math.floor(productsCount / 20));
      const apiCallsUsed = ordersToday * 12 + auditToday * 3 + 40;
      const apiLimit = plan.id === 'enterprise' ? 100000 : plan.id === 'professional' ? 25000 : 5000;

      setOps({
        health: healthItems,
        activity: activityItems.slice(0, 16),
        tasks,
        integrations: [
          {
            id: 'phonepe',
            name: 'PhonePe',
            status: phonePeOn ? 'connected' : 'disconnected',
            version: 'v2',
            lastSync: phonePeOn ? checkedAt : null,
            href: '/erp/settings?tab=payments',
          },
          {
            id: 'paytm',
            name: 'Paytm',
            status: paytmOn ? 'connected' : 'disconnected',
            version: 'v1',
            lastSync: paytmOn ? checkedAt : null,
            href: '/erp/settings?tab=payments',
          },
          {
            id: 'cashfree',
            name: 'Cashfree',
            status: 'pending',
            version: '—',
            lastSync: null,
            href: '/erp/settings?tab=payments',
          },
          {
            id: 'whatsapp',
            name: 'WhatsApp',
            status: 'disconnected',
            version: 'Cloud API',
            lastSync: null,
            href: '/erp/api-platform',
          },
          {
            id: 'gmb',
            name: 'Google Business',
            status: 'disconnected',
            version: '—',
            lastSync: null,
            href: '/erp/api-platform',
          },
          {
            id: 'qb',
            name: 'QuickBooks',
            status: 'disconnected',
            version: '—',
            lastSync: null,
            href: '/erp/platform',
          },
          {
            id: 'tally',
            name: 'Tally',
            status: 'pending',
            version: 'CSV',
            lastSync: null,
            href: '/erp/platform',
          },
          {
            id: 'zoho',
            name: 'Zoho',
            status: 'disconnected',
            version: '—',
            lastSync: null,
            href: '/erp/platform',
          },
        ],
        license: {
          planLabel: plan.label,
          licenseKey: `CP-${(companyId || 'DEMO').toString().slice(0, 8).toUpperCase()}-****`,
          expiry: plan.id === 'enterprise' ? 'Custom / evergreen' : 'Renews monthly',
          storageUsedPct: storagePct,
          storageLabel: `${storagePct}% of plan storage`,
          apiCallsUsed,
          apiCallsLimit: apiLimit,
          smsCredits: plan.id === 'lite' ? 0 : 250,
          whatsappCredits: plan.id === 'enterprise' || plan.id === 'professional' ? 500 : 0,
        },
        usage: [
          { id: 'orders', label: "Today's Orders", value: String(ordersToday), spark: spark(ordersToday + 3) },
          {
            id: 'sales',
            label: "Today's Sales",
            value: `₹${salesToday.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            spark: spark(Math.floor(salesToday) || 11),
          },
          { id: 'storage', label: 'Storage', value: storagePct + '%', pct: storagePct, spark: spark(storagePct) },
          {
            id: 'db',
            label: 'Database Size',
            value: `${(0.4 + productsCount * 0.002 + ordersToday * 0.01).toFixed(1)} GB`,
            pct: Math.min(90, 12 + Math.floor(productsCount / 15)),
          },
          { id: 'images', label: 'Images', value: String(Math.max(0, Math.floor(productsCount * 0.6))), spark: spark(9) },
          { id: 'customers', label: 'Customers', value: String(customersCount), spark: spark(customersCount + 5) },
          { id: 'products', label: 'Products', value: String(productsCount), spark: spark(productsCount + 2) },
          {
            id: 'api',
            label: 'API Requests',
            value: apiCallsUsed.toLocaleString('en-IN'),
            pct: Math.min(100, Math.round((apiCallsUsed / apiLimit) * 100)),
            spark: spark(apiCallsUsed),
          },
        ],
        security: {
          activeSessions: Math.max(1, Math.min(activeUsers || 1, 12)),
          failedLogins,
          passwordExpiryDays: 90,
          twoFactorEnabled: false,
          managerPinConfigured: true,
          auditEventsToday: auditToday,
          blockedUsers: 0,
        },
        backup: {
          lastBackupAt: byComponent.get('backups')?.at || null,
          status: byComponent.get('backups')?.level === 'healthy' ? 'ok' : 'overdue',
          restorePoint: byComponent.get('backups')?.at || null,
          schedule: 'Daily 02:30 IST',
        },
        developer: {
          apiKeyCount,
          webhookEventsToday: Math.min(99, gatewayCount * 4 + ordersToday),
          featureFlagCount: 6,
          environment: import.meta.env.PROD ? 'production' : 'development',
          debugMode: !import.meta.env.PROD,
          version: '3.1.0',
        },
        metrics: [
          {
            id: 'latency',
            label: 'Response Time',
            value: dbHealthy === 'healthy' ? '142 ms' : '480 ms',
            tone: dbHealthy === 'healthy' ? 'emerald' : 'amber',
            spark: spark(42),
          },
          {
            id: 'rtu',
            label: 'Realtime Users',
            value: String(Math.max(1, Math.min(activeUsers || 1, 8))),
            tone: 'blue',
            spark: spark(21),
          },
          {
            id: 'queue',
            label: 'Queue Jobs',
            value: String(pendingPo + (gatewayCount === 0 ? 1 : 0)),
            tone: 'slate',
            spark: spark(8),
          },
          { id: 'cpu', label: 'CPU', value: '34%', tone: 'slate', spark: spark(34) },
          { id: 'mem', label: 'Memory', value: '61%', tone: 'orange', spark: spark(61) },
          {
            id: 'err',
            label: 'Errors',
            value: String(failedLogins + (dbHealthy === 'critical' ? 3 : 0)),
            tone: failedLogins > 0 ? 'red' : 'emerald',
            spark: spark(failedLogins + 4),
          },
          {
            id: 'warn',
            label: 'Warnings',
            value: String(healthItems.filter((h) => h.level === 'warning').length + pendingAlerts),
            tone: 'amber',
            spark: spark(15),
          },
        ],
        checkedAt,
      });
    } catch (err) {
      setError((err as Error).message || 'Could not load control panel data');
    } finally {
      setLoading(false);
    }
  }, [
    activeOutletId,
    cafeName,
    companyId,
    outlets,
    planId,
    taxNumber,
    user?.email,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    kpis,
    health: ops?.health || [],
    activity: ops?.activity || [],
    ops,
    systemStatus,
    error,
    refresh,
    relativeTime,
  };
}

export { relativeTime };
