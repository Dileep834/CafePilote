import { cn } from '@/lib/utils';
import type { CatalogStatus } from '../types';

const STYLES: Record<CatalogStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  hidden: 'bg-orange-50 text-orange-700 ring-orange-100',
  archived: 'bg-rose-50 text-rose-700 ring-rose-100',
};

const LABELS: Record<CatalogStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  hidden: 'Hidden',
  archived: 'Archived',
};

export function resolveProductStatus(p: {
  isActive: boolean;
  isHidden?: boolean;
  isArchived?: boolean;
}): CatalogStatus {
  if (p.isArchived) return 'archived';
  if (!p.isActive) return 'inactive';
  if (p.isHidden) return 'hidden';
  return 'active';
}

export function resolveCategoryStatus(c: {
  isActive: boolean;
  isHidden?: boolean;
  isArchived?: boolean;
}): CatalogStatus {
  if (c.isArchived) return 'archived';
  if (c.isHidden) return 'hidden';
  if (!c.isActive) return 'inactive';
  return 'active';
}

export function StatusBadge({ status }: { status: CatalogStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1',
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  );
}

export function CountBadge({ value }: { value: number | string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-600">
      {value}
    </span>
  );
}
