import { OnlineOrderHub, OnlineOrderToasts, useOnlineOrdersStore } from '@/modules/pos/onlineOrders';
import { useEffect } from 'react';

/**
 * Full ERP page for marketplace / online order ops.
 * Also reachable from POS via the Online tab and sticky order bar.
 */
export function OnlineOrdersPage() {
  const tickTimeouts = useOnlineOrdersStore((s) => s.tickTimeouts);
  const pushIncomingOrder = useOnlineOrdersStore((s) => s.pushIncomingOrder);
  const simulatorOn = useOnlineOrdersStore((s) => s.simulatorOn);

  useEffect(() => {
    const t = window.setInterval(() => tickTimeouts(), 1000);
    return () => window.clearInterval(t);
  }, [tickTimeouts]);

  useEffect(() => {
    if (!simulatorOn) return;
    const t = window.setInterval(() => {
      if (Math.random() > 0.78) pushIncomingOrder();
    }, 32000);
    return () => window.clearInterval(t);
  }, [simulatorOn, pushIncomingOrder]);

  return (
    <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-slate-100 p-3 sm:p-4">
      <OnlineOrderToasts />
      <div className="min-h-0 flex-1 overflow-hidden">
        <OnlineOrderHub />
      </div>
    </div>
  );
}
