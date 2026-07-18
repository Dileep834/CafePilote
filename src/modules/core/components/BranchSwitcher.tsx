import React, { useEffect } from 'react';
import { MapPin, ChevronDown, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { getPlanLimits } from '@/lib/planLimits';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Called when branch changes so pages can re-hydrate */
  onBranchChange?: (outletId: string) => void;
};

export function BranchSwitcher({ className, onBranchChange }: Props) {
  const user = useAuthStore((s) => s.user);
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
  const locked = !canSwitchBranch(user);
  const plan = getPlanLimits(planId);

  if (!user) return null;

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <div className="hidden md:flex flex-col items-end mr-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[140px]">
          {companyName || 'Company'}
        </span>
        <span className="text-[10px] font-semibold text-slate-500">{plan.label} plan</span>
      </div>

      <div
        className={cn(
          'flex items-center gap-2 h-9 rounded-xl border px-2.5 bg-white shadow-sm min-w-0',
          locked ? 'border-slate-200' : 'border-slate-200 hover:border-slate-300'
        )}
        title={locked ? 'Your branch is assigned by admin' : 'Switch branch'}
      >
        <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: BRAND.orange }} />
        {locked || outlets.length <= 1 ? (
          <span className="text-xs font-bold text-[#0D1B2A] truncate max-w-[160px]">
            {active?.name || 'Branch'}
          </span>
        ) : (
          <label className="flex items-center gap-1 min-w-0">
            <span className="sr-only">Branch</span>
            <select
              className="text-xs font-bold text-[#0D1B2A] bg-transparent border-0 focus:outline-none max-w-[180px] cursor-pointer"
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
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </label>
        )}
        <Building2 className="w-3.5 h-3.5 text-slate-300 shrink-0 hidden sm:block" />
      </div>
    </div>
  );
}
