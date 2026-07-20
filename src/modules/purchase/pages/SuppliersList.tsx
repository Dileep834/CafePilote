import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  FolderOpen,
  IndianRupee,
  Plus,
  ShoppingCart,
  Store,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/format';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { InventoryChart } from '@/modules/inventory/components/InventoryChart';
import { usePurchaseStore } from '../store/usePurchaseStore';
import {
  DEFAULT_SUPPLIER_FILTERS,
  buildPerformanceChart,
  buildSupplierRows,
  computeSupplierKpis,
  filterSupplierRows,
  uniqueCategories,
  uniqueCities,
  type SupplierFilters,
  type SupplierRow,
} from '../lib/supplierHelpers';
import { SupplierToolbar } from '../components/SupplierToolbar';
import { SupplierTable } from '../components/SupplierTable';
import { SupplierForm } from '../suppliers/SupplierForm';
import type { SupplierCreatePayload } from '../suppliers/types';
import { useFeedback } from '@/hooks/useFeedback';

function exportCsv(rows: SupplierRow[]) {
  const header = [
    'Supplier',
    'Category',
    'Contact',
    'Phone',
    'City',
    'Address',
    'Orders',
    'Total Purchases',
    'Outstanding',
    'Status',
  ];
  const lines = rows.map((s) =>
    [
      s.name,
      s.category || 'General',
      s.contact_name || '',
      s.phone || '',
      s.city || '',
      s.address || '',
      s.orderCount,
      s.totalPurchases,
      s.outstanding,
      s.is_active ? 'Active' : 'Inactive',
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
  a.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SuppliersList() {
  const {
    suppliers,
    purchaseOrders,
    isLoading,
    error,
    fetchSuppliers,
    fetchPurchaseOrders,
    addSupplier,
  } = usePurchaseStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [, startTransition] = useTransition();
  const { showFeedback, FeedbackComponent } = useFeedback();

  const [filters, setFilters] = useState<SupplierFilters>(DEFAULT_SUPPLIER_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{ name: string; id: string } | null>(null);
  const [viewSupplier, setViewSupplier] = useState<SupplierRow | null>(null);

  useEffect(() => {
    void fetchSuppliers();
    void fetchPurchaseOrders();
  }, [fetchSuppliers, fetchPurchaseOrders]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setFilters((prev) => ({ ...prev, search: q }));
  }, [searchParams]);

  const rows = useMemo(
    () => buildSupplierRows(suppliers, purchaseOrders),
    [suppliers, purchaseOrders]
  );

  const filteredRows = useMemo(() => filterSupplierRows(rows, filters), [rows, filters]);
  const kpis = useMemo(() => computeSupplierKpis(rows, purchaseOrders), [rows, purchaseOrders]);
  const categories = useMemo(() => uniqueCategories(rows), [rows]);
  const cities = useMemo(() => uniqueCities(rows), [rows]);
  const performance = useMemo(() => buildPerformanceChart(rows), [rows]);

  const recentPurchases = useMemo(
    () =>
      [...purchaseOrders]
        .filter((po) => po.status !== 'Cancelled')
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
        .slice(0, 8),
    [purchaseOrders]
  );

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const updateFilters = (next: Partial<SupplierFilters>) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, ...next }));
    });
  };

  const resetForm = () => {
    setIsModalOpen(false);
  };

  const handleCreateSupplier = async (payload: SupplierCreatePayload) => {
    setSaving(true);
    try {
      const created = await addSupplier(payload);
      setIsModalOpen(false);
      setSuccessBanner({ name: created.name, id: created.id });
      showFeedback('Supplier added successfully.', 'success');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Could not add supplier.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const goCreatePO = (supplier?: SupplierRow) => {
    if (supplier) {
      navigate(`/erp/purchase?create=1`);
      setActionMessage(`Open Create PO and select ${supplier.name} as the supplier.`);
      return;
    }
    navigate('/erp/purchase');
  };

  return (
    <div className="relative mx-auto w-full max-w-[1600px] space-y-5 text-base sm:space-y-6 lg:space-y-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-8">
      {FeedbackComponent}
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[32px] lg:text-[36px]">
            Supplier Management
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Manage vendors and purchase relationships.
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm">
            {todayLabel}
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">
          <Button
            type="button"
            className="h-11 rounded-xl bg-[#FF6A00] px-4 text-white hover:bg-[#e85f00]"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-slate-200"
            onClick={() => navigate('/erp/purchase')}
          >
            <ShoppingCart className="h-4 w-4" />
            Purchase Orders
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-slate-200"
            onClick={() => exportCsv(filteredRows)}
          >
            Export
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-base text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Suppliers could not load</p>
            <p className="mt-1 text-red-700">{error}</p>
            <button
              type="button"
              className="mt-2 font-semibold text-red-800 underline"
              onClick={() => void fetchSuppliers()}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {successBanner ? (
        <div className="flex flex-col gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium">
            Supplier added successfully. <span className="font-semibold">{successBanner.name}</span> is ready
            for purchasing.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-lg bg-[#FF6A00] text-white hover:bg-[#e85f00]"
              onClick={() => {
                setSuccessBanner(null);
                navigate(`/erp/purchase?create=1&supplier=${successBanner.id}`);
              }}
            >
              Create Purchase Order
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 rounded-lg border-emerald-200 bg-white"
              onClick={() => {
                setSuccessBanner(null);
                navigate(`/erp/inventory?supplier=${encodeURIComponent(successBanner.name)}`);
              }}
            >
              Assign Products
            </Button>
            <button
              type="button"
              className="px-2 text-sm font-semibold text-emerald-800 underline"
              onClick={() => setSuccessBanner(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {actionMessage ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium">{actionMessage}</p>
          <button type="button" className="shrink-0 font-semibold underline" onClick={() => setActionMessage(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="-mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3 xl:grid-cols-5">
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Total Suppliers"
          value={String(kpis.total)}
          subtitle="All vendors on file"
          icon={Store}
          tone="slate"
          onClick={() => updateFilters({ status: 'all' })}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Active Suppliers"
          value={String(kpis.active)}
          subtitle="Ready to order from"
          icon={Users}
          tone="emerald"
          onClick={() => updateFilters({ status: 'active' })}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Categories"
          value={String(kpis.categories)}
          subtitle="Vendor groups"
          icon={FolderOpen}
          tone="blue"
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Outstanding"
          value={formatCurrency(kpis.outstandingTotal)}
          subtitle="Open PO balances"
          icon={IndianRupee}
          tone="amber"
          onClick={() => updateFilters({ outstanding: 'with' })}
          actionLabel={kpis.outstandingTotal > 0 ? 'View' : undefined}
          onAction={kpis.outstandingTotal > 0 ? () => updateFilters({ outstanding: 'with' }) : undefined}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Orders This Month"
          value={String(kpis.ordersThisMonth)}
          subtitle="Purchase activity"
          icon={ShoppingCart}
          tone="orange"
          onClick={() => navigate('/erp/purchase')}
        />
      </div>

      {/* Filters + table */}
      <div className="w-full min-w-0 space-y-3 sm:space-y-4">
        <SupplierToolbar
          filters={filters}
          categories={categories}
          cities={cities}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          onChange={updateFilters}
          onReset={() => setFilters(DEFAULT_SUPPLIER_FILTERS)}
          onExport={() => exportCsv(filteredRows)}
        />

        {isLoading ? (
          <div className="rounded-xl bg-white px-4 py-16 text-center shadow-sm ring-1 ring-slate-100">
            <p className="font-medium text-slate-500">Loading suppliers…</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-12 text-center shadow-sm ring-1 ring-slate-100 sm:px-6 sm:py-16">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-200" />
            <p className="text-lg font-semibold text-slate-800 sm:text-[22px]">No suppliers yet.</p>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Add your first vendor to start purchase orders and track outstanding balances.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-11 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Supplier
              </Button>
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-12 text-center shadow-sm ring-1 ring-slate-100 sm:px-6 sm:py-16">
            <p className="text-lg font-semibold text-slate-800 sm:text-[22px]">No suppliers match</p>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">Reset filters or add a new supplier.</p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setFilters(DEFAULT_SUPPLIER_FILTERS)}
              >
                Reset Filter
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
                onClick={() => setIsModalOpen(true)}
              >
                Add Supplier
              </Button>
            </div>
          </div>
        ) : (
          <SupplierTable
            rows={filteredRows}
            onView={setViewSupplier}
            onCreatePO={goCreatePO}
            onViewOrders={(s) => navigate(`/erp/purchase?supplier=${s.id}`)}
          />
        )}
      </div>

      {/* Supplier Performance + Recent Purchases */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <InventoryChart
          title="Supplier Performance"
          subtitle="Top vendors by purchase spend"
          data={performance}
          color="#FF6A00"
          valueFormatter={(v) => formatCurrency(v)}
          emptyTitle="No purchase history yet."
          emptyMessage="Create purchase orders to see which suppliers you buy from most."
          emptyActionLabel="Go to Purchase Orders"
          onEmptyAction={() => navigate('/erp/purchase')}
        />

        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5 md:p-6">
          <div className="mb-4 sm:mb-5">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-[22px]">
              Recent Purchases
            </h3>
            <p className="mt-1 text-[13px] font-medium text-slate-500">Latest supplier orders</p>
          </div>
          {recentPurchases.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 text-center sm:h-56">
              <p className="text-base font-semibold text-slate-800">No purchases yet.</p>
              <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">
                Orders will show here once you create purchase orders.
              </p>
              <Button
                type="button"
                className="mt-4 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
                onClick={() => navigate('/erp/purchase')}
              >
                Create Purchase Order
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentPurchases.map((po) => (
                <li key={po.id}>
                  <button
                    type="button"
                    onClick={() => navigate('/erp/purchase')}
                    className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-50/80"
                  >
                    <span className="rounded-md bg-orange-50 px-2 py-1 font-mono text-xs font-bold text-[#FF6A00]">
                      {po.po_number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">
                        {po.suppliers?.name || 'Supplier'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(po.created_at || '').slice(0, 10)} · {po.status}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums font-bold text-slate-900">
                      {formatCurrency(po.total_amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <Button
          type="button"
          className="h-12 w-full rounded-xl bg-[#FF6A00] text-base text-white hover:bg-[#e85f00]"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-5 w-5" />
          Add Supplier
        </Button>
      </div>

      {/* View drawer */}
      {viewSupplier ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{viewSupplier.name}</h2>
                <p className="text-sm text-slate-500">{viewSupplier.category || 'General'}</p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setViewSupplier(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purchases</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {formatCurrency(viewSupplier.totalPurchases)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outstanding</p>
                  <p className="mt-1 text-lg font-bold text-amber-700">
                    {formatCurrency(viewSupplier.outstanding)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Orders</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{viewSupplier.orderCount}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Avg delivery</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {viewSupplier.avgDeliveryDays != null ? `${viewSupplier.avgDeliveryDays}d` : '—'}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">Contact:</span>{' '}
                  {viewSupplier.contact_name || '—'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Phone:</span> {viewSupplier.phone || '—'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">City:</span> {viewSupplier.city || '—'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Address:</span>{' '}
                  {viewSupplier.address || '—'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
              <Button
                type="button"
                className="rounded-xl bg-[#FF6A00] hover:bg-[#e85f00]"
                onClick={() => {
                  setViewSupplier(null);
                  goCreatePO(viewSupplier);
                }}
              >
                Create PO
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setViewSupplier(null);
                  navigate(`/erp/purchase?supplier=${viewSupplier.id}`);
                }}
              >
                View orders
              </Button>
              <Button type="button" variant="outline" className="ml-auto rounded-xl" onClick={() => setViewSupplier(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <SupplierForm
        open={isModalOpen}
        saving={saving}
        onClose={resetForm}
        onSubmit={handleCreateSupplier}
      />
    </div>
  );
}
