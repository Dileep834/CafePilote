import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/constants';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import type { DevicePreview } from '../store/floorStore';
import { useTenantStore } from '@/store/useTenantStore';

type Props = {
  value: DevicePreview;
  onChange: (v: DevicePreview) => void;
  className?: string;
  size?: 'sm' | 'md';
};

const OPTIONS: { id: DevicePreview; label: string; Icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Desktop', Icon: Monitor },
  { id: 'tablet', label: 'Tablet', Icon: Tablet },
  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
];

export function DevicePreviewToggle({ value, onChange, className, size = 'md' }: Props) {
  const btn = size === 'sm' ? 'h-8 px-2 text-[11px]' : 'h-9 px-2.5 text-xs';
  const plan = useTenantStore((s) => s.plan());

  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm',
        className
      )}
      role="group"
      aria-label="Device preview"
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const on = value === id;
        const locked = !plan.devicePreview && id !== 'desktop';
        return (
          <button
            key={id}
            type="button"
            title={locked ? `${plan.label}: upgrade for ${label}` : label}
            disabled={locked}
            onClick={() => {
              if (locked) {
                alert(`${plan.label} plan is Desktop only. Upgrade for Tablet/Mobile preview.`);
                return;
              }
              onChange(id);
            }}
            className={cn(
              btn,
              'rounded-lg font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40',
              on ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
            )}
            style={on ? { backgroundColor: BRAND.navy } : undefined}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
