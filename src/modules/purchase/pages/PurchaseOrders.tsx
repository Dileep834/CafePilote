import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  PackageCheck,
  Plus,
  ShoppingCart,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { supabase } from '@/lib/supabase';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { formatCurrency } from '@/utils/format';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { InventoryChart } from '@/modules/inventory/components/InventoryChart';
import { fetchInventoryDashboard } from '@/modules/inventory/lib/fetchInventory';
import { usePurchaseStore, type PurchaseOrder } from '../store/usePurchaseStore';
import {
  DEFAULT_PO_FILTERS,
  buildLowStockSuggestions,
  buildMonthlySpend,
  buildPurchaseTrend,
  buildPurchasesBySupplier,
  buildSupplierSummaries,
  computePOKpis,
  filterPurchaseOrders,
  matchesPOStatus,
  resolveSuggestionsForCatalog,
  toDateStr,
  type POFilters,
  type POStatusFilter,
} from '../lib/poHelpers';
import { POToolbar } from '../components/POToolbar';
import { POQuickChips } from '../components/POQuickChips';
import { POSuggestions } from '../components/POSuggestions';
import { PODetailPanel, POTable } from '../components/POTable';

type ProductOption = { id: string; name: string; unit: string; purchase_price?: number };

function exportCsv(orders: PurchaseOrder[]) {
  const header = [
    'PO Number',
    'Supplier',
    'Order Date',
    'Expected Delivery',
    'Items',
    'Total Amount',
    'Status',
    'Outlet',
    'Notes',
  ];
  const lines = orders.map((po) =>
    [
      po.po_number,
      po.suppliers?.name || '',
      (po.created_at || '').slice(0, 10),
      po.expected_date || '',
      po.items?.length || 0,
      po.total_amount,
      po.status,
      po.outlets?.name || '',
      po.notes || '',
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
  a.download = `purchase-orders-${toDateStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function printPO(po: PurchaseOrder) {
  const items = (po.items || [])
    .map(
      (item) =>
        `<tr><td>${item.products?.name || ''}</td><td>${item.quantity} ${item.products?.unit || ''}</td><td>${formatCurrency(item.unit_price)}</td><td>${formatCurrency(item.total_price)}</td></tr>`
    )
    .join('');
  const html = `<!doctype html><html><head><title>${po.po_number}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}h1{margin:0}</style>
    </head><body>
    <h1>${po.po_number}</h1>
    <p><strong>Supplier:</strong> ${po.suppliers?.name || '—'} · <strong>Status:</strong> ${po.status}</p>
    <p><strong>Order date:</strong> ${(po.created_at || '').slice(0, 10)} · <strong>Expected:</strong> ${po.expected_date || '—'}</p>
    <table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
    <p style="margin-top:16px;font-weight:700">Grand total: ${formatCurrency(po.total_amount)}</p>
    ${po.notes ? `<p><strong>Notes:</strong> ${po.notes}</p>` : ''}
    </body></html>`;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export function PurchaseOrders() {
  const {
    purchaseOrders,
    suppliers,
    isLoading,
    error,
    fetchPurchaseOrders,
    fetchSuppliers,
    createPurchaseOrder,
    updatePOStatus,
  } = usePurchaseStore();
  const { user } = useAuthStore();
  const outlets = useTenantStore((s) => s.outlets);
  const [searchParams, setSearchParams] = useSearchParams();
  const [, startTransition] = useTransition();

  const [filters, setFilters] = useState<POFilters>(DEFAULT_PO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [poItems, setPoItems] = useState<
    { product_id: string; quantity: number; unit_price: number; label?: string }[]
  >([]);
  const [saving, setSaving] = useState(false);

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-dashboard', user?.companyId, 'po-suggestions'],
    queryFn: () => fetchInventoryDashboard(user?.companyId),
  });

  const fetchProducts = useCallback(async () => {
    const companyId = getScopedCompanyId(useAuthStore.getState().user);
    let query = supabase
      .from('products')
      .select('id, name, unit, purchase_price')
      .eq('is_active', true)
      .order('name');
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    if (data) setProducts(data as ProductOption[]);
  }, []);

  useEffect(() => {
    void fetchPurchaseOrders();
    void fetchSuppliers();
    void fetchProducts();
  }, [fetchPurchaseOrders, fetchSuppliers, fetchProducts]);

  useEffect(() => {
    const productId = searchParams.get('productId');
    const create = searchParams.get('create') === '1';
    if (!productId || !create || products.length === 0) return;

    const qty = Math.max(1, Number(searchParams.get('qty') || 1));
    const unitPriceFromQuery = Number(searchParams.get('unitPrice') || 0);
    const product = products.find((p) => p.id === productId);
    const unitPrice =
      unitPriceFromQuery > 0 ? unitPriceFromQuery : Number(product?.purchase_price || 0);

    setPoItems([{ product_id: productId, quantity: qty, unit_price: unitPrice }]);
    setIsModalOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete('create');
    next.delete('qty');
    next.delete('unitPrice');
    setSearchParams(next, { replace: true });
  }, [products, searchParams, setSearchParams]);

  useEffect(() => {
    const supplierId = searchParams.get('supplier');
    const create = searchParams.get('create') === '1';
    if (!supplierId) return;

    if (create) {
      setSelectedSupplier(supplierId);
      setIsModalOpen(true);
    } else {
      startTransition(() => {
        setFilters((prev) => ({ ...prev, supplier: supplierId }));
      });
    }

    const next = new URLSearchParams(searchParams);
    next.delete('supplier');
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, startTransition]);

  const suggestions = useMemo(() => {
    const built = buildLowStockSuggestions(inventoryData?.items || []);
    if (products.length === 0) return built;
    // Prefer company-catalog product ids so the Create PO select can display the right names.
    return resolveSuggestionsForCatalog(built, products).resolved;
  }, [inventoryData?.items, products]);

  const filteredOrders = useMemo(
    () => filterPurchaseOrders(purchaseOrders, filters, filters.search),
    [purchaseOrders, filters]
  );

  const kpis = useMemo(() => computePOKpis(purchaseOrders), [purchaseOrders]);

  const chipCounts = useMemo(() => {
    const counts: Partial<Record<POStatusFilter, number>> = {
      all: purchaseOrders.length,
    };
    (['Draft', 'Pending', 'Approved', 'Ordered', 'Received', 'Cancelled', 'Overdue'] as POStatusFilter[]).forEach(
      (status) => {
        counts[status] = purchaseOrders.filter((po) => matchesPOStatus(po, status)).length;
      }
    );
    return counts;
  }, [purchaseOrders]);

  const trend = useMemo(() => buildPurchaseTrend(purchaseOrders, 30), [purchaseOrders]);
  const bySupplier = useMemo(() => buildPurchasesBySupplier(purchaseOrders), [purchaseOrders]);
  const monthly = useMemo(() => buildMonthlySpend(purchaseOrders), [purchaseOrders]);
  const supplierSummaries = useMemo(() => buildSupplierSummaries(purchaseOrders), [purchaseOrders]);

  const outletOptions = useMemo(
    () =>
      outlets.map((o) => ({ id: o.id, name: o.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [outlets]
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

  const updateFilters = (next: Partial<POFilters>) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, ...next }));
    });
  };

  const openCreateModal = (
    prefill?: { product_id: string; quantity: number; unit_price: number; label?: string }[]
  ) => {
    if (prefill?.length) setPoItems(prefill);
    else if (poItems.length === 0) setPoItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
    setIsModalOpen(true);
  };

  const generateSuggestedPO = () => {
    if (suggestions.length === 0) {
      setActionMessage('Inventory is healthy — nothing to suggest right now.');
      return;
    }

    const { lines, extras, resolved } = resolveSuggestionsForCatalog(suggestions, products);
    const labelById = new Map(resolved.map((s) => [s.productId, `${s.productName} (${s.unit})`]));

    if (extras.length > 0) {
      setProducts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [
          ...prev,
          ...extras
            .filter((e) => !ids.has(e.id))
            .map((e) => ({
              id: e.id,
              name: e.name,
              unit: e.unit || 'Unit',
              purchase_price: e.purchase_price,
            })),
        ].sort((a, b) => a.name.localeCompare(b.name));
      });
    }

    if (lines.length === 0) {
      setActionMessage('Could not map suggestions to products in your catalog.');
      return;
    }

    openCreateModal(
      lines.map((line) => ({
        ...line,
        label: labelById.get(line.product_id),
      }))
    );
    setNotes('Auto-generated from low-stock inventory suggestions.');
    setActionMessage(`Loaded ${lines.length} suggested line item${lines.length === 1 ? '' : 's'}.`);
  };

  const openReceiveFirstPending = () => {
    const pending = purchaseOrders.find((po) => po.status === 'Pending');
    if (!pending) {
      setActionMessage('No pending purchase orders ready to receive.');
      updateFilters({ status: 'Pending' });
      return;
    }
    setViewPO(pending);
  };

  const handleAddItem = () => {
    setPoItems([...poItems, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...poItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'product_id') {
      const product = products.find((p) => p.id === value);
      if (product && !newItems[index].unit_price) {
        newItems[index].unit_price = Number(product.purchase_price || 0);
      }
    }
    setPoItems(newItems);
  };

  const removeItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setSelectedSupplier('');
    setNotes('');
    setExpectedDate('');
    setPoItems([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || poItems.length === 0) return;
    const validItems = poItems.filter((item) => item.product_id && item.quantity > 0);
    if (validItems.length === 0) return;
    setSaving(true);
    try {
      await createPurchaseOrder(
        {
          supplier_id: selectedSupplier,
          notes,
          expected_date: expectedDate || null,
        },
        validItems
      );
      resetModal();
      setActionMessage('Purchase order saved as draft.');
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not create purchase order.');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (po: PurchaseOrder) => {
    try {
      await updatePOStatus(po.id, 'Pending');
      setActionMessage(`${po.po_number} approved and sent to supplier.`);
      setViewPO((prev) => (prev?.id === po.id ? { ...prev, status: 'Pending' } : prev));
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not approve order.');
    }
  };

  const handleCancel = async (po: PurchaseOrder) => {
    try {
      await updatePOStatus(po.id, 'Cancelled');
      setActionMessage(`${po.po_number} cancelled.`);
      setViewPO((prev) => (prev?.id === po.id ? { ...prev, status: 'Cancelled' } : prev));
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not cancel order.');
    }
  };

  const handleReceive = async (po: PurchaseOrder) => {
    try {
      await updatePOStatus(po.id, 'Received');
      setActionMessage(`${po.po_number} received — inventory updated.`);
      setViewPO((prev) => (prev?.id === po.id ? { ...prev, status: 'Received' } : prev));
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Could not receive goods.');
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[1600px] space-y-5 text-base sm:space-y-6 lg:space-y-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[32px] lg:text-[36px]">
            Purchase Orders
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Plan supplier orders, approve purchases, and receive goods into inventory.
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm">
            {todayLabel}
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">
          <Button
            type="button"
            className="h-11 rounded-xl bg-[#FF6A00] px-4 text-white hover:bg-[#e85f00]"
            onClick={() => openCreateModal()}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">Create Purchase Order</span>
            <span className="lg:hidden">Create PO</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-slate-200"
            onClick={openReceiveFirstPending}
          >
            <PackageCheck className="h-4 w-4" />
            <span className="hidden lg:inline">Receive Goods</span>
            <span className="lg:hidden">Receive</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-slate-200"
            onClick={generateSuggestedPO}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden xl:inline">Generate Suggested PO</span>
            <span className="xl:hidden">Suggest</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-slate-200"
            onClick={() => exportCsv(filteredOrders)}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-base text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Purchase orders could not load</p>
            <p className="mt-1 text-red-700">{error}</p>
            <button
              type="button"
              className="mt-2 font-semibold text-red-800 underline"
              onClick={() => void fetchPurchaseOrders()}
            >
              Try again
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
          label="Pending Purchase Orders"
          value={String(kpis.pending)}
          subtitle="Awaiting receive"
          icon={Truck}
          tone="blue"
          onClick={() => updateFilters({ status: 'Pending' })}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Awaiting Approval"
          value={String(kpis.awaitingApproval)}
          subtitle="Drafts to review"
          icon={Clock}
          tone="amber"
          onClick={() => updateFilters({ status: 'Draft' })}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Ordered Today"
          value={String(kpis.orderedToday)}
          subtitle="Created today"
          icon={ShoppingCart}
          tone="orange"
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Received Today"
          value={String(kpis.receivedToday)}
          subtitle="Stocked into inventory"
          icon={CheckCircle2}
          tone="emerald"
          onClick={() => updateFilters({ status: 'Received' })}
        />
        <InventoryCard
          className="w-[min(78vw,260px)] shrink-0 snap-start md:w-auto md:min-w-0"
          label="Overdue Orders"
          value={String(kpis.overdue)}
          subtitle={kpis.overdue > 0 ? 'Past expected delivery' : 'On schedule'}
          icon={AlertTriangle}
          tone="red"
          onClick={() => updateFilters({ status: 'Overdue' })}
        />
      </div>

      <POSuggestions
        suggestions={suggestions}
        onGenerate={generateSuggestedPO}
        onCreateManual={() => openCreateModal()}
      />

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        <InventoryChart
          title="Purchase Trend"
          subtitle="Last 30 days"
          data={trend}
          color="#FF6A00"
          valueFormatter={(v) => formatCurrency(v)}
          emptyTitle="No purchase activity yet."
          emptyMessage="Create a purchase order to start tracking spend."
          emptyActionLabel="Create Purchase Order"
          onEmptyAction={() => openCreateModal()}
        />
        <InventoryChart
          title="Purchases by Supplier"
          subtitle="Top suppliers by spend"
          data={bySupplier}
          color="#0D1B2A"
          valueFormatter={(v) => formatCurrency(v)}
          emptyTitle="No supplier spend yet."
          emptyMessage="Orders will appear here once you create POs."
        />
        <InventoryChart
          title="Monthly Purchase Spend"
          subtitle="Last 6 months"
          data={monthly}
          color="#0D1B2A"
          valueFormatter={(v) => formatCurrency(v)}
          emptyTitle="No monthly history yet."
          emptyMessage="Spend trends build as you place orders."
        />
      </div>

      {/* Supplier summaries */}
      {supplierSummaries.length > 0 ? (
        <section>
          <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-[22px]">
              Supplier summary
            </h2>
            <p className="text-[13px] font-medium text-slate-500">Purchases, outstanding & delivery</p>
          </div>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
            {supplierSummaries.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => updateFilters({ supplier: s.id })}
                className="min-w-[240px] shrink-0 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-0"
              >
                <p className="truncate text-base font-semibold text-slate-900">{s.name}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                  {formatCurrency(s.totalPurchases)}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                  <span>{s.orderCount} orders</span>
                  <span>Outstanding {formatCurrency(s.outstanding)}</span>
                  <span>
                    Avg delivery {s.avgDeliveryDays != null ? `${s.avgDeliveryDays}d` : '—'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Filters + table */}
      <div className="w-full min-w-0 space-y-3 sm:space-y-4">
        <POToolbar
          filters={filters}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          outlets={outletOptions}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          onChange={updateFilters}
          onReset={() => setFilters(DEFAULT_PO_FILTERS)}
          onExport={() => exportCsv(filteredOrders)}
        />

        <POQuickChips
          active={filters.status}
          counts={chipCounts}
          onChange={(status) => updateFilters({ status })}
        />

        {isLoading ? (
          <div className="rounded-xl bg-white px-4 py-16 text-center shadow-sm ring-1 ring-slate-100">
            <p className="font-medium text-slate-500">Loading purchase orders…</p>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-12 text-center shadow-sm ring-1 ring-slate-100 sm:px-6 sm:py-16">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-slate-200" />
            <p className="text-lg font-semibold text-slate-800 sm:text-[22px]">No purchase orders yet.</p>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Inventory is healthy. Generate a suggested purchase order or create one manually.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-11 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
                onClick={generateSuggestedPO}
              >
                <Sparkles className="h-4 w-4" />
                Generate Suggested PO
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => openCreateModal()}
              >
                <Plus className="h-4 w-4" />
                Create Purchase Order
              </Button>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-12 text-center shadow-sm ring-1 ring-slate-100 sm:px-6 sm:py-16">
            <p className="text-lg font-semibold text-slate-800 sm:text-[22px]">No purchase orders match</p>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">Reset filters or create a new order.</p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setFilters(DEFAULT_PO_FILTERS)}
              >
                Reset Filter
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
                onClick={() => openCreateModal()}
              >
                Create Purchase Order
              </Button>
            </div>
          </div>
        ) : (
          <POTable
            orders={filteredOrders}
            onView={setViewPO}
            onEdit={(po) => setViewPO(po)}
            onApprove={handleApprove}
            onCancel={handleCancel}
            onReceive={handleReceive}
            onPrint={printPO}
          />
        )}
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl"
            onClick={generateSuggestedPO}
          >
            <Sparkles className="h-4 w-4" />
            Suggest
          </Button>
          <Button
            type="button"
            className="h-12 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
            onClick={() => openCreateModal()}
          >
            <Plus className="h-5 w-5" />
            Create PO
          </Button>
        </div>
      </div>

      {/* View / detail drawer */}
      {viewPO ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{viewPO.po_number}</h2>
                <p className="text-sm text-slate-500">
                  {viewPO.suppliers?.name || 'Supplier'} · {formatCurrency(viewPO.total_amount)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setViewPO(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <PODetailPanel po={viewPO} />
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white p-4">
              {viewPO.status === 'Draft' ? (
                <Button type="button" className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={() => void handleApprove(viewPO)}>
                  Approve
                </Button>
              ) : null}
              {viewPO.status === 'Pending' ? (
                <Button type="button" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleReceive(viewPO)}>
                  Receive Goods
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => printPO(viewPO)}>
                Print
              </Button>
              {viewPO.status === 'Draft' || viewPO.status === 'Pending' ? (
                <Button type="button" variant="outline" className="rounded-xl text-red-600" onClick={() => void handleCancel(viewPO)}>
                  Cancel
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="ml-auto rounded-xl" onClick={() => setViewPO(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Create PO Modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">Create Purchase Order</h2>
              <button type="button" onClick={resetModal} className="text-slate-400 hover:text-slate-600" aria-label="Close">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Select Supplier *</label>
                <select
                  required
                  className="w-full rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                >
                  <option value="" disabled>
                    — Choose Supplier —
                  </option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Expected delivery</label>
                <input
                  type="date"
                  className="w-full rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Order Items *</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-sm font-semibold text-[#FF6A00] hover:text-[#e85f00]"
                  >
                    <Plus className="h-4 w-4" /> Add Item
                  </button>
                </div>

                <div className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  {poItems.length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-500">
                      Click &quot;Add Item&quot; to add products to this order.
                    </div>
                  ) : null}
                  {poItems.map((item, index) => {
                    const inCatalog = products.some((p) => p.id === item.product_id);
                    return (
                    <div key={`${item.product_id || 'new'}-${index}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        required
                        className="min-w-0 flex-1 rounded-lg border-0 bg-white px-2 py-2 text-sm shadow-sm ring-1 ring-slate-200"
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      >
                        <option value="" disabled>
                          Select Product
                        </option>
                        {item.product_id && !inCatalog ? (
                          <option value={item.product_id}>
                            {item.label || 'Suggested product'}
                          </option>
                        ) : null}
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        required
                        placeholder="Qty"
                        className="w-full rounded-lg border-0 bg-white px-2 py-2 text-sm shadow-sm ring-1 ring-slate-200 sm:w-24"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                      />
                      <div className="relative w-full sm:w-32">
                        <span className="absolute left-3 top-2 text-sm text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="Price"
                          className="w-full rounded-lg border-0 bg-white py-2 pl-7 pr-2 text-sm shadow-sm ring-1 ring-slate-200"
                          value={item.unit_price || ''}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-400 hover:text-red-600"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                    );
                  })}

                  {poItems.length > 0 ? (
                    <div className="mt-3 border-t border-slate-200 pt-3 text-right">
                      <span className="mr-4 text-sm font-semibold text-slate-500">Total Estimate:</span>
                      <span className="text-lg font-black text-slate-800">
                        {formatCurrency(
                          poItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0)
                        )}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Notes (Optional)</label>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="sticky bottom-0 flex gap-3 bg-white pt-2">
                <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={resetModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={poItems.length === 0 || !selectedSupplier || saving}
                  className="h-11 flex-1 rounded-xl bg-[#FF6A00] text-white hover:bg-[#e85f00]"
                >
                  {saving ? 'Saving…' : 'Save as Draft'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
