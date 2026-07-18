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
  const locked = !canSwitchBranch(user) || !canSwitchBranchByPermission;
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
          locked ? 'border-slate-200' : 'border-slate-200 hover:border-slate-300'
        )}
        title={locked ? 'Your branch is assigned by admin' : 'Switch branch'}
      >
        <MapPin className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" style={{ color: BRAND.orange }} />
        {locked || outlets.length <= 1 ? (
          <span className="max-w-[72px] truncate text-[11px] font-bold text-[#0D1B2A] sm:max-w-[140px] sm:text-xs md:max-w-[200px]">
            {active?.name || 'Branch'}
          </span>
        ) : (
          <label className="flex min-w-0 max-w-full items-center gap-1">
            <span className="sr-only">Branch</span>
            <select
              className="max-w-[72px] cursor-pointer truncate border-0 bg-transparent text-[11px] font-bold text-[#0D1B2A] focus:outline-none sm:max-w-[140px] sm:text-xs md:max-w-[200px]"
              value={activeOutletId || ''}
              disabled={isLoading}
              onChange={(e) => {
                setActiveOutletId(e.target.value);
                onBranchChange?.(e.target.value);
              }}
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3 w-3 shrink-0 text-slate-400 sm:h-3.5 sm:w-3.5" />
          </label>
        )}
      </div>
    </div>
  );
}
