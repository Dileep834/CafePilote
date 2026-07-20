import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ClipboardList,
  IndianRupee,
  PackageMinus,
  PackageX,
  Plus,
  ShoppingCart,
  Timer,
  TrendingDown,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/format';
import { fetchInventoryDashboard } from '../lib/fetchInventory';
import { isAttentionStatus, reorderQuantity } from '../lib/status';
import type { InventoryFilters, InventoryItem, StatusFilter } from '../types';
import type { InventoryRowAction } from '../components/ActionMenu';
import { InventoryAlert } from '../components/InventoryAlert';
import { InventoryCard } from '../components/InventoryCard';
import { InventoryChart } from '../components/InventoryChart';
import { InventoryHealthCard } from '../components/InventoryHealthCard';
import { InventorySkeleton } from '../components/InventorySkeleton';
import { InventoryTable } from '../components/InventoryTable';
import { InventoryToolbar } from '../components/InventoryToolbar';

const DEFAULT_FILTERS: InventoryFilters = {
  search: '',
  category: 'all',
  supplier: 'all',
  status: 'all',
  stockType: 'all',
  dateFrom: '',
};

function exportCsv(rows: InventoryItem[]) {
  const header = [
    'Product',
    'SKU',
    'Category',
    'Supplier',
    'Available',
    'Minimum',
    'Unit',
    'Stock Value',
    'Status',
    'Updated',
  ];
  const lines = rows.map((r) =>
    [
      r.productName,
      r.productCode,
      r.category,
      r.supplier,
      r.quantity,
      r.minStock,
      r.unit,
      r.stockValue,
      r.status,
      r.updatedAt || '',
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function CurrentInventory() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(filters.search);
  const debouncedSearch = useDebouncedValue(deferredSearch, 200);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory-dashboard', user?.companyId],
    queryFn: () => fetchInventoryDashboard(user?.companyId),
  });

  const loadError = error instanceof Error ? error.message : error ? 'Unable to load inventory.' : '';
  const items = data?.items || [];

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(),
    [items]
  );
  const suppliers = useMemo(
    () => [...new Set(items.map((i) => i.supplier).filter((s) => s && s !== '—'))].sort(),
    [items]
  );

  const health = useMemo(() => {
    return {
      healthy: items.filter((i) => i.status === 'Healthy').length,
      low: items.filter((i) => i.status === 'Low').length,
      critical: items.filter((i) => i.status === 'Critical').length,
      outOfStock: items.filter((i) => i.status === 'Out of Stock').length,
      expiring: items.filter((i) => i.status === 'Expiring').length,
    };
  }, [items]);

  const kpis = useMemo(() => {
    const inventoryValue = items.reduce((sum, i) => sum + i.stockValue, 0);
    const lowStock = items.filter((i) => i.status === 'Low' || i.status === 'Critical').length;
    const outOfStock = items.filter((i) => i.status === 'Out of Stock').length;
    const series = data?.valueSeries || [];
    let valueChangePct: number | null = null;
    if (series.length >= 2 && series[0].value > 0) {
      const first = series[0].value;
      const last = series[series.length - 1].value;
      valueChangePct = Math.round(((last - first) / first) * 100);
    }
    return {
      inventoryValue,
      valueChangePct,
      lowStock,
      outOfStock,
      expiringSoon: health.expiring,
      todayConsumptionValue: data?.todayConsumptionValue ?? null,
      pendingPurchaseOrders: data?.pendingPurchaseOrders ?? 0,
    };
  }, [items, health.expiring, data?.todayConsumptionValue, data?.pendingPurchaseOrders, data?.valueSeries]);

  const filteredItems = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !needle ||
        item.productName.toLowerCase().includes(needle) ||
        item.productCode.toLowerCase().includes(needle);
      const matchesCategory = filters.category === 'all' || item.category === filters.category;
      const matchesSupplier = filters.supplier === 'all' || item.supplier === filters.supplier;
      const matchesStatus =
        filters.status === 'all' ||
        item.status === filters.status ||
        (filters.status === 'Critical' &&
          (item.status === 'Critical' || item.status === 'Out of Stock'));
      const matchesType = filters.stockType === 'all' || item.item_type === filters.stockType;
      const matchesDate =
        !filters.dateFrom ||
        (item.updatedAt != null && item.updatedAt.slice(0, 10) >= filters.dateFrom);
      return (
        matchesSearch &&
        matchesCategory &&
        matchesSupplier &&
        matchesStatus &&
        matchesType &&
        matchesDate
      );
    });
  }, [items, debouncedSearch, filters]);

  const alerts = useMemo(
    () => items.filter((i) => isAttentionStatus(i.status)).slice(0, 6),
    [items]
  );

  const updateFilters = (next: Partial<InventoryFilters>) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, ...next }));
    });
  };

  const setHealthFilter = (status: StatusFilter) => {
    updateFilters({ status: filters.status === status ? 'all' : status });
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (filteredItems.length > 0 && filteredItems.every((i) => prev.has(i.id))) {
        return new Set();
      }
      return new Set(filteredItems.map((i) => i.id));
    });
  };

  const goReceive = () => navigate('/erp/inventory/daily');
  const goCount = () => navigate('/erp/inventory/daily');
  const goPurchase = () => navigate('/erp/purchase');
  const goAdjust = () => navigate('/erp/inventory/adjustments');

  const handleRowAction = async (action: InventoryRowAction, item: InventoryItem) => {
    const qty = Math.max(1, reorderQuantity(item));
    const params = new URLSearchParams({ productId: item.id });

    switch (action) {
      case 'receive':
        params.set('q', item.productName);
        params.set('focus', 'receive');
        navigate(`/erp/inventory/daily?${params.toString()}`);
        return;
      case 'adjust':
        navigate(`/erp/inventory/adjustments?${params.toString()}`);
        return;
      case 'history':
        params.set('history', '1');
        navigate(`/erp/inventory/adjustments?${params.toString()}`);
        return;
      case 'supplier':
        if (item.supplier && item.supplier !== '—') {
          navigate(`/erp/purchase/suppliers?q=${encodeURIComponent(item.supplier)}`);
        } else {
          navigate('/erp/purchase/suppliers');
        }
        return;
      case 'recipe':
        navigate(`/erp/menu/recipes?productId=${encodeURIComponent(item.id)}`);
        return;
      case 'edit':
        params.set('edit', '1');
        navigate(`/erp/menu/products?${params.toString()}`);
        return;
      case 'purchase':
        params.set('create', '1');
        params.set('qty', String(qty));
        if (item.unitCost > 0) params.set('unitPrice', String(item.unitCost));
        navigate(`/erp/purchase?${params.toString()}`);
        return;
      case 'delete': {
        const confirmed = window.confirm(
          `Remove "${item.productName}" from active inventory?\n\nThis deactivates the product so it no longer appears in stock on hand.`
        );
        if (!confirmed) return;
        const { error } = await supabase
          .from('products')
          .update({ is_active: false })
          .eq('id', item.id);
        if (error) {
          setActionMessage(error.message || 'Could not remove product.');
          return;
        }
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        setActionMessage(`"${item.productName}" was removed from active inventory.`);
        await queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
        return;
      }
      default:
        return;
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-0 pb-28 sm:px-0 sm:pb-8">
        <InventorySkeleton />
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[1600px] space-y-5 text-base sm:space-y-6 lg:space-y-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[32px] lg:text-[36px]">
            Inventory
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Track stock, monitor inventory health and manage purchases.
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">
          <Button
            type="button"
            className="h-11 rounded-xl bg-[#FF6A00] px-4 text-white transition-colors duration-200 hover:bg-[#e85f00]"
            onClick={goReceive}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">Receive Stock</span>
            <span className="lg:hidden">Receive</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-slate-200"
            onClick={goCount}
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden lg:inline">Stock Count</span>
            <span className="lg:hidden">Count</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-slate-200"
            onClick={goPurchase}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden lg:inline">Purchase Order</span>
            <span className="lg:hidden">PO</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-slate-200"
            onClick={() => exportCsv(filteredItems)}
          >
            Export
          </Button>
        </div>
      </div>

      {loadError ? (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-base text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Inventory could not load</p>
            <p className="mt-1 text-red-700">{loadError}</p>
            <button
              type="button"
              className="mt-2 font-semibold text-red-800 underline"
              onClick={() => void refetch()}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {actionMessage ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium">{actionMessage}</p>
          <button
            type="button"
            className="shrink-0 font-semibold underline"
            onClick={() => setActionMessage(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* KPI cards — carousel on phone, 2-col tablet, 6-col desktop */}
      <div className="-mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3 xl:grid-cols-6">
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Inventory Value"
          value={formatCurrency(kpis.inventoryValue)}
          subtitle="Across active products"
          icon={IndianRupee}
          tone="emerald"
          trend={
            kpis.valueChangePct != null
              ? `${kpis.valueChangePct >= 0 ? '+' : ''}${kpis.valueChangePct}%`
              : null
          }
          empty={kpis.inventoryValue <= 0}
          emptyMessage="No data yet"
          emptyHint="Complete a stock count to track value."
          actionLabel="Start Stock Count"
          onAction={goCount}
          onClick={goCount}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Low Stock"
          value={String(kpis.lowStock)}
          subtitle="Needs reorder today"
          icon={TrendingDown}
          tone="amber"
          onClick={() => setHealthFilter('Low')}
          actionLabel={kpis.lowStock > 0 ? 'Create PO' : undefined}
          onAction={kpis.lowStock > 0 ? goPurchase : undefined}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Out of Stock"
          value={String(kpis.outOfStock)}
          subtitle={kpis.outOfStock > 0 ? 'Restock urgently' : 'All items available'}
          icon={PackageX}
          tone="red"
          onClick={() => setHealthFilter('Out of Stock')}
          actionLabel={kpis.outOfStock > 0 ? 'Create PO' : undefined}
          onAction={kpis.outOfStock > 0 ? goPurchase : undefined}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Expiring Soon"
          value={String(kpis.expiringSoon)}
          subtitle={kpis.expiringSoon > 0 ? 'Use or transfer soon' : 'No batches expiring'}
          icon={Timer}
          tone="orange"
          onClick={() => setHealthFilter('Expiring')}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Today's Consumption"
          value={
            kpis.todayConsumptionValue != null && kpis.todayConsumptionValue > 0
              ? formatCurrency(kpis.todayConsumptionValue)
              : '—'
          }
          subtitle="From today's stock count"
          icon={PackageMinus}
          tone="blue"
          empty={kpis.todayConsumptionValue == null || kpis.todayConsumptionValue <= 0}
          emptyMessage="No data yet"
          emptyHint="Run today's stock count."
          actionLabel="Start Stock Count"
          onAction={goCount}
          onClick={goCount}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Pending Purchase Orders"
          value={String(kpis.pendingPurchaseOrders)}
          subtitle={kpis.pendingPurchaseOrders > 0 ? 'Awaiting receive' : 'Nothing pending'}
          icon={Truck}
          tone="slate"
          onClick={goPurchase}
          actionLabel={kpis.pendingPurchaseOrders > 0 ? 'View POs' : 'Create PO'}
          onAction={goPurchase}
        />
      </div>


      {/* Health */}
      <section>
        <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-[22px]">
            Inventory Health
          </h2>
          <p className="text-[13px] font-medium text-slate-500">Tap a status to filter the table</p>
        </div>
        <div className="-mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          <InventoryHealthCard
            label="Healthy"
            count={health.healthy}
            tone="healthy"
            active={filters.status === 'Healthy'}
            onClick={() => setHealthFilter('Healthy')}
          />
          <InventoryHealthCard
            label="Low"
            count={health.low}
            tone="low"
            active={filters.status === 'Low'}
            onClick={() => setHealthFilter('Low')}
          />
          <InventoryHealthCard
            label="Critical"
            count={health.critical + health.outOfStock}
            tone="critical"
            active={filters.status === 'Critical' || filters.status === 'Out of Stock'}
            onClick={() => setHealthFilter('Critical')}
          />
          <InventoryHealthCard
            label="Expiring"
            count={health.expiring}
            tone="expiring"
            active={filters.status === 'Expiring'}
            onClick={() => setHealthFilter('Expiring')}
          />
        </div>
      </section>

      {/* Charts — stack on phone, 2-col from tablet */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <InventoryChart
          title="Inventory Value"
          subtitle="Last 7 Days"
          data={data?.valueSeries || []}
          color="#0D1B2A"
          valueFormatter={(v) => formatCurrency(v)}
          emptyTitle="No inventory valuation yet."
          emptyMessage="Complete your first stock count to start tracking inventory value."
          emptyActionLabel="Start Stock Count"
          onEmptyAction={goCount}
        />
        <InventoryChart
          title="Consumption Trend"
          subtitle="Last 30 Days"
          data={data?.consumptionSeries || []}
          color="#FF6A00"
          valueFormatter={(v) => formatCurrency(v)}
          emptyTitle="No consumption history yet."
          emptyMessage="Consumption trends appear after daily stock counts are submitted."
          emptyActionLabel="Start Stock Count"
          onEmptyAction={goCount}
        />
      </div>

      {/* Alerts */}
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-[22px]">
              Inventory Alerts
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">What the kitchen needs next</p>
          </div>
          {alerts.length > 0 ? (
            <Link
              to="/erp/purchase"
              className="shrink-0 text-base font-semibold text-[#FF6A00] transition-colors hover:text-[#e85f00] hover:underline"
            >
              View all POs
            </Link>
          ) : null}
        </div>
        {alerts.length === 0 ? (
          <div className="rounded-xl bg-emerald-50/70 px-4 py-8 text-center sm:px-6 sm:py-10">
            <p className="text-base font-semibold text-emerald-800 sm:text-lg">Stock looks healthy</p>
            <p className="mt-1 text-sm text-emerald-700 sm:text-base">
              No low, critical, or expiring items need attention right now.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {alerts.map((item) => (
              <InventoryAlert key={item.id} item={item} onReorder={() => goPurchase()} />
            ))}
          </div>
        )}
      </section>

      {/* Bulk actions */}
      {selectedIds.size > 0 ? (
        <div className="sticky top-0 z-30 flex gap-2 overflow-x-auto rounded-xl bg-[#0D1B2A] px-3 py-3 text-white shadow-md sm:flex-wrap sm:overflow-visible sm:px-4">
          <span className="mr-1 shrink-0 self-center text-sm font-medium sm:mr-2 sm:text-base">
            {selectedIds.size} selected
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 shrink-0 rounded-lg border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={goAdjust}
          >
            Adjust
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 shrink-0 rounded-lg border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => exportCsv(filteredItems.filter((i) => selectedIds.has(i.id)))}
          >
            Export
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 shrink-0 rounded-lg border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={goPurchase}
          >
            <span className="hidden sm:inline">Generate Purchase Order</span>
            <span className="sm:hidden">Create PO</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="hidden h-9 shrink-0 rounded-lg border-white/20 bg-transparent text-white hover:bg-white/10 sm:inline-flex"
            onClick={() => window.print()}
          >
            Print Labels
          </Button>
          <button
            type="button"
            className="ml-auto shrink-0 self-center text-sm text-white/70 transition-colors hover:text-white sm:text-base"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* Search + full-width table */}
      <div className="w-full min-w-0 space-y-3 sm:space-y-4">
          <InventoryToolbar
            filters={filters}
            categories={categories}
            suppliers={suppliers.length ? suppliers : ['—']}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((v) => !v)}
            onChange={updateFilters}
            onReset={() => {
              setFilters(DEFAULT_FILTERS);
              setSelectedIds(new Set());
            }}
            onExport={() => exportCsv(filteredItems)}
          />

          <div className="relative z-0">
          {filteredItems.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-12 text-center shadow-sm ring-1 ring-slate-100 sm:px-6 sm:py-16">
              <p className="text-lg font-semibold text-slate-800 sm:text-[22px]">No inventory items match</p>
              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                Reset filters or receive stock to get started.
              </p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  Reset Filter
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
                  onClick={goReceive}
                >
                  Receive Stock
                </Button>
              </div>
            </div>
          ) : (
            <InventoryTable
              items={filteredItems}
              selectedIds={selectedIds}
              onToggle={toggleRow}
              onToggleAll={toggleAll}
              onAction={handleRowAction}
              onReorder={() => goPurchase()}
              onRowClick={(item) => {
                if (isAttentionStatus(item.status)) goPurchase();
              }}
            />
          )}
          </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <Button
          type="button"
          className="h-12 w-full rounded-xl bg-[#FF6A00] text-base text-white transition-colors duration-200 hover:bg-[#e85f00]"
          onClick={goReceive}
        >
          <Plus className="h-5 w-5" />
          Receive Stock
        </Button>
      </div>
    </div>
  );
}
