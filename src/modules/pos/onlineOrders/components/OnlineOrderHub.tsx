import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Filter,
  LayoutDashboard,
  Search,
  Settings2,
  Volume2,
  VolumeX,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnlineOrdersStore } from '../store';
import { enabledPlatforms } from '../platforms';
import { OnlineOrderCard } from './OnlineOrderCard';
import { OrderAlertCenter } from './OrderAlertCenter';
import { OrderDetailsDrawer } from './OrderDetailsDrawer';
import { ConnectivityStrip } from './OnlineOrderBar';
import { PlatformLogo } from './PlatformLogo';
import { formatMoney } from '../lib';
import type { OnlineOrderStatus, OnlinePaymentKind, OnlinePlatformId } from '../types';
import { playSound } from '../sounds';

type Props = {
  initialPlatform?: OnlinePlatformId | 'all';
  onBack?: () => void;
};

const STATUS_FILTERS: { id: OnlineOrderStatus | 'all' | 'pending' | 'late'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'new', label: 'New' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'late', label: 'Late' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function OnlineOrderHub({ initialPlatform = 'all', onBack }: Props) {
  const hubTab = useOnlineOrdersStore((s) => s.hubTab);
  const setHubTab = useOnlineOrdersStore((s) => s.setHubTab);
  const filters = useOnlineOrdersStore((s) => s.filters);
  const setFilters = useOnlineOrdersStore((s) => s.setFilters);
  const allOrders = useOnlineOrdersStore((s) => s.orders);
  const setSelectedOrderId = useOnlineOrdersStore((s) => s.setSelectedOrderId);
  const selectedOrderId = useOnlineOrdersStore((s) => s.selectedOrderId);
  const tickTimeouts = useOnlineOrdersStore((s) => s.tickTimeouts);
  const pushIncomingOrder = useOnlineOrdersStore((s) => s.pushIncomingOrder);
  const simulatorOn = useOnlineOrdersStore((s) => s.simulatorOn);
  const setSimulatorOn = useOnlineOrdersStore((s) => s.setSimulatorOn);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [, clock] = useState(0);

  useEffect(() => {
    if (initialPlatform !== 'all') {
      setFilters({ platform: initialPlatform });
    }
  }, [initialPlatform, setFilters]);

  useEffect(() => {
    const t = window.setInterval(() => {
      tickTimeouts();
      clock((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [tickTimeouts]);

  const orders = useMemo(
    () => useOnlineOrdersStore.getState().filteredOrders(),
    [allOrders, filters, clock]
  );

  const openOrder = (id: string) => {
    setSelectedOrderId(id);
    setDrawerOpen(true);
    setHubTab('live');
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-slate-50">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200/80 bg-white px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 xl:hidden"
            >
              Back
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black tracking-normal text-slate-900 sm:text-lg">
              Online Order Hub
            </h1>
            <div className="mt-1 hidden sm:block">
              <ConnectivityStrip />
            </div>
          </div>
          <button
            type="button"
            onClick={() => pushIncomingOrder()}
            className="hidden h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 text-[11px] font-bold text-slate-600 sm:inline-flex"
            title="Simulate incoming order"
          >
            <Zap className="h-3.5 w-3.5" />
            Demo order
          </button>
          <OrderAlertCenter onOpenOrder={openOrder} />
        </div>

        <nav className="mt-2.5 flex gap-1 overflow-x-auto scrollbar-hide">
          {(
            [
              { id: 'live' as const, label: 'Live', Icon: LayoutDashboard },
              { id: 'dashboard' as const, label: 'Metrics', Icon: BarChart3 },
              { id: 'reports' as const, label: 'Reports', Icon: RefreshCw },
              { id: 'settings' as const, label: 'Settings', Icon: Settings2 },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setHubTab(id)}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition',
                hubTab === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {hubTab === 'live' && (
        <>
          <div className="shrink-0 space-y-2 border-b border-slate-100 bg-white px-3 py-2 sm:px-4">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.query}
                  onChange={(e) => setFilters({ query: e.target.value })}
                  placeholder="Search order, customer, rider…"
                  className="h-9 w-full rounded-xl border-0 bg-slate-50 pl-8 pr-3 text-xs font-medium text-slate-800 outline-none ring-1 ring-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  'inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-bold',
                  showFilters ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <Chip
                active={filters.platform === 'all'}
                onClick={() => setFilters({ platform: 'all' })}
                label="All platforms"
              />
              {enabledPlatforms().map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFilters({ platform: p.id })}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold transition',
                    filters.platform === p.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-600'
                  )}
                >
                  <PlatformLogo platformId={p.id} size="sm" className="!h-5 !w-5 !text-[8px]" />
                  {p.label}
                </button>
              ))}
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {STATUS_FILTERS.map((s) => (
                  <Chip
                    key={s.id}
                    active={filters.status === s.id}
                    onClick={() => setFilters({ status: s.id })}
                    label={s.label}
                  />
                ))}
                {(['all', 'prepaid', 'cod', 'online', 'card'] as const).map((pay) => (
                  <Chip
                    key={pay}
                    active={filters.payment === pay}
                    onClick={() => setFilters({ payment: pay as OnlinePaymentKind | 'all' })}
                    label={pay === 'all' ? 'Any pay' : pay.toUpperCase()}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {orders.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-slate-700">No orders match</p>
                <p className="mt-1 text-xs text-slate-400">Adjust filters or wait for incoming orders</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                {orders.map((o) => (
                  <OnlineOrderCard
                    key={o.id}
                    order={o}
                    onOpen={() => openOrder(o.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {hubTab === 'dashboard' && <MetricsPanel />}
      {hubTab === 'reports' && <ReportsPanel />}
      {hubTab === 'settings' && (
        <SettingsPanel simulatorOn={simulatorOn} setSimulatorOn={setSimulatorOn} />
      )}

      <OrderDetailsDrawer
        open={drawerOpen && !!selectedOrderId}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrderId(null);
        }}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-bold transition',
        active ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
      )}
    >
      {label}
    </button>
  );
}

function MetricsPanel() {
  const orders = useOnlineOrdersStore((s) => s.orders);
  const m = useMemo(() => useOnlineOrdersStore.getState().metrics(), [orders]);
  const platforms = enabledPlatforms();

  const cards = [
    { label: "Today's Online Sales", value: formatMoney(m.todaySales), accent: '#FF6A00' },
    { label: 'Acceptance Rate', value: `${m.acceptanceRate}%`, accent: '#16A34A' },
    { label: 'Avg Prep Time', value: `${m.avgPrepMinutes} min`, accent: '#2563EB' },
    { label: 'Late Orders', value: String(m.late), accent: '#E23744' },
    { label: 'Cancelled', value: String(m.cancelled), accent: '#64748B' },
    { label: 'Refunds', value: String(m.refunds), accent: '#7C3AED' },
    { label: 'Avg Delivery', value: `${m.avgDeliveryMinutes} min`, accent: '#0D1B2A' },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className="mt-1 text-lg font-black tabular-nums" style={{ color: c.accent }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">
        Revenue by platform
      </h3>
      <div className="space-y-2">
        {platforms.map((p) => {
          const row = m.byPlatform[p.id] || { orders: 0, revenue: 0 };
          const max = Math.max(...platforms.map((x) => m.byPlatform[x.id]?.revenue || 0), 1);
          const pct = Math.round((row.revenue / max) * 100);
          return (
            <div key={p.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-2">
                <PlatformLogo platformId={p.id} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{p.label}</span>
                    <span className="text-xs font-black tabular-nums text-slate-900">
                      {formatMoney(row.revenue)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">{row.orders} orders</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-150"
                      style={{ width: `${pct}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportsPanel() {
  const orders = useOnlineOrdersStore((s) => s.orders);
  const m = useMemo(() => useOnlineOrdersStore.getState().metrics(), [orders]);

  const itemCounts = new Map<string, number>();
  for (const o of orders) {
    if (['cancelled', 'rejected', 'expired'].includes(o.status)) continue;
    for (const item of o.items) {
      itemCounts.set(item.name, (itemCounts.get(item.name) || 0) + item.quantity);
    }
  }
  const bestsellers = [...itemCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const hours = Array.from({ length: 24 }, (_, h) => {
    const n = orders.filter((o) => new Date(o.createdAt).getHours() === h).length;
    return { h, n };
  });
  const peak = Math.max(...hours.map((x) => x.n), 1);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
      <p className="text-xs text-slate-500">
        Platform reports for today — export connectors can plug into this view later.
      </p>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2.5 font-bold">Platform</th>
              <th className="px-3 py-2.5 font-bold">Orders</th>
              <th className="px-3 py-2.5 font-bold">Revenue</th>
              <th className="px-3 py-2.5 font-bold">Avg bill</th>
              <th className="px-3 py-2.5 font-bold">Cancel %</th>
            </tr>
          </thead>
          <tbody>
            {enabledPlatforms().map((p) => {
              const row = m.byPlatform[p.id] || { orders: 0, revenue: 0 };
              const cancelled = orders.filter(
                (o) =>
                  o.platformId === p.id &&
                  ['cancelled', 'rejected', 'expired'].includes(o.status)
              ).length;
              const cancelRate = row.orders ? Math.round((cancelled / row.orders) * 100) : 0;
              const avg = row.orders ? row.revenue / Math.max(row.orders - cancelled, 1) : 0;
              return (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                      <PlatformLogo platformId={p.id} size="sm" className="!h-5 !w-5 !text-[8px]" />
                      {p.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold">{row.orders}</td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold">{formatMoney(row.revenue)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{formatMoney(avg)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{cancelRate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <h3 className="text-xs font-bold text-slate-800">Best sellers</h3>
          <ul className="mt-2 space-y-1.5">
            {bestsellers.map(([name, qty]) => (
              <li key={name} className="flex justify-between text-xs">
                <span className="font-medium text-slate-600">{name}</span>
                <span className="font-bold tabular-nums text-slate-900">{qty}</span>
              </li>
            ))}
            {bestsellers.length === 0 && (
              <li className="text-xs text-slate-400">No item data yet</li>
            )}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <h3 className="text-xs font-bold text-slate-800">Peak hours</h3>
          <div className="mt-3 flex h-24 items-end gap-0.5">
            {hours.map(({ h, n }) => (
              <div
                key={h}
                className="flex-1 rounded-t bg-slate-200"
                style={{
                  height: `${Math.max(4, (n / peak) * 100)}%`,
                  backgroundColor: n === peak && n > 0 ? '#FF6A00' : undefined,
                }}
                title={`${h}:00 — ${n} orders`}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">0–23h · orange = peak</p>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({
  simulatorOn,
  setSimulatorOn,
}: {
  simulatorOn: boolean;
  setSimulatorOn: (v: boolean) => void;
}) {
  const settings = useOnlineOrdersStore((s) => s.settings);
  const updateSettings = useOnlineOrdersStore((s) => s.updateSettings);
  const toggleMutePlatform = useOnlineOrdersStore((s) => s.toggleMutePlatform);
  const connections = useOnlineOrdersStore((s) => s.connections);
  const setConnection = useOnlineOrdersStore((s) => s.setConnection);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Auto accept</h3>
        <Toggle
          label="Auto-accept new orders"
          checked={settings.autoAccept}
          onChange={(v) => updateSettings({ autoAccept: v })}
        />
        <NumberField
          label="Auto-reject after (seconds)"
          value={settings.autoRejectSeconds}
          onChange={(v) => updateSettings({ autoRejectSeconds: v })}
        />
        <NumberField
          label="Default kitchen prep (min)"
          value={settings.defaultKitchenMinutes}
          onChange={(v) => updateSettings({ defaultKitchenMinutes: v })}
        />
        <NumberField
          label="Pickup delay buffer (min)"
          value={settings.pickupDelayMinutes}
          onChange={(v) => updateSettings({ pickupDelayMinutes: v })}
        />
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Printing</h3>
        <Toggle
          label="Auto print KOT on accept"
          checked={settings.autoPrintKot}
          onChange={(v) => updateSettings({ autoPrintKot: v })}
        />
        <Toggle
          label="Auto print bill on accept"
          checked={settings.autoPrintBill}
          onChange={(v) => updateSettings({ autoPrintBill: v })}
        />
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Notification sounds</h3>
          <button
            type="button"
            onClick={() => updateSettings({ soundsEnabled: !settings.soundsEnabled })}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-slate-50 px-2.5 text-[11px] font-bold text-slate-600"
          >
            {settings.soundsEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {settings.soundsEnabled ? 'On' : 'Muted'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {enabledPlatforms().map((p) => {
            const muted = settings.mutedPlatforms.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleMutePlatform(p.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold',
                  muted ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white'
                )}
              >
                <PlatformLogo platformId={p.id} size="sm" className="!h-5 !w-5 !text-[8px]" />
                {p.label}
                {muted ? ' · muted' : ''}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {(['swiggy', 'zomato', 'website', 'high_priority', 'late_pickup'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => playSound(kind)}
              className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-semibold capitalize text-slate-500 hover:bg-slate-100"
            >
              Test {kind.replace('_', ' ')}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Connectivity</h3>
        {enabledPlatforms().map((p) => {
          const c = connections.find((x) => x.platformId === p.id);
          const ok = c?.connected !== false;
          return (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <PlatformLogo platformId={p.id} size="sm" />
                {p.label}
              </span>
              <button
                type="button"
                onClick={() => setConnection(p.id, !ok)}
                className={cn(
                  'rounded-xl px-2.5 py-1 text-[11px] font-bold',
                  ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                )}
              >
                {ok ? 'Connected' : 'Reconnect'}
              </button>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <Toggle
          label="Demo order simulator"
          checked={simulatorOn}
          onChange={setSimulatorOn}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Injects sample marketplace orders for training / QA.
        </p>
      </section>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <span
        className={cn(
          'relative h-6 w-10 rounded-full transition',
          checked ? 'bg-[#FF6A00]' : 'bg-slate-200'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition duration-150',
            checked ? 'left-4' : 'left-0.5'
          )}
        />
      </span>
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8 w-20 rounded-xl border-0 bg-slate-50 px-2 text-right text-xs font-bold tabular-nums outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-orange-200"
      />
    </label>
  );
}
