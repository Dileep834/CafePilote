import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export type AppNotification = {
  id: string;
  outletId?: string | null;
  kind: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  severity: 'info' | 'warn' | 'critical';
  createdAt: string;
  read: boolean;
};

type NotificationState = {
  items: AppNotification[];
  pushLocal: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { id?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: () => number;
  hydrateFromServer: (outletId?: string | null) => Promise<void>;
};

/** Avoid spamming REST when phase SQL table is not deployed yet */
let appNotificationsUnavailable = false;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      items: [],

      pushLocal: (n) =>
        set((s) => ({
          items: [
            {
              id: n.id || `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              createdAt: new Date().toISOString(),
              read: false,
              severity: n.severity || 'info',
              ...n,
            },
            ...s.items,
          ].slice(0, 100),
        })),

      markRead: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)),
        })),

      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),

      unreadCount: () => get().items.filter((i) => !i.read).length,

      hydrateFromServer: async (outletId) => {
        if (!outletId || appNotificationsUnavailable) return;
        try {
          const { data, error } = await supabase
            .from('app_notifications')
            .select('*')
            .eq('outlet_id', outletId)
            .order('created_at', { ascending: false })
            .limit(50);
          if (error) {
            // 404 / missing relation — fall back to local-only notifications
            const code = String(error.code || '');
            const msg = String(error.message || '').toLowerCase();
            if (
              code === 'PGRST205' ||
              code === '42P01' ||
              msg.includes('does not exist') ||
              msg.includes('not find') ||
              (error as { status?: number }).status === 404
            ) {
              appNotificationsUnavailable = true;
            }
            return;
          }
          if (!data?.length) return;
          set({
            items: data.map((row) => ({
              id: row.id,
              outletId: row.outlet_id,
              kind: row.kind,
              title: row.title,
              body: row.body || undefined,
              entityType: row.entity_type || undefined,
              entityId: row.entity_id || undefined,
              severity: (row.severity as AppNotification['severity']) || 'info',
              createdAt: row.created_at,
              read: Boolean(row.read_at),
            })),
          });
        } catch {
          appNotificationsUnavailable = true;
        }
      },
    }),
    { name: 'cafepilots-notifications', partialize: (s) => ({ items: s.items.slice(0, 40) }) }
  )
);

export async function pushAppNotification(params: {
  outletId?: string | null;
  userId?: string | null;
  kind: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  severity?: 'info' | 'warn' | 'critical';
}): Promise<void> {
  useNotificationStore.getState().pushLocal({
    outletId: params.outletId,
    kind: params.kind,
    title: params.title,
    body: params.body,
    entityType: params.entityType,
    entityId: params.entityId,
    severity: params.severity || 'info',
  });

  // Browser notification (permission-gated)
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(params.title, { body: params.body || '', tag: params.kind });
    }
  } catch {
    /* ignore */
  }

  try {
    if (appNotificationsUnavailable) return;
    const { error } = await supabase.from('app_notifications').insert([
      {
        outlet_id: params.outletId || null,
        user_id: params.userId || null,
        kind: params.kind,
        title: params.title,
        body: params.body || null,
        entity_type: params.entityType || null,
        entity_id: params.entityId || null,
        severity: params.severity || 'info',
      },
    ]);
    if (error) {
      appNotificationsUnavailable = true;
    }
  } catch {
    appNotificationsUnavailable = true;
  }
}

export async function requestDesktopNotificationPermission(): Promise<void> {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
}
