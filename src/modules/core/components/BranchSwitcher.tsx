import React from 'react';
import { MapPin, ChevronDown, Check, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { getPlanLimits } from '@/lib/planLimits';
import { BRAND } from '@/constants';
import { PERMISSIONS } from '@/constants/permissions';
import { useHasPermission } from '@/hooks/useHasPermission';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = {
  className?: string;
  /** Called when branch changes so pages can re-hydrate */
  onBranchChange?: (outletId: string) => void;
};

/** Display outlet names in Title Case when stored as ALL CAPS / all lower. */
function formatBranchDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const hasLower = /[a-z]/.test(trimmed);
  const hasUpper = /[A-Z]/.test(trimmed);
  // Keep intentional mixed/camel case (e.g. CafePilots, VileParle)
  if (hasLower && hasUpper) return trimmed;
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function BranchSwitcher({ className, onBranchChange }: Props) {
  const user = useAuthStore((s) => s.user);
  const canSwitchBranchByPermission = useHasPermission(PERMISSIONS.BRANCH_SWITCH);
  const {
    outlets,
    activeOutletId,
    companyName,
    planId,
    isLoading,
    hydrateFromUser,
    setActiveOutletId,
    canSwitchBranch,
  } = useTenantStore();

  React.useEffect(() => {
    void hydrateFromUser(user);
  }, [user?.id, user?.companyId, user?.outletId, hydrateFromUser, user]);

  const active = outlets.find((o) => o.id === activeOutletId) || outlets[0];
  const locked = !canSwitchBranch(user) || !canSwitchBranchByPermission;
  const canSelect = !locked && outlets.length > 1;
  const plan = getPlanLimits(planId);
  const activeName = formatBranchDisplayName(active?.name || 'Branch');

  if (!user) return null;

  const triggerClass = cn(
    'group flex h-9 min-w-0 max-w-full items-center gap-2 rounded-xl border bg-white px-2.5 shadow-sm transition-all touch-manipulation',
    canSelect
      ? 'border-slate-200 hover:border-[#FF6A00]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/25'
      : 'border-slate-200 cursor-default'
  );

  return (
    <div className={cn('flex min-w-0 max-w-full items-center gap-2', className)}>
      <div className="mr-1 hidden min-w-0 flex-col items-end md:flex">
        <span className="max-w-[160px] truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {companyName || 'Company'}
        </span>
        <span className="text-[10px] font-semibold text-slate-500">{plan.label} plan</span>
      </div>

      {!canSelect ? (
        <div
          className={triggerClass}
          title={
            locked
              ? 'Your branch is assigned by admin'
              : outlets.length <= 1
                ? 'Only one branch available'
                : 'Switch branch'
          }
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-50">
            <MapPin className="h-3.5 w-3.5" style={{ color: BRAND.orange }} />
          </span>
          <span className="max-w-[100px] truncate text-xs font-bold text-slate-900 sm:max-w-[140px] md:max-w-[200px] lg:max-w-[240px]">
            {activeName}
          </span>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isLoading}
              className={triggerClass}
              title="Switch branch"
              aria-label={`Branch: ${activeName}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                <MapPin className="h-3.5 w-3.5" style={{ color: BRAND.orange }} />
              </span>
              <span className="max-w-[100px] truncate text-left text-xs font-bold text-slate-900 sm:max-w-[140px] md:max-w-[200px] lg:max-w-[240px]">
                {activeName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-data-[popup-open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            sideOffset={8}
            className="z-[120] w-[min(20rem,calc(100vw-1.5rem))] min-w-[16rem] rounded-2xl border-slate-200 p-1.5 shadow-2xl"
          >
            <DropdownMenuLabel className="px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {companyName || 'Company'}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {outlets.length} branch{outlets.length === 1 ? '' : 'es'} · {plan.label}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1.5" />
            <div className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain px-0.5">
              {outlets.map((o) => {
                const selected = o.id === (activeOutletId || active?.id);
                const label = formatBranchDisplayName(o.name);
                return (
                  <DropdownMenuItem
                    key={o.id}
                    onClick={() => {
                      if (selected) return;
                      setActiveOutletId(o.id);
                      onBranchChange?.(o.id);
                    }}
                    className={cn(
                      'cursor-pointer gap-2 rounded-xl px-2.5 py-2.5 text-sm font-semibold outline-none',
                      selected
                        ? 'bg-orange-50 text-[#FF6A00] focus:bg-orange-50 focus:text-[#FF6A00]'
                        : 'text-slate-700 focus:bg-slate-50 focus:text-slate-900'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                        selected ? 'bg-orange-100' : 'bg-slate-100'
                      )}
                    >
                      <MapPin
                        className="h-3.5 w-3.5"
                        style={{ color: selected ? BRAND.orange : '#64748b' }}
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {selected ? (
                      <Check className="h-4 w-4 shrink-0 text-[#FF6A00]" />
                    ) : (
                      <span className="h-4 w-4 shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
