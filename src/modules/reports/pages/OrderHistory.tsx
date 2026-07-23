import React, { useEffect, useMemo, useState } from 'react';
import { useReportStore } from '../store/useReportStore';
import dayjs from 'dayjs';
import { formatCurrency } from '@/utils/format';
import {
  FileText,
  Search,
  Store,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  Clock3,
  WalletCards,
  RefreshCw,
  Filter,
  ReceiptText,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { PERMISSIONS } from '@/constants/permissions';
import { useHasPermission } from '@/hooks/useHasPermission';
import { fetchAvailabilityHistory, fetchAvailabilityReport } from '@/modules/availability';

function StatusChip({ status }: { status: string }) {
  const s = String(status || '').toLowerCase();
  const tone =
    s === 'delivered' || s === 'completed' || s === 'paid'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
      : s === 'ready'
        ? 'bg-sky-50 text-sky-700 ring-sky-600/15'
        : s.includes('cancel')
          ? 'bg-rose-50 text-rose-700 ring-rose-600/15'
          : 'bg-amber-50 text-amber-800 ring-amber-600/15';
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
        tone
      )}
    >
      {status || '—'}
    </span>
  );
}

function exportOrdersCsv(orders: ReturnType<typeof useReportStore.getState>['orders']) {
  const header = [
    'Order ID',
    'Created',
    'Branch',
    'Customer',
    'Table',
    'Total',
    'Payment',
    'Kitchen Status',
    'Source',
  ];
  const lines = orders.map((o) =>
    [
      o.id,
      o.created_at,
      o.outlets?.name || '',
      o.customer_name || '',
      o.table_number || '',
      o.total_amount,
      o.payment_method,
      o.kitchen_status,
      o.order_source || '',
    ]
      .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function OrderHistory() {
  const canFilterBranches = useHasPermission(PERMISSIONS.BRANCH_SWITCH);
  const {
    orders,
    outlets,
    isLoading,
    error,
    selectedOutletId,
    dateRange,
    setOutletFilter,
    setDateRange,
    fetchData,
  } = useReportStore();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [availabilityRows, setAvailabilityRows] = useState<any[]>([]);
  const [availabilityHistory, setAvailabilityHistory] = useState<any[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void fetchData();
  }, [selectedOutletId, dateRange, fetchData]);

  useEffect(() => {
    const outletId = selectedOutletId === 'ALL' ? null : selectedOutletId;
    if (!outletId) {
      setAvailabilityRows([]);
      setAvailabilityHistory([]);
      return;
    }
    void (async () => {
      const [rows, history] = await Promise.all([
        fetchAvailabilityReport(outletId),
        fetchAvailabilityHistory(outletId),
      ]);
      setAvailabilityRows(rows);
      setAvailabilityHistory(history as any[]);
    })();
  }, [selectedOutletId]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const id = o.id.toLowerCase();
      const customer = String(o.customer_name || '').toLowerCase();
      const table = String(o.table_number || '').toLowerCase();
      const pay = String(o.payment_method || '').toLowerCase();
      const branch = String(o.outlets?.name || '').toLowerCase();
      return (
        id.includes(q) ||
        customer.includes(q) ||
        table.includes(q) ||
        pay.includes(q) ||
        branch.includes(q)
      );
    });
  }, [orders, search]);

  const kpis = useMemo(() => {
    const totalSalesAmount = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const averageOrderValue = orders.length > 0 ? totalSalesAmount / orders.length : 0;
    const paymentMix = orders.reduce<Record<string, number>>((acc, order) => {
      const method = order.payment_method || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});
    const topPaymentMethod =
      Object.entries(paymentMix).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const hourlySales = orders.reduce<Record<string, number>>((acc, order) => {
      const hour = dayjs(order.created_at).format('ha');
      acc[hour] = (acc[hour] || 0) + order.total_amount;
      return acc;
    }, {});
    const peakHour = Object.entries(hourlySales).sort((a, b) => b[1] - a[1])[0];
    const cancelledBills = orders.filter((order) =>
      String(order.status || '').toLowerCase().includes('cancel')
    ).length;
    return {
      totalSalesAmount,
      averageOrderValue,
      topPaymentMethod,
      peakHour: peakHour ? peakHour[0] : '—',
      cancelledBills,
      orderCount: orders.length,
    };
  }, [orders]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (dateRange !== 'today' ? 1 : 0) +
    (selectedOutletId !== 'ALL' ? 1 : 0);

  const colSpan = canFilterBranches ? 8 : 7;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 px-1 pb-6 sm:px-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Reports</h1>
          <p className="mt-0.5 max-w-2xl text-sm font-medium text-slate-500">
            Sales, payments, discounts, peak hours, and table performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-black text-orange-700">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            disabled={!filteredOrders.length}
            onClick={() => exportOrdersCsv(filteredOrders)}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-200"
            disabled={isLoading}
            onClick={() => void fetchData()}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-[12px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6 lg:gap-3">
        <InventoryCard
          label="Revenue"
          value={formatCurrency(kpis.totalSalesAmount)}
          subtitle="Selected period"
          icon={ReceiptText}
          tone="emerald"
        />
        <InventoryCard
          label="Orders"
          value={String(kpis.orderCount)}
          subtitle="Bills loaded"
          icon={FileText}
          tone="blue"
        />
        <InventoryCard
          label="AOV"
          value={formatCurrency(kpis.averageOrderValue)}
          subtitle="Average ticket"
          icon={WalletCards}
          tone="orange"
        />
        <InventoryCard
          label="Peak hour"
          value={String(kpis.peakHour)}
          subtitle="By sales volume"
          icon={Clock3}
          tone="amber"
        />
        <InventoryCard
          label="Top payment"
          value={String(kpis.topPaymentMethod)}
          subtitle="Most used"
          icon={WalletCards}
          tone="slate"
        />
        <InventoryCard
          label="Cancelled"
          value={String(kpis.cancelledBills)}
          subtitle="In period"
          icon={Ban}
          tone="red"
        />
      </div>

      {filtersOpen && (
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[180px] flex-1 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Search
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                  placeholder="Order, customer, table, payment…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </label>

            {canFilterBranches && (
              <label className="w-full space-y-1 sm:w-48">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Branch
                </span>
                <div className="relative">
                  <Store className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <select
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                    value={selectedOutletId}
                    onChange={(e) => setOutletFilter(e.target.value)}
                  >
                    <option value="ALL">All branches</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            )}

            <label className="w-full space-y-1 sm:w-44">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Date range
              </span>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <select
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                  value={dateRange}
                  onChange={(e) =>
                    setDateRange(e.target.value as 'today' | '7days' | '30days' | 'all')
                  }
                >
                  <option value="today">Today</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </label>
          </div>
        </div>
      )}

      {selectedOutletId !== 'ALL' ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <h2 className="text-base font-black text-slate-900">Current availability</h2>
              <p className="text-sm font-medium text-slate-500">
                Shared availability status for the selected branch
              </p>
            </div>
            <div className="max-h-80 overflow-auto">
              {availabilityRows.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">
                  No availability rows yet for this branch
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400 backdrop-blur">
                    <tr>
                      <th className="px-4 py-2.5">Product</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Servings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availabilityRows.slice(0, 25).map((row) => (
                      <tr key={row.productId} className="border-t border-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{row.productName}</td>
                        <td className="px-4 py-2.5 capitalize text-slate-600">
                          {String(row.status).replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-slate-500">
                          {row.availableServings == null
                            ? '—'
                            : Number(row.availableServings).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <h2 className="text-base font-black text-slate-900">Availability history</h2>
              <p className="text-sm font-medium text-slate-500">
                Manual overrides and inventory-driven transitions
              </p>
            </div>
            <div className="max-h-80 divide-y divide-slate-50 overflow-auto">
              {availabilityHistory.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">
                  No history yet for this branch
                </p>
              ) : (
                availabilityHistory.slice(0, 20).map((row: any) => (
                  <div key={row.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-slate-900">{row.products?.name || 'Product'}</p>
                      <p className="text-[11px] text-slate-400">
                        {dayjs(row.created_at).format('DD MMM, hh:mm A')}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {`${String(row.old_status || 'unknown').replace(/_/g, ' ')} → ${String(row.new_status || 'unknown').replace(/_/g, ' ')}`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {row.source || 'system'}
                      {row.reason ? ` · ${row.reason}` : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-base font-black text-slate-900">Order history</h2>
          <p className="text-sm font-medium text-slate-500">
            Showing {filteredOrders.length} of {orders.length} bills
          </p>
        </div>

        {isLoading && orders.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">Loading transactions…</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6A00]">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">No orders found</h3>
            <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
              There are no transactions for the selected filters.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h3 className="text-base font-black text-slate-900">No bills match your search</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 h-9 rounded-xl"
              onClick={() => setSearch('')}
            >
              Clear search
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-black uppercase tracking-wider text-slate-400 backdrop-blur">
                <tr>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">When</th>
                  {canFilterBranches ? <th className="px-4 py-2.5">Branch</th> : null}
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-center">Payment</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isExpanded = expandedRows.has(order.id);
                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        onClick={() => toggleRow(order.id)}
                        className="cursor-pointer border-t border-slate-50 transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-2.5">
                          <span className="rounded-md bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-black text-[#FF6A00] ring-1 ring-inset ring-orange-600/15">
                            #{order.id.substring(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {dayjs(order.created_at).format('MMM D, YYYY')}
                          <span className="block text-[11px] text-slate-400">
                            {dayjs(order.created_at).format('hh:mm A')}
                          </span>
                        </td>
                        {canFilterBranches ? (
                          <td className="px-4 py-2.5 font-medium text-slate-700">
                            {order.outlets?.name || (
                              <span className="italic text-slate-400">Unknown</span>
                            )}
                          </td>
                        ) : null}
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {order.table_number ? (
                            <span className="font-bold text-slate-900">
                              Table {order.table_number}
                            </span>
                          ) : order.customer_name ? (
                            order.customer_name
                          ) : (
                            <span className="italic text-slate-400">Walk-in</span>
                          )}
                          {order.order_source === 'qr' ? (
                            <span className="ml-2 rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-black uppercase text-sky-700 ring-1 ring-inset ring-sky-600/15">
                              QR
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-black tabular-nums text-slate-900">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                            {order.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <StatusChip status={order.kitchen_status} />
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-400">
                          {isExpanded ? (
                            <ChevronUp className="ml-auto h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-auto h-4 w-4" />
                          )}
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-slate-50/60">
                          <td
                            colSpan={colSpan}
                            className="border-l-4 border-l-[#FF6A00] px-4 py-3"
                          >
                            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                              <h4 className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Itemized receipt
                              </h4>
                              <div className="space-y-2">
                                {order.items?.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                                        {item.quantity}×
                                      </span>
                                      <span className="font-semibold text-slate-800">
                                        {item.product_name}
                                      </span>
                                    </div>
                                    <div className="font-black tabular-nums text-slate-900">
                                      {formatCurrency(item.total_price)}
                                    </div>
                                  </div>
                                ))}
                                {!order.items?.length ? (
                                  <p className="text-sm text-slate-400">No line items</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
