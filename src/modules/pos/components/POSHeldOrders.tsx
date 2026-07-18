import React, { useEffect } from 'react';
import { Clock, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSStore } from '../store/usePOSStore';
import { formatCurrency } from '@/utils/format';
import { BRAND } from '@/constants';

type Props = {
  onResumed?: () => void;
};

export function POSHeldOrders({ onResumed }: Props) {
  const heldOrders = usePOSStore((s) => s.heldOrders);
  const fetchHeldOrders = usePOSStore((s) => s.fetchHeldOrders);
  const resumeOrder = usePOSStore((s) => s.resumeOrder);
  const discardHeldOrder = usePOSStore((s) => s.discardHeldOrder);

  useEffect(() => {
    void fetchHeldOrders();
  }, [fetchHeldOrders]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white sm:bg-transparent rounded-t-2xl sm:rounded-none">
      <div className="px-3 sm:px-0 py-2.5 shrink-0 flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: BRAND.navy }}
        >
          <Clock className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: BRAND.navy }}>
            Held orders
          </h2>
          <p className="text-[11px] text-slate-500">Parked tickets waiting to resume</p>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-1 sm:px-0 pb-24 md:pb-2">
        {heldOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <Clock className="w-10 h-10 opacity-30 mb-2" />
            <p className="text-sm font-semibold text-slate-500">No held orders</p>
            <p className="text-xs mt-1">Use Hold / Park on the cart to park a ticket</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-1">
            {heldOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 bg-white shadow-sm"
              >
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 truncate">
                    {order.notes || 'Held order'}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {new Date(order.created_at).toLocaleTimeString()} · {order.items.length} items
                  </p>
                  <p className="text-sm font-bold text-brand-orange">
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void discardHeldOrder(order.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                    title="Discard order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      void resumeOrder(order.id);
                      onResumed?.();
                    }}
                    className="bg-brand-orange hover:bg-[#e55f00] text-white font-bold"
                  >
                    Resume <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
