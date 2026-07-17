import React, { useEffect, useState } from 'react';
import { useReportStore } from '../store/useReportStore';
import type { POSOrder } from '../store/useReportStore';
import { useAuthStore } from '@/store/useAuthStore';
import dayjs from 'dayjs';
import { formatCurrency } from '@/utils/format';
import { FileText, Search, Store, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OrderHistory() {
  const { user } = useAuthStore();
  const { 
    orders, outlets, isLoading, error, 
    selectedOutletId, dateRange, 
    setOutletFilter, setDateRange, fetchData 
  } = useReportStore();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchData();
  }, [selectedOutletId, dateRange]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const isSuperAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

  const totalSalesAmount = orders.reduce((sum, order) => sum + order.total_amount, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-600" />
            Order History & Reports
          </h1>
          <p className="text-slate-500 text-sm">View past transactions across your business</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Branch Filter (Only for Admins) */}
          {isSuperAdmin && (
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <div className="pl-3 py-2 bg-slate-50 border-r border-slate-200">
                <Store className="w-4 h-4 text-slate-500" />
              </div>
              <select 
                className="bg-transparent border-none text-sm font-medium focus:ring-0 py-2 pl-3 pr-8 cursor-pointer"
                value={selectedOutletId}
                onChange={(e) => setOutletFilter(e.target.value)}
              >
                <option value="ALL">Global (All Branches)</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="pl-3 py-2 bg-slate-50 border-r border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <select 
              className="bg-transparent border-none text-sm font-medium focus:ring-0 py-2 pl-3 pr-8 cursor-pointer"
              value={dateRange}
              onChange={(e: any) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
            <p className="text-2xl font-black text-slate-800">{formatCurrency(totalSalesAmount)}</p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Orders</p>
            <p className="text-2xl font-black text-slate-800">{orders.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Store className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading transactions...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-medium">{error}</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Orders Found</h3>
            <p className="text-slate-500">There are no transactions for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  {isSuperAdmin && <th className="px-6 py-4 font-semibold">Branch</th>}
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                  <th className="px-6 py-4 font-semibold text-center">Payment</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const isExpanded = expandedRows.has(order.id);
                  return (
                    <React.Fragment key={order.id}>
                      <tr 
                        onClick={() => toggleRow(order.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                            #{order.id.substring(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {dayjs(order.created_at).format('MMM D, YYYY')}
                          <span className="block text-slate-400 text-xs">{dayjs(order.created_at).format('hh:mm A')}</span>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">
                            {order.outlets?.name || <span className="text-slate-400 italic">Unknown</span>}
                          </td>
                        )}
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                          {order.customer_name || <span className="text-slate-400 italic">Walk-in</span>}
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-slate-900 text-right">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            {order.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                            order.kitchen_status === 'delivered' ? "bg-green-100 text-green-700" :
                            order.kitchen_status === 'ready' ? "bg-blue-100 text-blue-700" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {order.kitchen_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-slate-400 group-hover:text-purple-600 transition-colors">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Row Content */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={isSuperAdmin ? 8 : 7} className="px-6 py-4 border-l-4 border-l-purple-500">
                            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Itemized Receipt</h4>
                              <div className="space-y-2">
                                {order.items?.map(item => (
                                  <div key={item.id} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{item.quantity}x</span>
                                      <span className="font-medium text-slate-700">{item.product_name}</span>
                                    </div>
                                    <div className="font-medium text-slate-900">
                                      {formatCurrency(item.total_price)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
