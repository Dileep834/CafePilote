import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  OnlineAlert,
  OnlineHubFilters,
  OnlineHubSettings,
  OnlineOrder,
  OnlineOrderStatus,
  OnlineOrderToast,
  OnlinePlatformId,
  PlatformConnection,
} from './types';
import { SEED_ALERTS, SEED_CONNECTIONS, SEED_ORDERS, createDemoIncomingOrder } from './seed';
import { playPlatformSound, playSound } from './sounds';
import { acceptSecondsLeft, isActivePipeline, isLate } from './lib';
import { enabledPlatforms } from './platforms';

const DEFAULT_SETTINGS: OnlineHubSettings = {
  autoAccept: false,
  autoRejectSeconds: 90,
  defaultKitchenMinutes: 15,
  pickupDelayMinutes: 5,
  autoPrintKot: true,
  autoPrintBill: false,
  soundsEnabled: true,
  mutedPlatforms: [],
};

const DEFAULT_FILTERS: OnlineHubFilters = {
  platform: 'all',
  payment: 'all',
  status: 'all',
  query: '',
};

type OnlineOrdersState = {
  orders: OnlineOrder[];
  connections: PlatformConnection[];
  alerts: OnlineAlert[];
  toasts: OnlineOrderToast[];
  settings: OnlineHubSettings;
  filters: OnlineHubFilters;
  selectedOrderId: string | null;
  hubTab: 'live' | 'dashboard' | 'settings' | 'reports';
  simulatorOn: boolean;

  setFilters: (partial: Partial<OnlineHubFilters>) => void;
  setHubTab: (tab: OnlineOrdersState['hubTab']) => void;
  setSelectedOrderId: (id: string | null) => void;
  updateSettings: (partial: Partial<OnlineHubSettings>) => void;
  toggleMutePlatform: (id: OnlinePlatformId) => void;
  setConnection: (platformId: OnlinePlatformId, connected: boolean) => void;
  setSimulatorOn: (on: boolean) => void;

  pushIncomingOrder: (order?: OnlineOrder) => void;
  acceptOrder: (id: string) => void;
  rejectOrder: (id: string) => void;
  setOrderStatus: (id: string, status: OnlineOrderStatus) => void;
  dismissToast: (toastId: string) => void;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;
  tickTimeouts: () => void;

  activeCountByPlatform: () => Record<string, number>;
  unreadAlertCount: () => number;
  filteredOrders: () => OnlineOrder[];
  metrics: () => {
    todaySales: number;
    byPlatform: Record<string, { orders: number; revenue: number }>;
    cancelled: number;
    refunds: number;
    late: number;
    acceptanceRate: number;
    avgPrepMinutes: number;
    avgDeliveryMinutes: number;
  };
};

function pushAlert(
  alerts: OnlineAlert[],
  partial: Omit<OnlineAlert, 'id' | 'createdAt' | 'read'>
): OnlineAlert[] {
  return [
    {
      id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...partial,
    },
    ...alerts,
  ].slice(0, 80);
}

function withKitchenOnAccept(order: OnlineOrder, settings: OnlineHubSettings): OnlineOrder {
  const now = Date.now();
  const kitchen = order.kitchenMinutes || settings.defaultKitchenMinutes;
  const pickupMs = (kitchen + settings.pickupDelayMinutes) * 60_000;
  return {
    ...order,
    status: 'accepted',
    acceptedAt: new Date(now).toISOString(),
    prepStartedAt: new Date(now).toISOString(),
    kitchenMinutes: kitchen,
    pickupEtaAt: new Date(now + pickupMs).toISOString(),
  };
}

export const useOnlineOrdersStore = create<OnlineOrdersState>()(
  persist(
    (set, get) => ({
      orders: SEED_ORDERS,
      connections: SEED_CONNECTIONS,
      alerts: SEED_ALERTS,
      toasts: SEED_ORDERS.filter((o) => o.status === 'new').map((o) => ({
        id: `toast-${o.id}`,
        orderId: o.id,
        createdAt: o.createdAt,
      })),
      settings: DEFAULT_SETTINGS,
      filters: DEFAULT_FILTERS,
      selectedOrderId: null,
      hubTab: 'live',
      simulatorOn: true,

      setFilters: (partial) => set((s) => ({ filters: { ...s.filters, ...partial } })),
      setHubTab: (hubTab) => set({ hubTab }),
      setSelectedOrderId: (selectedOrderId) => set({ selectedOrderId }),
      updateSettings: (partial) => set((s) => ({ settings: { ...s.settings, ...partial } })),
      toggleMutePlatform: (id) =>
        set((s) => {
          const muted = s.settings.mutedPlatforms.includes(id)
            ? s.settings.mutedPlatforms.filter((p) => p !== id)
            : [...s.settings.mutedPlatforms, id];
          return { settings: { ...s.settings, mutedPlatforms: muted } };
        }),
      setConnection: (platformId, connected) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.platformId === platformId
              ? { ...c, connected, lastSyncAt: new Date().toISOString() }
              : c
          ),
          alerts: connected
            ? s.alerts
            : pushAlert(s.alerts, {
                kind: 'store_offline',
                title: `${platformId} disconnected`,
                body: 'Reconnect to keep receiving orders',
                platformId,
              }),
        })),
      setSimulatorOn: (simulatorOn) => set({ simulatorOn }),

      pushIncomingOrder: (incoming) => {
        const order = incoming || createDemoIncomingOrder();
        const { settings } = get();

        if (settings.autoAccept) {
          const accepted = withKitchenOnAccept(order, settings);
          accepted.status = 'preparing';
          set((s) => ({
            orders: [accepted, ...s.orders],
            alerts: pushAlert(s.alerts, {
              kind: 'new_order',
              title: `Auto-accepted ${order.platformId}`,
              body: `#${order.externalId} · kitchen ticket created`,
              orderId: accepted.id,
              platformId: order.platformId,
            }),
          }));
          playPlatformSound(order.platformId, settings.mutedPlatforms, settings.soundsEnabled);
          return;
        }

        set((s) => ({
          orders: [order, ...s.orders],
          toasts: [
            { id: `toast-${order.id}`, orderId: order.id, createdAt: order.createdAt },
            ...s.toasts,
          ].slice(0, 6),
          alerts: pushAlert(s.alerts, {
            kind: 'new_order',
            title: `New ${order.platformId} order`,
            body: `#${order.externalId}`,
            orderId: order.id,
            platformId: order.platformId,
          }),
        }));
        playPlatformSound(order.platformId, settings.mutedPlatforms, settings.soundsEnabled);
        if (order.priority === 'high' && settings.soundsEnabled) {
          playSound('high_priority');
        }
      },

      acceptOrder: (id) => {
        const { settings } = get();
        set((s) => {
          const order = s.orders.find((o) => o.id === id);
          if (!order || order.status !== 'new') return s;
          const accepted = withKitchenOnAccept(order, settings);
          const preparing = { ...accepted, status: 'preparing' as const };
          return {
            orders: s.orders.map((o) => (o.id === id ? preparing : o)),
            toasts: s.toasts.filter((t) => t.orderId !== id),
            alerts: pushAlert(s.alerts, {
              kind: 'new_order',
              title: 'Kitchen ticket created',
              body: `#${order.externalId} · queue updated · customer notified`,
              orderId: id,
              platformId: order.platformId,
            }),
            selectedOrderId: s.selectedOrderId || id,
          };
        });
      },

      rejectOrder: (id) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id && o.status === 'new' ? { ...o, status: 'rejected' as const } : o
          ),
          toasts: s.toasts.filter((t) => t.orderId !== id),
        }));
      },

      setOrderStatus: (id, status) => {
        set((s) => {
          const order = s.orders.find((o) => o.id === id);
          if (!order) return s;
          const patch: Partial<OnlineOrder> = { status };
          if (status === 'preparing' && !order.prepStartedAt) {
            patch.prepStartedAt = new Date().toISOString();
          }
          if (status === 'ready') {
            patch.readyAt = new Date().toISOString();
          }
          if (status === 'picked_up' && order.partner) {
            patch.partner = { ...order.partner, status: 'picked' };
          }
          if (status === 'delivered' && order.partner) {
            patch.partner = { ...order.partner, status: 'completed' };
          }
          let alerts = s.alerts;
          if (status === 'ready') {
            alerts = pushAlert(alerts, {
              kind: 'driver_arrived',
              title: 'Order ready for handover',
              body: `#${order.externalId}`,
              orderId: id,
              platformId: order.platformId,
            });
          }
          return {
            orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
            alerts,
          };
        });
      },

      dismissToast: (toastId) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toastId) })),

      markAlertRead: (alertId) =>
        set((s) => ({
          alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a)),
        })),

      markAllAlertsRead: () =>
        set((s) => ({ alerts: s.alerts.map((a) => ({ ...a, read: true })) })),

      tickTimeouts: () => {
        const { settings, orders } = get();
        const now = Date.now();
        let changed = false;
        const next = orders.map((o) => {
          if (o.status !== 'new') {
            if (isLate(o, now) && isActivePipeline(o.status)) {
              /* late handled in UI / metrics */
            }
            return o;
          }
          const left = acceptSecondsLeft(o, now);
          if (left === 0 && settings.autoRejectSeconds > 0) {
            changed = true;
            return { ...o, status: 'expired' as const };
          }
          return o;
        });
        if (!changed) return;
        set((s) => ({
          orders: next,
          toasts: s.toasts.filter((t) => {
            const o = next.find((x) => x.id === t.orderId);
            return o && o.status === 'new';
          }),
        }));
      },

      activeCountByPlatform: () => {
        const counts: Record<string, number> = {};
        for (const p of enabledPlatforms()) counts[p.id] = 0;
        for (const o of get().orders) {
          if (!isActivePipeline(o.status)) continue;
          counts[o.platformId] = (counts[o.platformId] || 0) + 1;
        }
        return counts;
      },

      unreadAlertCount: () => get().alerts.filter((a) => !a.read).length,

      filteredOrders: () => {
        const { orders, filters } = get();
        const q = filters.query.trim().toLowerCase();
        const now = Date.now();
        return orders.filter((o) => {
          if (filters.platform !== 'all' && o.platformId !== filters.platform) return false;
          if (filters.payment !== 'all' && o.payment !== filters.payment) return false;
          if (filters.status === 'pending') {
            if (!['new', 'accepted', 'preparing', 'ready'].includes(o.status)) return false;
          } else if (filters.status === 'late') {
            if (!isLate(o, now)) return false;
          } else if (filters.status !== 'all' && o.status !== filters.status) {
            return false;
          }
          if (!q) return true;
          return (
            o.externalId.toLowerCase().includes(q) ||
            o.customer.name.toLowerCase().includes(q) ||
            (o.customer.phone || '').includes(q) ||
            (o.partner?.name || '').toLowerCase().includes(q)
          );
        });
      },

      metrics: () => {
        const orders = get().orders;
        const byPlatform: Record<string, { orders: number; revenue: number }> = {};
        let todaySales = 0;
        let cancelled = 0;
        let refunds = 0;
        let late = 0;
        let acceptedLike = 0;
        let decided = 0;
        let prepSum = 0;
        let prepN = 0;
        let delSum = 0;
        let delN = 0;
        const now = Date.now();

        for (const o of orders) {
          if (!byPlatform[o.platformId]) byPlatform[o.platformId] = { orders: 0, revenue: 0 };
          byPlatform[o.platformId].orders += 1;
          if (!['cancelled', 'rejected', 'expired', 'refunded'].includes(o.status)) {
            byPlatform[o.platformId].revenue += o.money.total;
            todaySales += o.money.total;
          }
          if (o.status === 'cancelled' || o.status === 'rejected' || o.status === 'expired') cancelled += 1;
          if (o.status === 'refunded') refunds += 1;
          if (isLate(o, now)) late += 1;
          if (['accepted', 'preparing', 'ready', 'picked_up', 'delivered'].includes(o.status)) {
            acceptedLike += 1;
            decided += 1;
          } else if (['rejected', 'expired', 'cancelled'].includes(o.status)) {
            decided += 1;
          }
          if (o.acceptedAt && o.readyAt) {
            prepSum += (new Date(o.readyAt).getTime() - new Date(o.acceptedAt).getTime()) / 60000;
            prepN += 1;
          }
          if (o.readyAt && (o.status === 'picked_up' || o.status === 'delivered')) {
            const end = o.pickupEtaAt ? new Date(o.pickupEtaAt).getTime() : now;
            delSum += Math.max(0, (end - new Date(o.readyAt).getTime()) / 60000);
            delN += 1;
          }
        }

        return {
          todaySales,
          byPlatform,
          cancelled,
          refunds,
          late,
          acceptanceRate: decided ? Math.round((acceptedLike / decided) * 100) : 100,
          avgPrepMinutes: prepN ? Math.round(prepSum / prepN) : 0,
          avgDeliveryMinutes: delN ? Math.round(delSum / delN) : 0,
        };
      },
    }),
    {
      name: 'cafepilots-online-orders',
      partialize: (s) => ({
        settings: s.settings,
        connections: s.connections,
        simulatorOn: s.simulatorOn,
      }),
    }
  )
);
