import React, { useEffect, useState } from 'react';
import { useReportStore } from '../store/useReportStore';
import dayjs from 'dayjs';
import { formatCurrency } from '@/utils/format';
import { FileText, Search, Store, Calendar, ChevronDown, ChevronUp, Download, Printer, Clock3, WalletCards } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERMISSIONS } from '@/constants/permissions';
import { useHasPermission } from '@/hooks/useHasPermission';

export function OrderHistory() {
  const canFilterBranches = useHasPermission(PERMISSIONS.BRANCH_SWITCH);
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

  const totalSalesAmount = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const averageOrderValue = orders.length > 0 ? totalSalesAmount / orders.length : 0;
  const paymentMix = orders.reduce<Record<string, number>>((acc, order) => {
    const method = order.payment_method || 'unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});
  const topPaymentMethod =
    Object.entries(paymentMix).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No payments';
  const hourlySales = orders.reduce<Record<string, number>>((acc, order) => {
    const hour = dayjs(order.created_at).format('ha');
    acc[hour] = (acc[hour] || 0) + order.total_amount;
    return acc;
  }, {});
  const peakHour = Object.entries(hourlySales).sort((a, b) => b[1] - a[1])[0];
  const cancelledBills = orders.filter((order) => String(order.status || '').toLowerCase().includes('cancel')).length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600" />
            Restaurant Reports
          </h1>
          <p className="text-slate-500 text-sm">Sales, payments, discounts, peak hours, and table performance</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Branch Filter (Only for Admins) */}
          {canFilterBranches && (
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

          {[
            { label: 'Excel', icon: Download },
            { label: 'PDF', icon: FileText },
            { label: 'CSV', icon: Download },
            { label: 'Print', icon: Printer, action: () => window.print() },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.action}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <action.icon className="mr-1.5 inline h-3.5 w-3.5" />
              {action.label}
            </button>
          ))}

        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        {[
          { label: 'Revenue', value: formatCurrency(totalSalesAmount), icon: FileText, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Orders', value: orders.length, icon: Store, tone: 'bg-blue-50 text-blue-700' },
          { label: 'AOV', value: formatCurrency(averageOrderValue), icon: WalletCards, tone: 'bg-orange-50 text-orange-700' },
          { label: 'Peak hour', value: peakHour ? peakHour[0] : 'None', icon: Clock3, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Top payment', value: topPaymentMethod, icon: WalletCards, tone: 'bg-slate-50 text-slate-700' },
          { label: 'Cancelled', value: cancelledBills, icon: Search, tone: 'bg-rose-50 text-rose-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.tone}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 font-black uppercase tracking-wider">{stat.label}</p>
              <p className="truncate text-lg font-black text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
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
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-4 font-semibold">Order ID</th>
                    <th className="px-6 py-4 font-semibold">Date & Time</th>
                    {canFilterBranches && <th className="px-6 py-4 font-semibold">Branch</th>}
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
                            <span className="font-mono text-sm font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                              #{order.id.substring(0, 8).toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">
                            {dayjs(order.created_at).format('MMM D, YYYY')}
                            <span className="block text-slate-400 text-xs">{dayjs(order.created_at).format('hh:mm A')}</span>
                          </td>
                          {canFilterBranches && (
                            <td className="px-6 py-4 text-sm font-medium text-slate-700">
                              {order.outlets?.name || <span className="text-slate-400 italic">Unknown</span>}
                            </td>
                          )}
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">
                            {order.table_number ? (
                              <span className="font-bold text-brand-navy">Table {order.table_number}</span>
                            ) : order.customer_name ? (
                              order.customer_name
                            ) : (
                              <span className="text-slate-400 italic">Walk-in</span>
                            )}
                            {order.order_source === 'qr' && (
                              <span className="ml-2 text-[10px] font-bold uppercase text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">QR</span>
                            )}
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
                            <button className="text-slate-400 group-hover:text-orange-600 transition-colors">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Row Content */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={canFilterBranches ? 8 : 7} className="px-6 py-4 border-l-4 border-l-orange-500">
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

            {/* Mobile Card List View */}
            <div className="md:hidden flex flex-col divide-y divide-slate-100">
              {orders.map((order) => {
                const isExpanded = expandedRows.has(order.id);
                return (
                  <div key={order.id} className="p-4 bg-white hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleRow(order.id)}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md inline-block w-fit">
                          #{order.id.substring(0, 8).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          {order.table_number ? (
                            <span className="font-bold text-brand-navy">Table {order.table_number}</span>
                          ) : order.customer_name ? (
                            order.customer_name
                          ) : (
                            <span className="text-slate-400 italic">Walk-in</span>
                          )}
                          {order.order_source === 'qr' && (
                            <span className="ml-1 text-[10px] font-bold uppercase text-sky-600 bg-sky-50 px-1 py-0.5 rounded">QR</span>
                          )}
                        </span>
                      </div>
                      <div className="text-right flex flex-col gap-1 items-end">
                        <span className="text-base font-black text-slate-900">
                          {formatCurrency(order.total_amount)}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5",
                          order.kitchen_status === 'delivered' ? "bg-green-100 text-green-700" :
                          order.kitchen_status === 'ready' ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {order.kitchen_status}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-2 border-t border-slate-50">
                      <span>{dayjs(order.created_at).format('MMM D, h:mm A')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{order.payment_method}</span>
                        <button className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Mobile View */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        {canFilterBranches && (
                          <div className="mb-3 text-xs text-slate-500">
                            Branch: <span className="font-medium text-slate-700">{order.outlets?.name || <span className="italic">Unknown</span>}</span>
                          </div>
                        )}
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Itemized Receipt</h4>
                        <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {order.items?.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-600 bg-white shadow-sm px-1.5 py-0.5 rounded">{item.quantity}x</span>
                                <span className="font-medium text-slate-700">{item.product_name}</span>
                              </div>
                              <div className="font-medium text-slate-900">
                                {formatCurrency(item.total_price)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
