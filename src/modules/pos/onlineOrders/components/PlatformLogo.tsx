import { cn } from '@/lib/utils';
import type { OnlinePlatformId } from './types';
import { getPlatform } from './platforms';

type Props = {
  platformId: OnlinePlatformId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE = {
  sm: 'h-7 w-7 text-[9px]',
  md: 'h-9 w-9 text-[10px]',
  lg: 'h-11 w-11 text-xs',
};

/** Brand glyph chip — swap for official SVG assets when licenses allow */
export function PlatformLogo({ platformId, size = 'md', className }: Props) {
  const p = getPlatform(platformId);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-black tracking-tight text-white shadow-sm',
        SIZE[size],
        className
      )}
      style={{ backgroundColor: p.color }}
      title={p.label}
      aria-label={p.label}
    >
      {p.glyph}
    </span>
  );
}
