import { lazy, Suspense, memo } from 'react';
import { Button } from '@/components/ui/button';
import type { ChartPoint } from '../types';

const ChartInner = lazy(() => import('./InventoryChartInner'));

type Props = {
  title: string;
  subtitle: string;
  data: ChartPoint[];
  color?: string;
  valueFormatter?: (value: number) => string;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
};

function ChartFallback() {
  return (
    <div className="h-44 animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:200%_100%] sm:h-56" />
  );
}

export const InventoryChart = memo(function InventoryChart({
  title,
  subtitle,
  data,
  color = '#0D1B2A',
  valueFormatter,
  emptyTitle = 'No data yet',
  emptyMessage = 'Not enough history yet.',
  emptyActionLabel,
  onEmptyAction,
}: Props) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition-shadow duration-200 hover:shadow-md sm:p-5 md:p-6">
      <div className="mb-4 sm:mb-5">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-[22px]">{title}</h3>
        <p className="mt-1 text-[13px] font-medium text-slate-500">{subtitle}</p>
      </div>
      {data.length === 0 ? (
        <div className="flex h-44 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 text-center sm:h-56 sm:px-6">
          <p className="text-base font-semibold text-slate-800">{emptyTitle}</p>
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">{emptyMessage}</p>
          {emptyActionLabel && onEmptyAction ? (
            <Button
              type="button"
              className="mt-4 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
              onClick={onEmptyAction}
            >
              {emptyActionLabel}
            </Button>
          ) : null}
        </div>
      ) : (
        <Suspense fallback={<ChartFallback />}>
          <ChartInner data={data} color={color} valueFormatter={valueFormatter} />
        </Suspense>
      )}
    </div>
  );
});
