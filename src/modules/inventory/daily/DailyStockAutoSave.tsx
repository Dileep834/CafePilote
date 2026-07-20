import { AlertCircle, Check, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock } from './lib';
import type { AutoSaveStatus } from './types';

type Props = {
  status: AutoSaveStatus;
  lastSavedAt: string | null;
};

const META: Record<
  AutoSaveStatus,
  { label: string; className: string; icon: typeof Check }
> = {
  idle: {
    label: 'Auto Save',
    className: 'bg-slate-100 text-slate-600',
    icon: Check,
  },
  saving: {
    label: 'Saving…',
    className: 'bg-sky-50 text-sky-700',
    icon: Loader2,
  },
  saved: {
    label: 'Saved',
    className: 'bg-emerald-50 text-emerald-700',
    icon: Check,
  },
  unsaved: {
    label: 'Unsaved Changes',
    className: 'bg-orange-50 text-orange-700',
    icon: AlertCircle,
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-50 text-red-700',
    icon: CloudOff,
  },
};

export function DailyStockAutoSave({ status, lastSavedAt }: Props) {
  const meta = META[status];
  const Icon = meta.icon;
  const clock = status === 'saved' ? formatClock(lastSavedAt) : '';

  return (
    <div
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold sm:h-11',
        meta.className
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn('h-4 w-4', status === 'saving' && 'animate-spin')} aria-hidden />
      <span>{meta.label}</span>
      {clock ? <span className="font-medium opacity-70">{clock}</span> : null}
    </div>
  );
}
