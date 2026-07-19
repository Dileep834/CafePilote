import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, Keyboard, Search, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermissionsStore } from '@/store/usePermissionsStore';
import { isSuperAdmin } from '@/lib/access';
import { NAV_GROUPS } from './navConfig';

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hasPermission = usePermissionsStore((state) => state.hasPermission);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cafepilots-recent-pages') || '[]');
    } catch {
      return [];
    }
  });

  const commands = useMemo(() => {
    const role = user?.role;
    const superAdmin = isSuperAdmin(user);
    return NAV_GROUPS.flatMap((group) =>
      group.items
        .filter((item) => {
          if (item.superAdminOnly && !superAdmin) return false;
          if (!item.requiredPermission) return true;
          if (!role) return false;
          return hasPermission(role, item.requiredPermission);
        })
        .map((item) => ({
          ...item,
          group: group.label,
        }))
    );
  }, [hasPermission, user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((command) =>
      [command.name, command.group, command.href].join(' ').toLowerCase().includes(q)
    );
  }, [commands, query]);

  const recentCommands = recent
    .map((href) => commands.find((command) => command.href === href))
    .filter(Boolean)
    .slice(0, 4);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  const runCommand = (href: string) => {
    const nextRecent = [href, ...recent.filter((item) => item !== href)].slice(0, 6);
    setRecent(nextRecent);
    localStorage.setItem('cafepilots-recent-pages', JSON.stringify(nextRecent));
    onOpenChange(false);
    navigate(href);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/45 p-3 pt-20 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close command palette"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onOpenChange(false);
              if (event.key === 'Enter' && filtered[0]) runCommand(filtered[0].href);
            }}
            placeholder="Search pages, orders, stock, reports..."
            className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
          />
          <span className="hidden items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 sm:inline-flex">
            <Keyboard className="h-3 w-3" />
            Ctrl K
          </span>
        </div>

        <div className="overflow-y-auto p-3">
          {recentCommands.length > 0 && !query && (
            <div className="mb-3">
              <p className="mb-1.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Recent pages
              </p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {recentCommands.map((command) => {
                  const Icon = command!.icon;
                  return (
                    <button
                      key={command!.href}
                      type="button"
                      onClick={() => runCommand(command!.href)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      <span className="truncate text-sm font-bold text-slate-700">{command!.name}</span>
                      <Icon className="ml-auto h-4 w-4 text-orange-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="mb-1.5 px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            All available workspaces
          </p>
          <div className="space-y-1">
            {filtered.length > 0 ? (
              filtered.map((command, index) => {
                const Icon = command.icon;
                return (
                  <button
                    key={command.href}
                    type="button"
                    onClick={() => runCommand(command.href)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                      index === 0 ? 'bg-orange-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">{command.name}</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{command.group}</p>
                    </div>
                    {index === 0 ? <Star className="h-4 w-4 text-orange-500" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                No matching workspace for this role.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
