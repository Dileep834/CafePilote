import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useOnlineOrdersStore } from '../store';
import { enabledPlatforms, getPlatform } from '../platforms';
import { PlatformLogo } from './PlatformLogo';
import type { OnlinePlatformId } from '../types';
import { WifiOff } from 'lucide-react';

type Props = {
  onOpenHub: (platform?: OnlinePlatformId | 'all') => void;
  className?: string;
};

export function OnlineOrderBar({ onOpenHub, className }: Props) {
  const connections = useOnlineOrdersStore((s) => s.connections);
  const activeCountByPlatform = useOnlineOrdersStore((s) => s.activeCountByPlatform);
  const [counts, setCounts] = useState(() => activeCountByPlatform());

  useEffect(() => {
    setCounts(activeCountByPlatform());
    const t = window.setInterval(() => setCounts(activeCountByPlatform()), 2000);
    return () => window.clearInterval(t);
  }, [activeCountByPlatform]);

  const connMap = Object.fromEntries(connections.map((c) => [c.platformId, c]));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const platforms = enabledPlatforms();

  return (
    <div
      className={cn(
        'relative z-10 shrink-0 border-b border-slate-200/80 bg-white',
        className
      )}
    >
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 scrollbar-hide">
        <button
          type="button"
          onClick={() => onOpenHub('all')}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3 py-1.5 text-white transition active:scale-[0.98]"
        >
          <span className="text-[11px] font-bold tracking-wide">Online Orders</span>
          {total > 0 && (
            <span className="min-w-[1.25rem] rounded-full bg-[#FF6A00] px-1.5 text-center text-[10px] font-black tabular-nums">
              {total}
            </span>
          )}
        </button>

        <div className="h-6 w-px shrink-0 bg-slate-200" />

        {platforms.map((p) => {
          const connected = connMap[p.id]?.connected !== false;
          const n = counts[p.id] || 0;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenHub(p.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2 py-1.5 transition duration-150',
                n > 0
                  ? 'border-transparent bg-slate-50 shadow-sm ring-1 ring-slate-100'
                  : 'border-transparent hover:bg-slate-50',
                !connected && 'opacity-70'
              )}
            >
              <span className="relative">
                <PlatformLogo platformId={p.id} size="sm" />
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white',
                    connected ? 'bg-emerald-500' : 'bg-rose-500'
                  )}
                />
              </span>
              <span className="text-[11px] font-semibold text-slate-700">{p.label}</span>
              <span
                className={cn(
                  'min-w-[1.1rem] rounded-md px-1 text-center text-[10px] font-black tabular-nums',
                  n > 0 ? 'text-white' : 'bg-slate-100 text-slate-400'
                )}
                style={n > 0 ? { backgroundColor: p.color } : undefined}
              >
                {n}
              </span>
              {!connected && <WifiOff className="h-3 w-3 text-rose-500" />}
            </button>
          );
        })}

        {connections.some((c) => !c.connected) && (
          <button
            type="button"
            onClick={() => onOpenHub('all')}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600"
          >
            <WifiOff className="h-3 w-3" />
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
}

export function ConnectivityStrip({ onReconnect }: { onReconnect?: (id: OnlinePlatformId) => void }) {
  const connections = useOnlineOrdersStore((s) => s.connections);
  const setConnection = useOnlineOrdersStore((s) => s.setConnection);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {enabledPlatforms().map((p) => {
        const c = connections.find((x) => x.platformId === p.id);
        const ok = c?.connected !== false;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (!ok) {
                setConnection(p.id, true);
                onReconnect?.(p.id);
              }
            }}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold',
              ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            )}
            title={ok ? `${p.label} connected` : `Reconnect ${p.label}`}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-emerald-500' : 'bg-rose-500')}
            />
            {getPlatform(p.id).label}
            {ok ? ' ✓' : ' · Fix'}
          </button>
        );
      })}
    </div>
  );
}
