import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/constants';
import { LayoutGrid, List } from 'lucide-react';
import type { TableBoardLayout } from '@/modules/settings/store/useSettingsStore';

type Props = {
  value: TableBoardLayout;
  onChange: (layout: TableBoardLayout) => void;
  className?: string;
  size?: 'sm' | 'md';
};

/** Toggle between card grid and dense list on the table board */
export function TableBoardLayoutToggle({ value, onChange, className, size = 'md' }: Props) {
  const btn = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';

  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm',
        className
      )}
      role="group"
      aria-label="Board layout"
    >
      <button
        type="button"
        title="Grid view"
        aria-label="Grid view"
        aria-pressed={value === 'grid'}
        onClick={() => onChange('grid')}
        className={cn(
          btn,
          'rounded-lg flex items-center justify-center transition-colors',
          value === 'grid' ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        )}
        style={value === 'grid' ? { backgroundColor: BRAND.navy } : undefined}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="List view"
        aria-label="List view"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={cn(
          btn,
          'rounded-lg flex items-center justify-center transition-colors',
          value === 'list' ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        )}
        style={value === 'list' ? { backgroundColor: BRAND.navy } : undefined}
      >
        <List className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
