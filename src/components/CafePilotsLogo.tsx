import React from 'react';
import { BRAND } from '@/constants';
import { cn } from '@/lib/utils';

export interface CafePilotsLogoProps {
  /** Icon height in px (wordmark scales with it). */
  size?: number;
  /** Show "CafePilots" wordmark next to the icon. */
  withWordmark?: boolean;
  /** Thin vertical divider between icon and wordmark (brand lockup). */
  withDivider?: boolean;
  /** White cup for navy/dark backgrounds. */
  onDark?: boolean;
  className?: string;
  /** Accessible label */
  title?: string;
}

/** Cup + propeller mark — shared by UI logo and favicon. */
export function CafePilotsMark({
  size = 40,
  onDark = false,
  className,
  title = 'CafePilots',
}: {
  size?: number;
  onDark?: boolean;
  className?: string;
  title?: string;
}) {
  const propeller = BRAND.orange;
  const cup = onDark ? '#ffffff' : BRAND.navy;
  const liquid = onDark ? '#e2e8f0' : BRAND.steel;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn('block shrink-0', className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Propeller left */}
      <path d="M47 22 C 25 12, 10 20, 15 27 C 25 30, 47 26, 47 22 Z" fill={propeller} />
      {/* Propeller right */}
      <path d="M53 22 C 75 12, 90 20, 85 27 C 75 30, 53 26, 53 22 Z" fill={propeller} />
      <rect x="46.5" y="12" width="7" height="28" rx="3.5" fill={propeller} />
      <circle cx="50" cy="22" r="5" fill={propeller} />
      {/* Cup handle */}
      <path
        d="M75 45 C 95 45, 95 65, 75 65"
        stroke={cup}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cup body */}
      <path d="M20 40 L80 40 C 80 68, 65 75, 50 75 C 35 75, 20 68, 20 40 Z" fill={cup} />
      <ellipse cx="50" cy="40" rx="30" ry="4" fill={liquid} />
      {/* Saucer */}
      <path
        d="M30 85 Q 50 92 70 85"
        stroke={cup}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Official CafePilots lockup: icon | CafePilots
 * Use this everywhere for a consistent brand presence.
 */
export function CafePilotsLogo({
  size = 40,
  withWordmark = true,
  withDivider = true,
  onDark = false,
  className,
  title = 'CafePilots',
}: CafePilotsLogoProps) {
  const cafeColor = onDark ? '#ffffff' : BRAND.navy;
  const fontSize = Math.max(14, Math.round(size * 0.52));

  return (
    <div
      className={cn('inline-flex items-center gap-2.5 min-w-0', className)}
      role="img"
      aria-label={title}
    >
      <CafePilotsMark size={size} onDark={onDark} title={title} />

      {withWordmark && (
        <>
          {withDivider && (
            <span
              className="shrink-0 self-stretch w-px my-1"
              style={{ backgroundColor: onDark ? 'rgba(255,255,255,0.35)' : BRAND.navy, opacity: onDark ? 1 : 0.35 }}
              aria-hidden
            />
          )}
          <span
            className="font-bold tracking-tight leading-none truncate"
            style={{ fontSize, fontFamily: 'Poppins, system-ui, sans-serif' }}
          >
            <span style={{ color: cafeColor }}>Cafe</span>
            <span style={{ color: BRAND.orange }}>Pilots</span>
          </span>
        </>
      )}
    </div>
  );
}

export default CafePilotsLogo;
