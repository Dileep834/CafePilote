import React, { useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { getPlanLimits } from '@/lib/planLimits';
import { BRAND } from '@/constants';
import { PERMISSIONS } from '@/constants/permissions';
import { useHasPermission } from '@/hooks/useHasPermission';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    void hydrateFromUser(user);
  }, [user?.id, user?.companyId, user?.outletId, hydrateFromUser, user]);

  const active = outlets.find((o) => o.id === activeOutletId) || outlets[0];
  // Plan limits gate creating outlets — not switching between ones that already exist.
  const locked = !canSwitchBranch(user) || !canSwitchBranchByPermission;
  const canSelect = !locked && outlets.length > 1;
  const plan = getPlanLimits(planId);

  if (!user) return null;

  return (
    <div className={cn('flex min-w-0 max-w-full items-center gap-2', className)}>
      <div className="mr-1 hidden min-w-0 flex-col items-end md:flex">
        <span className="max-w-[140px] truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {companyName || 'Company'}
        </span>
        <span className="text-[10px] font-semibold text-slate-500">{plan.label} plan</span>
      </div>

      <div
        className={cn(
          'flex h-9 min-w-0 max-w-full items-center gap-1 rounded-xl border bg-white px-1.5 shadow-sm sm:gap-2 sm:px-2.5',
          canSelect ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200'
        )}
        title={
          locked
            ? 'Your branch is assigned by admin'
            : outlets.length <= 1
              ? 'Only one branch available'
              : 'Switch branch'
        }
      >
        <MapPin className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" style={{ color: BRAND.orange }} />
        {!canSelect ? (
          <span className="max-w-[72px] truncate text-[11px] font-bold text-[#0D1B2A] sm:max-w-[120px] sm:text-xs md:max-w-[180px] lg:max-w-[220px]">
            {formatBranchDisplayName(active?.name || 'Branch')}
          </span>
        ) : (
          <label className="relative flex min-w-0 max-w-full items-center gap-1 pr-4">
            <span className="sr-only">Branch</span>
            <select
              className="max-w-[72px] cursor-pointer appearance-none truncate border-0 bg-transparent text-[11px] font-bold text-[#0D1B2A] focus:outline-none sm:max-w-[120px] sm:text-xs md:max-w-[180px] lg:max-w-[220px]"
              value={activeOutletId || ''}
              disabled={isLoading}
              onChange={(e) => {
                setActiveOutletId(e.target.value);
                onBranchChange?.(e.target.value);
              }}
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {formatBranchDisplayName(o.name)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 h-3 w-3 shrink-0 text-slate-400 sm:h-3.5 sm:w-3.5" />
          </label>
        )}
      </div>
    </div>
  );
}
