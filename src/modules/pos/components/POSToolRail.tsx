import React from 'react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/constants';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Heart,
  History,
  Clock,
  Plus,
} from 'lucide-react';

export type PosView = 'menu' | 'favorites' | 'history' | 'held';

type Props = {
  view: PosView;
  onViewChange: (view: PosView) => void;
  heldCount?: number;
  favoritesCount?: number;
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
  { id: 'history', label: 'History', Icon: History },
  { id: 'held', label: 'Held', Icon: Clock },
];

export function POSToolRail({
  view,
  onViewChange,
  heldCount = 0,
  favoritesCount = 0,
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
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm">
          {TOOLS.map(({ id, label, Icon }) => {
            const active = view === id;
            const badge =
              id === 'held' ? heldCount : id === 'favorites' ? favoritesCount : 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(id)}
                className={cn(
                  'relative inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap',
                  active ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                )}
                style={active ? { backgroundColor: BRAND.orange } : undefined}
                aria-pressed={active}
              >
                <Icon
                  className={cn(
                    'w-3.5 h-3.5 sm:w-4 sm:h-4',
                    active && id === 'favorites' && 'fill-white'
                  )}
                />
                {label}
                {badge > 0 && (
                  <span
                    className={cn(
                      'min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center',
                      active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
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
        className="shrink-0 h-10 px-3.5 rounded-xl bg-brand-orange hover:bg-[#e55f00] text-white font-bold shadow-md shadow-brand-orange/20"
      >
        <Plus className="w-4 h-4 mr-1" />
        New order
      </Button>
    </div>
  );
}
