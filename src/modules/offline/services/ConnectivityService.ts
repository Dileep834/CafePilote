import { create } from 'zustand';
import type { ConnectivityState } from '../types/entities';
import { supabase } from '@/lib/supabase';

type ConnectivitySnapshot = {
  state: ConnectivityState;
  online: boolean;
  latencyMs: number | null;
  quality: 'good' | 'poor' | 'offline';
  lastCheckedAt: string | null;
  lastError: string | null;
};

type ConnectivityStore = ConnectivitySnapshot & {
  setSyncing: (syncing: boolean) => void;
  setState: (partial: Partial<ConnectivitySnapshot>) => void;
};

export const useConnectivityStore = create<ConnectivityStore>((set, get) => ({
  state: typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline',
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  latencyMs: null,
  quality: typeof navigator !== 'undefined' && navigator.onLine ? 'good' : 'offline',
  lastCheckedAt: null,
  lastError: null,
  setSyncing: (syncing) => {
    if (syncing) set({ state: 'Syncing' });
    else {
      const { online, quality } = get();
      if (!online) set({ state: 'Offline' });
      else if (quality === 'poor') set({ state: 'Poor' });
      else set({ state: 'Online' });
    }
  },
  setState: (partial) => set(partial),
}));

const HEARTBEAT_INTERVAL_MS = 20_000;
const POOR_LATENCY_MS = 2_500;

let started = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

async function heartbeat(): Promise<void> {
  const browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (!browserOnline) {
    useConnectivityStore.getState().setState({
      online: false,
      quality: 'offline',
      state: 'Offline',
      latencyMs: null,
      lastCheckedAt: new Date().toISOString(),
      lastError: 'navigator.offline',
    });
    return;
  }

  const startedAt = performance.now();
  try {
    // Lightweight authenticated round-trip; fails closed to Offline on network errors.
    const { error } = await supabase.from('companies').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - startedAt);
    if (error && /Failed to fetch|NetworkError|fetch/i.test(error.message)) {
      useConnectivityStore.getState().setState({
        online: false,
        quality: 'offline',
        state: 'Offline',
        latencyMs,
        lastCheckedAt: new Date().toISOString(),
        lastError: error.message,
      });
      return;
    }
    const poor = latencyMs >= POOR_LATENCY_MS;
    const syncing = useConnectivityStore.getState().state === 'Syncing';
    useConnectivityStore.getState().setState({
      online: true,
      quality: poor ? 'poor' : 'good',
      state: syncing ? 'Syncing' : poor ? 'Poor' : 'Online',
      latencyMs,
      lastCheckedAt: new Date().toISOString(),
      lastError: error?.message || null,
    });
  } catch (e) {
    useConnectivityStore.getState().setState({
      online: false,
      quality: 'offline',
      state: 'Offline',
      latencyMs: Math.round(performance.now() - startedAt),
      lastCheckedAt: new Date().toISOString(),
      lastError: e instanceof Error ? e.message : 'heartbeat failed',
    });
  }
}

export const ConnectivityService = {
  start(): void {
    if (started || typeof window === 'undefined') return;
    started = true;

    const onOnline = () => {
      void heartbeat();
      window.dispatchEvent(new CustomEvent('cafepilots:connectivity', { detail: { online: true } }));
    };
    const onOffline = () => {
      useConnectivityStore.getState().setState({
        online: false,
        quality: 'offline',
        state: 'Offline',
        lastCheckedAt: new Date().toISOString(),
        lastError: 'browser offline event',
      });
      window.dispatchEvent(new CustomEvent('cafepilots:connectivity', { detail: { online: false } }));
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    void heartbeat();
    heartbeatTimer = setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);
  },

  stop(): void {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    started = false;
  },

  async checkNow(): Promise<ConnectivitySnapshot> {
    await heartbeat();
    const s = useConnectivityStore.getState();
    return {
      state: s.state,
      online: s.online,
      latencyMs: s.latencyMs,
      quality: s.quality,
      lastCheckedAt: s.lastCheckedAt,
      lastError: s.lastError,
    };
  },

  isOnline(): boolean {
    return useConnectivityStore.getState().online;
  },

  getState(): ConnectivityState {
    return useConnectivityStore.getState().state;
  },
};
