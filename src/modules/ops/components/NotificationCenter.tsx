import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId } from '@/store/useTenantStore';
import { cn } from '@/lib/utils';
import {
  requestDesktopNotificationPermission,
  useNotificationStore,
} from '../services/notificationService';

function relativeTime(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationCenter() {
  const { user } = useAuthStore();
  const items = useNotificationStore((s) => s.items);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const unreadCount = useNotificationStore((s) => s.unreadCount());
  const hydrateFromServer = useNotificationStore((s) => s.hydrateFromServer);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const outletId = getTenantOutletId(user);
    void hydrateFromServer(outletId);
    void requestDesktopNotificationPermission();
  }, [user, hydrateFromServer]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hidden text-slate-500 sm:inline-flex"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-bold text-slate-900">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-4 py-8 text-center text-xs font-semibold text-slate-400">
              No notifications yet
            </p>
          )}
          {items.slice(0, 25).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn(
                'flex cursor-pointer flex-col items-start gap-0.5 rounded-none px-3 py-2.5',
                !n.read && 'bg-orange-50/60'
              )}
              onClick={() => markRead(n.id)}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <p className="text-xs font-bold text-slate-900">{n.title}</p>
                <span
                  className={cn(
                    'mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full',
                    n.severity === 'critical'
                      ? 'bg-red-500'
                      : n.severity === 'warn'
                        ? 'bg-amber-500'
                        : 'bg-slate-300',
                    n.read && 'opacity-0'
                  )}
                />
              </div>
              {n.body && <p className="line-clamp-2 text-[11px] text-slate-500">{n.body}</p>}
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {n.kind.replace(/_/g, ' ')} · {relativeTime(n.createdAt)}
              </p>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
