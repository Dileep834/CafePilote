import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/constants';
import type { DevicePreview } from '../store/floorStore';

type Props = {
  device: DevicePreview;
  children: React.ReactNode;
  className?: string;
};

/** Page-designer style device chrome around the floor canvas */
export function DeviceFrame({ device, children, className }: Props) {
  if (device === 'desktop') {
    return <div className={cn('relative h-full w-full min-h-0', className)}>{children}</div>;
  }

  const isTablet = device === 'tablet';

  return (
    <div
      className={cn(
        'h-full w-full min-h-0 flex items-center justify-center p-3 md:p-5 overflow-auto',
        className
      )}
      style={{
        background:
          'radial-gradient(ellipse at center, #E8EAF0 0%, #F3F3F8 45%, #DDE1EA 100%)',
      }}
    >
      <div className="flex flex-col items-center gap-2 w-full h-full max-w-full max-h-full">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
          {isTablet ? 'Tablet' : 'Mobile'} preview
        </span>
        <div
          className="relative bg-[#0D1B2A] shadow-2xl overflow-hidden border-[8px] border-[#0D1B2A] flex-1 min-h-0"
          style={{
            width: isTablet ? 'min(720px, 100%)' : 'min(390px, 100%)',
            maxHeight: isTablet ? 'min(960px, 100%)' : 'min(780px, 100%)',
            borderRadius: isTablet ? 22 : 28,
            aspectRatio: isTablet ? '3 / 4' : '9 / 19.5',
          }}
        >
          {!isTablet && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 z-20 h-5 w-28 rounded-b-2xl pointer-events-none"
              style={{ backgroundColor: BRAND.navy }}
            />
          )}
          <div className="absolute inset-0 bg-white overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}
