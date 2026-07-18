import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/constants';
import { LayoutGrid, Map } from 'lucide-react';
import type { TableViewMode } from '@/modules/settings/store/useSettingsStore';

type Props = {
  value: TableViewMode;
  onChange: (mode: TableViewMode) => void;
  className?: string;
  size?: 'sm' | 'md';
};

/** Toggle between normal table cards and floor-plan view */
export function TableViewModeToggle({ value, onChange, className, size = 'md' }: Props) {
  const btn = size === 'sm' ? 'h-8 px-2.5 text-[11px]' : 'h-9 px-3 text-xs';

  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm',
        className
      )}
      role="group"
      aria-label="Table view mode"
    >
      <button
        type="button"
        onClick={() => onChange('normal')}
        className={cn(
          btn,
          'rounded-lg font-bold flex items-center gap-1.5 transition-colors',
          value === 'normal'
            ? 'text-white'
            : 'text-slate-600 hover:bg-slate-50'
        )}
        style={value === 'normal' ? { backgroundColor: BRAND.navy } : undefined}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Table view
      </button>
      <button
        type="button"
        onClick={() => onChange('floor')}
        className={cn(
          btn,
          'rounded-lg font-bold flex items-center gap-1.5 transition-colors',
          value === 'floor'
            ? 'text-white'
            : 'text-slate-600 hover:bg-slate-50'
        )}
        style={value === 'floor' ? { backgroundColor: BRAND.orange } : undefined}
      >
        <Map className="w-3.5 h-3.5" />
        Floor plan
      </button>
    </div>
  );
}
