import React, { useEffect } from 'react';
import { Clock, ChefHat, CheckCircle, ArrowRight, Utensils, XCircle } from 'lucide-react';
import { useKitchenStore } from '../store/useKitchenStore';
import type { KitchenOrder, KitchenStatus } from '../store/useKitchenStore';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

export function KitchenDisplay() {
  const { orders, subscribeToOrders, unsubscribeFromOrders, updateOrderStatus, isLoading } = useKitchenStore();

  useEffect(() => {
    fetchOrders();
    subscribeToOrders();

    return () => {
      unsubscribeFromOrders();
    };
  }, []);

  const pendingOrders = orders.filter(o => o.kitchen_status === 'pending');
  const preparingOrders = orders.filter(o => o.kitchen_status === 'preparing');
  const readyOrders = orders.filter(o => o.kitchen_status === 'ready');

  const TicketCard = ({ order, currentStatus }: { order: KitchenOrder, currentStatus: KitchenStatus }) => {
    const isLate = dayjs().diff(dayjs(order.created_at), 'minute') > 15;

    return (
      <div className={cn(
        "flex flex-col bg-slate-800 rounded-xl overflow-hidden border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 shadow-lg",
        currentStatus === 'pending' ? "border-amber-500/30" : 
        currentStatus === 'preparing' ? "border-blue-500/30" : "border-green-500/30",
        isLate && currentStatus === 'pending' ? "ring-2 ring-red-500/50" : ""
      )}>
        {/* Ticket Header */}
        <div className={cn(
          "px-4 py-3 border-b flex justify-between items-center",
          currentStatus === 'pending' ? "bg-amber-500/10 border-amber-500/20" : 
          currentStatus === 'preparing' ? "bg-blue-500/10 border-blue-500/20" : "bg-green-500/10 border-green-500/20"
        )}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-lg">#{order.id.substring(0, 5).toUpperCase()}</span>
            {order.customer_name && (
              <span className="text-slate-300 text-sm bg-slate-700/50 px-2 py-0.5 rounded-full">{order.customer_name}</span>
            )}
          </div>
          <div className={cn(
            "flex items-center gap-1.5 text-sm font-semibold",
            isLate && currentStatus === 'pending' ? "text-red-400 animate-pulse" : "text-slate-400"
          )}>
            <Clock className="w-4 h-4" />
            <span>{dayjs(order.created_at).format('hh:mm A')}</span>
          </div>
        </div>

        {/* Ticket Items */}
        <div className="p-4 flex-1 space-y-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-white shrink-0 text-sm">
                {item.quantity}x
              </div>
              <div className="flex-1 text-slate-200 font-medium text-lg leading-tight mt-1">
                {item.product_name}
              </div>
            </div>
          ))}
        </div>

        {/* Ticket Actions */}
        <div className="p-3 bg-slate-900/50 flex gap-2">
          {currentStatus === 'pending' && (
            <button 
              onClick={() => updateOrderStatus(order.id, 'preparing')}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <ChefHat className="w-5 h-5" /> Start Preparing
            </button>
          )}
          {currentStatus === 'preparing' && (
            <button 
              onClick={() => updateOrderStatus(order.id, 'ready')}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle className="w-5 h-5" /> Mark Ready
            </button>
          )}
          {currentStatus === 'ready' && (
            <button 
              onClick={() => updateOrderStatus(order.id, 'delivered')}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowRight className="w-5 h-5" /> Deliver & Clear
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-6 lg:p-8 flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <Utensils className="w-8 h-8 text-amber-500" />
            Kitchen Display System
          </h1>
          <p className="text-slate-400 mt-1 font-medium">Real-time order fulfillment tracker</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-bold text-sm tracking-widest uppercase">Live Sync</span>
          </div>
          <div className="bg-slate-800 rounded-xl px-4 py-2 font-mono text-xl font-bold text-white shadow-inner">
            {dayjs().format('HH:mm:ss')}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 min-h-0">
        
        {/* Column: Pending */}
        <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <h2 className="font-bold text-amber-500 text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" /> Pending
            </h2>
            <span className="bg-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded-full text-sm">{pendingOrders.length}</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {pendingOrders.length === 0 && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <ChefHat className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">No pending orders</p>
              </div>
            )}
            {pendingOrders.map(order => <TicketCard key={order.id} order={order} currentStatus="pending" />)}
          </div>
        </div>

        {/* Column: Preparing */}
        <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <h2 className="font-bold text-blue-400 text-lg flex items-center gap-2">
              <ChefHat className="w-5 h-5" /> Preparing
            </h2>
            <span className="bg-blue-500/20 text-blue-400 font-bold px-3 py-1 rounded-full text-sm">{preparingOrders.length}</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {preparingOrders.length === 0 && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <p className="font-medium">Nothing currently preparing</p>
              </div>
            )}
            {preparingOrders.map(order => <TicketCard key={order.id} order={order} currentStatus="preparing" />)}
          </div>
        </div>

        {/* Column: Ready */}
        <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <h2 className="font-bold text-green-400 text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Ready for Pickup
            </h2>
            <span className="bg-green-500/20 text-green-400 font-bold px-3 py-1 rounded-full text-sm">{readyOrders.length}</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {readyOrders.length === 0 && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <p className="font-medium">No orders waiting for pickup</p>
              </div>
            )}
            {readyOrders.map(order => <TicketCard key={order.id} order={order} currentStatus="ready" />)}
          </div>
        </div>

      </div>
    </div>
  );
}
