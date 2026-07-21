import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PLAN_MARKETING_LABEL,
  type FeatureFlagKey,
  type PlanMarketingId,
  requiredPlanForFeature,
} from '@/lib/featureFlags';

type Props = {
  flag: FeatureFlagKey;
  title: string;
  description: string;
  className?: string;
  onUpgrade?: () => void;
  compact?: boolean;
};

/**
 * Locked feature teaser for plans that do not include the capability yet.
 */
export function UpgradeLockedCard({
  flag,
  title,
  description,
  className,
  onUpgrade,
  compact,
}: Props) {
  const minPlan: PlanMarketingId = requiredPlanForFeature(flag);
  const planLabel = PLAN_MARKETING_LABEL[minPlan];

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-left shadow-sm',
        compact ? 'min-h-[120px]' : 'min-h-[168px]',
        className
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,106,0,0.04),transparent_50%)]" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200/80 text-slate-500">
          <Lock className="h-4 w-4" />
        </div>
        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FF6A00] ring-1 ring-orange-100">
          {planLabel}+
        </span>
      </div>
      <h3 className="relative mt-3 text-sm font-black text-slate-800">{title}</h3>
      <p className="relative mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{description}</p>
      <div className="relative mt-auto flex items-center justify-between gap-2 pt-3">
        <p className="text-[11px] font-semibold text-slate-400">Included on {planLabel}</p>
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-lg bg-[#FF6A00] px-3 text-[11px] font-bold text-white hover:bg-orange-600"
          onClick={onUpgrade}
        >
          <Sparkles className="mr-1 h-3 w-3" />
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}
