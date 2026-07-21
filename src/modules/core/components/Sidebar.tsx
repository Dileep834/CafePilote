import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CafePilotsLogo } from '@/components/CafePilotsLogo';
import { APP_NAME, BRAND } from '@/constants';
import { useAuthStore } from '@/store/useAuthStore';
import { usePermissionsStore } from '@/store/usePermissionsStore';
import { useTenantStore } from '@/store/useTenantStore';
import { isSuperAdmin } from '@/lib/access';
import { hasPlanModule } from '@/lib/planLimits';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { NAV_GROUPS } from './navConfig';

const DEFAULT_OPEN_GROUPS = new Set(['service', 'menu']);

function pathMatches(pathname: string, href: string, end?: boolean) {
  if (end) return pathname === href || pathname === `${href}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const planId = useTenantStore((s) => s.planId);
  const { has: hasFlag, marketingPlan, planLabel } = useFeatureFlags();
  const sa = isSuperAdmin(user);
  const role = user?.role;
  const isLite = marketingPlan === 'lite';

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (item.superAdminOnly && !sa) return false;
        if (item.featureFlag && !sa && !hasFlag(item.featureFlag)) return false;
        if (!sa && !hasPlanModule(planId, item.requiredPlanModule)) return false;
        if (!item.requiredPermission) return true;
        if (!role) return false;
        return hasPermission(role, item.requiredPermission);
      }),
    })).filter((g) => {
      if (!g.items.length) return false;
      if (isLite && g.hideOnLite) return false;
      return true;
    });
  }, [hasFlag, hasPermission, isLite, planId, role, sa]);

  const activeGroupIds = useMemo(() => {
    return visibleGroups
      .filter((g) =>
        g.items.some((item) => pathMatches(location.pathname, item.href, item.end))
      )
      .map((g) => g.id);
  }, [location.pathname, visibleGroups]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) {
      init[g.id] = DEFAULT_OPEN_GROUPS.has(g.id) || activeGroupIds.includes(g.id);
    }
    return init;
  });

  useEffect(() => {
    if (!activeGroupIds.length) return;
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const id of activeGroupIds) next[id] = true;
      return next;
    });
  }, [activeGroupIds]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const displayName = user?.name || 'Staff';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'CP';

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden text-slate-50', className)} style={{ backgroundColor: BRAND.navy }}>
      <div className="flex h-16 items-center px-5 border-b border-white/10 shrink-0">
        <Link
          to="/erp"
          onClick={onNavigate}
          aria-label="Go to dashboard"
          className="rounded-md outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          <CafePilotsLogo size={34} withWordmark withDivider onDark />
        </Link>
      </div>

      <div className="mx-2.5 mt-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-200/90">
        {planLabel} plan
      </div>

      <nav className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-contain px-2.5 py-3 pb-5 [-webkit-overflow-scrolling:touch]">
        {visibleGroups.map((group) => {
          const open = openGroups[group.id] !== false;
          const groupActive = activeGroupIds.includes(group.id);

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={open}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors',
                  groupActive ? 'text-orange-300' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn('w-3.5 h-3.5 transition-transform', open ? 'rotate-0' : '-rotate-90')}
                />
              </button>

              {open && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                          isActive
                            ? 'text-white shadow-sm'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        )
                      }
                      style={({ isActive }) =>
                        isActive ? { backgroundColor: BRAND.orange } : undefined
                      }
                    >
                      <item.icon className="mr-2.5 h-4 w-4 flex-shrink-0 opacity-90" aria-hidden />
                      {item.name}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: BRAND.orange }}
          >
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">{displayName}</span>
            <span className="text-xs text-slate-400 truncate">
              {sa ? 'Platform owner · CafePilots HQ' : user?.role || APP_NAME}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
