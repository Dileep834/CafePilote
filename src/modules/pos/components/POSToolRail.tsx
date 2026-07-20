import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Heart,
  History,
  Clock,
  Plus,
  Globe2,
} from 'lucide-react';

export type PosView = 'menu' | 'favorites' | 'history' | 'held' | 'online';

type Props = {
  view: PosView;
  onViewChange: (view: PosView) => void;
  heldCount?: number;
  favoritesCount?: number;
  onlineCount?: number;
  onNewOrder: () => void;
  className?: string;
};

const TOOLS: {
  id: PosView;
  label: string;
  Icon: typeof LayoutGrid;
}[] = [
  { id: 'menu', label: 'Menu', Icon: LayoutGrid },
  { id: 'favorites', label: 'Favorites', Icon: Heart },
  { id: 'online', label: 'Online', Icon: Globe2 },
  { id: 'history', label: 'History', Icon: History },
  { id: 'held', label: 'Held', Icon: Clock },
];

export function POSToolRail({
  view,
  onViewChange,
  heldCount = 0,
  favoritesCount = 0,
  onlineCount = 0,
  onNewOrder,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 shrink-0',
        className
      )}
    >
      <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
        <div className="inline-flex items-center gap-1 rounded-2xl bg-white p-1 shadow-sm">
          {TOOLS.map(({ id, label, Icon }) => {
            const active = view === id;
            const badge =
              id === 'held'
                ? heldCount
                : id === 'favorites'
                  ? favoritesCount
                  : id === 'online'
                    ? onlineCount
                    : 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(id)}
                className={cn(
                  'relative inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm',
                  active
                    ? id === 'online'
                      ? 'bg-[#FF6A00] text-white'
                      : 'bg-slate-900 text-white'
                    : id === 'online'
                      ? 'bg-orange-50 text-[#FF6A00] hover:bg-orange-100'
                      : 'text-slate-600 hover:bg-slate-50'
                )}
                aria-pressed={active}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5 sm:h-4 sm:w-4',
                    active && id === 'favorites' && 'fill-white'
                  )}
                />
                {label}
                {badge > 0 && (
                  <span
                    className={cn(
                      'min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center',
                      active
                        ? 'bg-white/25 text-white'
                        : id === 'online'
                          ? 'bg-[#FF6A00] text-white'
                          : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        onClick={onNewOrder}
        className="h-10 shrink-0 rounded-xl bg-brand-orange px-3.5 font-semibold text-white hover:bg-[#e55f00]"
      >
        <Plus className="mr-1 h-4 w-4" />
        New order
      </Button>
    </div>
  );
}
