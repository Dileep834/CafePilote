import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  Clock3,
  Hourglass,
  PackagePlus,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PERMISSIONS } from '@/constants/permissions';
import { useHasPermission } from '@/hooks/useHasPermission';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { InventoryChart } from '@/modules/inventory/components/InventoryChart';
import { AdjustmentForm, type AdjustmentFormState } from '@/modules/inventory/adjustments/AdjustmentForm';
import { AdjustmentQuickChips } from '@/modules/inventory/adjustments/AdjustmentQuickChips';
import { AdjustmentTable } from '@/modules/inventory/adjustments/AdjustmentTable';
import { AdjustmentToolbar } from '@/modules/inventory/adjustments/AdjustmentToolbar';
import {
  buildIncreaseDecreasePoints,
  buildReasonPoints,
  buildTopProducts,
  buildTrendPoints,
  canApproveAdjustment,
  canDeleteAdjustment,
  computeAdjustmentKpis,
  decodeReason,
  encodeReason,
  filterAdjustmentRows,
  formatRelativeTime,
  signedAdjustment,
  toDateStr,
  uniqueSorted,
  DEFAULT_ADJUSTMENT_FILTERS,
} from '@/modules/inventory/adjustments/lib';
import type {
  AdjustmentFilters,
  AdjustmentProductOption,
  AdjustmentQuickFilter,
  AdjustmentReason,
  AdjustmentRow,
  AdjustmentStatus,
} from '@/modules/inventory/adjustments/types';
import { supabase } from '@/lib/supabase';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId } from '@/store/useTenantStore';

const EMPTY_FORM: AdjustmentFormState = {
  productId: '',
  adjustmentType: 'increase',
  quantity: '',
  reason: '',
  notes: '',
};

function resolveBranchId(user: ReturnType<typeof useAuthStore.getState>['user']) {
  const outletId = getTenantOutletId(user) || user?.outletId || '';
  if (!outletId || outletId === 'current-outlet') return '';
  return outletId;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function mapDbRow(item: any, productMap: Map<string, AdjustmentProductOption>): AdjustmentRow {
  const product = Array.isArray(item.product) ? item.product[0] : item.product;
  const decoded = decodeReason(item.reason);
  const meta = decoded.meta;
  const qty = Number(item.adjustment_qty ?? item.adjustment ?? 0);
  const adjustmentType = meta.adjustmentType || (qty < 0 ? 'decrease' : 'increase');
  const productMeta = productMap.get(item.product_id);
  const previousStock =
    item.previous_stock != null ? Number(item.previous_stock) : meta.previousStock ?? 0;
  const newStock =
    item.new_stock != null ? Number(item.new_stock) : meta.newStock ?? previousStock + qty;

  return {
    id: item.id,
    date: item.date,
    createdAt: item.created_at || null,
    productId: item.product_id,
    productName: product?.name || productMeta?.name || 'Unknown',
    category: product?.categories?.name || productMeta?.category || 'Uncategorized',
    unit: product?.unit || productMeta?.unit || 'Unit',
    previousStock,
    adjustment: qty,
    newStock,
    adjustmentType,
    reason: decoded.reason,
    notes: item.notes ?? meta.notes ?? '',
    status: (item.status as AdjustmentStatus) || meta.status || 'approved',
    employee: item.logged_by || meta.employee || '',
    approvedBy: item.approved_by || meta.approvedBy || '',
    franchiseId: item.franchise_id,
  };
}

const StockAdjustments: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const canAdjust = useHasPermission(PERMISSIONS.INVENTORY_ADJUST);
  const canApprove = canApproveAdjustment(user);
  const canDelete = canDeleteAdjustment(user);

  const [products, setProducts] = useState<AdjustmentProductOption[]>([]);
  const [rows, setRows] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [filters, setFilters] = useState<AdjustmentFilters>(DEFAULT_ADJUSTMENT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quick, setQuick] = useState<AdjustmentQuickFilter>('all');
  const [form, setForm] = useState<AdjustmentFormState>(EMPTY_FORM);
  const [viewRow, setViewRow] = useState<AdjustmentRow | null>(null);
  const [extendedSchema, setExtendedSchema] = useState(true);
  const [historyOnly, setHistoryOnly] = useState(false);
  const [, startTransition] = useTransition();

  const deferredSearch = useDeferredValue(filters.search);
  const debouncedSearch = useDebouncedValue(deferredSearch, 200);
  const branchId = resolveBranchId(user);
  const selectedProduct = products.find((p) => p.id === form.productId) || null;

  useEffect(() => {
    const fromQuery = searchParams.get('productId');
    const wantsHistory = searchParams.get('history') === '1';
    setHistoryOnly(wantsHistory);
    if (fromQuery) {
      setForm((f) => ({ ...f, productId: fromQuery }));
      setFilters((f) => ({ ...f, search: '' }));
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const companyId = getScopedCompanyId(user);
      let pQuery = supabase
        .from('products')
        .select('id, name, unit, categories(name)')
        .eq('is_active', true)
        .order('name');
      if (companyId) pQuery = pQuery.eq('company_id', companyId);
      const { data: productData, error: pErr } = await pQuery;
      if (pErr) throw pErr;

      const invMap: Record<string, number> = {};
      if (branchId) {
        const { data: invData } = await supabase
          .from('inventory')
          .select('product_id, current_quantity')
          .eq('outlet_id', branchId);
        invData?.forEach((row) => {
          invMap[row.product_id] = Number(row.current_quantity) || 0;
        });
      }

      const mappedProducts: AdjustmentProductOption[] = (productData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        unit: p.unit || 'Unit',
        category: p.categories?.name || 'Uncategorized',
        currentStock: invMap[p.id] || 0,
      }));
      setProducts(mappedProducts);
      const pmap = new Map(mappedProducts.map((p) => [p.id, p]));

      let query = supabase
        .from('stock_adjustments')
        .select(
          `
          id, date, adjustment_qty, reason, approved_by, franchise_id, product_id, created_at,
          notes, status, logged_by, previous_stock, new_stock, adjustment_type,
          product:products(name, unit, categories(name))
        `
        )
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);

      if (branchId) query = query.eq('franchise_id', branchId);

      let { data, error } = await query;
      if (error) {
        setExtendedSchema(false);
        let fallback = supabase
          .from('stock_adjustments')
          .select(
            `
            id, date, adjustment_qty, reason, approved_by, franchise_id, product_id, created_at,
            product:products(name, unit, categories(name))
          `
          )
          .order('date', { ascending: false })
          .limit(500);
        if (branchId) fallback = fallback.eq('franchise_id', branchId);
        const res = await fallback;
        if (res.error) throw res.error;
        data = res.data;
      } else {
        setExtendedSchema(true);
      }

      setRows((data || []).map((item) => mapDbRow(item, pmap)));
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err?.message || 'Could not load adjustments.' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, branchId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const scopedRows = useMemo(() => {
    if (historyOnly && form.productId) {
      return rows.filter((r) => r.productId === form.productId);
    }
    return rows;
  }, [rows, historyOnly, form.productId]);

  const filtered = useMemo(
    () => filterAdjustmentRows(scopedRows, filters, quick, debouncedSearch),
    [scopedRows, filters, quick, debouncedSearch]
  );

  const kpis = useMemo(() => computeAdjustmentKpis(scopedRows), [scopedRows]);
  const trend = useMemo(() => buildTrendPoints(scopedRows), [scopedRows]);
  const incDec = useMemo(() => buildIncreaseDecreasePoints(filtered), [filtered]);
  const topProducts = useMemo(() => buildTopProducts(filtered), [filtered]);
  const reasonPoints = useMemo(() => buildReasonPoints(filtered), [filtered]);

  const categories = useMemo(() => uniqueSorted(products.map((p) => p.category)), [products]);
  const employees = useMemo(() => uniqueSorted(rows.map((r) => r.employee)), [rows]);

  const chipCounts = useMemo(() => {
    const searched = filterAdjustmentRows(scopedRows, DEFAULT_ADJUSTMENT_FILTERS, 'all', debouncedSearch);
    return {
      all: searched.length,
      increase: filterAdjustmentRows(searched, DEFAULT_ADJUSTMENT_FILTERS, 'increase', '').length,
      decrease: filterAdjustmentRows(searched, DEFAULT_ADJUSTMENT_FILTERS, 'decrease', '').length,
      pending: filterAdjustmentRows(searched, DEFAULT_ADJUSTMENT_FILTERS, 'pending', '').length,
      approved: filterAdjustmentRows(searched, DEFAULT_ADJUSTMENT_FILTERS, 'approved', '').length,
      rejected: filterAdjustmentRows(searched, DEFAULT_ADJUSTMENT_FILTERS, 'rejected', '').length,
      today: filterAdjustmentRows(searched, DEFAULT_ADJUSTMENT_FILTERS, 'today', '').length,
      this_week: filterAdjustmentRows(searched, DEFAULT_ADJUSTMENT_FILTERS, 'this_week', '').length,
    } satisfies Partial<Record<AdjustmentQuickFilter, number>>;
  }, [scopedRows, debouncedSearch]);

  const adjustInventory = async (productId: string, delta: number) => {
    if (!branchId) return;
    const { data: invData } = await supabase
      .from('inventory')
      .select('current_quantity')
      .eq('outlet_id', branchId)
      .eq('product_id', productId)
      .maybeSingle();
    const current = invData ? Number(invData.current_quantity) : 0;
    await supabase.from('inventory').upsert(
      {
        outlet_id: branchId,
        product_id: productId,
        current_quantity: current + delta,
      },
      { onConflict: 'outlet_id, product_id' }
    );
  };

  const handleSubmit = async () => {
    if (!canAdjust) {
      setMessage({ type: 'error', text: 'You do not have permission to adjust stock.' });
      return;
    }
    if (!branchId) {
      setMessage({ type: 'error', text: 'Please select a branch first.' });
      return;
    }
    if (!form.productId || !form.reason || !form.quantity) {
      setMessage({ type: 'error', text: 'Product, quantity, and reason are required.' });
      return;
    }
    const qtyAbs = parseFloat(form.quantity);
    if (!Number.isFinite(qtyAbs) || qtyAbs <= 0) {
      setMessage({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }
    if (!selectedProduct) return;

    const signed = signedAdjustment(form.adjustmentType, qtyAbs);
    const previousStock = selectedProduct.currentStock;
    const newStock = previousStock + signed;
    if (newStock < 0) {
      setMessage({ type: 'error', text: 'Adjustment would make stock negative.' });
      return;
    }

    setSubmitting(true);
    try {
      const employee = user?.name || user?.email || 'Staff';
      const status: AdjustmentStatus = canApprove ? 'approved' : 'pending';
      const approvedBy = status === 'approved' ? employee : '';
      const reasonEncoded = encodeReason(form.reason, {
        notes: form.notes,
        status,
        approvedBy,
        employee,
        previousStock,
        newStock,
        adjustmentType: form.adjustmentType,
      });

      const baseRow: Record<string, unknown> = {
        franchise_id: branchId,
        product_id: form.productId,
        adjustment_qty: signed,
        reason: extendedSchema ? form.reason : reasonEncoded,
        approved_by: approvedBy || null,
        date: toDateStr(new Date()),
      };

      if (extendedSchema) {
        baseRow.notes = form.notes;
        baseRow.status = status;
        baseRow.logged_by = employee;
        baseRow.previous_stock = previousStock;
        baseRow.new_stock = newStock;
        baseRow.adjustment_type = form.adjustmentType;
      }

      const { error } = await supabase.from('stock_adjustments').insert([baseRow]);
      if (error) {
        const { error: e2 } = await supabase.from('stock_adjustments').insert([
          {
            franchise_id: branchId,
            product_id: form.productId,
            adjustment_qty: signed,
            reason: reasonEncoded,
            approved_by: approvedBy || null,
            date: toDateStr(new Date()),
          },
        ]);
        if (e2) throw e2;
        setExtendedSchema(false);
      }

      // Apply inventory immediately for approved; pending also applies then reverses on reject
      await adjustInventory(form.productId, signed);

      setForm((f) => ({ ...EMPTY_FORM, productId: historyOnly ? f.productId : '' }));
      setMessage({
        type: 'success',
        text: `Adjustment saved. Stock ${previousStock} → ${newStock} ${selectedProduct.unit}.`,
      });
      await loadData();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err?.message || 'Failed to save adjustment.' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (row: AdjustmentRow, status: AdjustmentStatus) => {
    if (!canApprove) return;
    try {
      const reasonEncoded = encodeReason(row.reason, {
        notes: row.notes,
        status,
        approvedBy: user?.name || '',
        employee: row.employee,
        previousStock: row.previousStock,
        newStock: row.newStock,
        adjustmentType: row.adjustmentType,
      });

      if (extendedSchema) {
        const { error } = await supabase
          .from('stock_adjustments')
          .update({
            status,
            approved_by: user?.name || '',
            reason: row.reason,
            notes: row.notes,
            logged_by: row.employee,
            previous_stock: row.previousStock,
            new_stock: row.newStock,
            adjustment_type: row.adjustmentType,
          })
          .eq('id', row.id);
        if (error) {
          await supabase.from('stock_adjustments').update({ reason: reasonEncoded, approved_by: user?.name || '' }).eq('id', row.id);
          setExtendedSchema(false);
        }
      } else {
        await supabase
          .from('stock_adjustments')
          .update({ reason: reasonEncoded, approved_by: user?.name || '' })
          .eq('id', row.id);
      }

      if (status === 'rejected' && row.status !== 'rejected') {
        await adjustInventory(row.productId, -row.adjustment);
      }

      setMessage({
        type: 'success',
        text: status === 'approved' ? 'Adjustment approved.' : 'Adjustment rejected. Stock restored.',
      });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Could not update status.' });
    }
  };

  const handleDelete = async (row: AdjustmentRow) => {
    if (!canDelete) return;
    if (!window.confirm(`Delete adjustment for ${row.productName}?`)) return;
    try {
      const { error } = await supabase.from('stock_adjustments').delete().eq('id', row.id);
      if (error) throw error;
      if (row.status !== 'rejected') {
        await adjustInventory(row.productId, -row.adjustment);
      }
      setMessage({ type: 'success', text: 'Adjustment deleted.' });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Could not delete adjustment.' });
    }
  };

  const exportCsv = () => {
    const header = [
      'Date',
      'Time',
      'Product',
      'Category',
      'Previous Stock',
      'Adjustment',
      'New Stock',
      'Reason',
      'Status',
      'Employee',
      'Approved By',
      'Notes',
    ];
    const lines = filtered.map((r) =>
      [
        r.date,
        r.createdAt || '',
        r.productName,
        r.category,
        r.previousStock,
        r.adjustment,
        r.newStock,
        r.reason,
        r.status,
        r.employee,
        r.approvedBy,
        r.notes,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-adjustments-${toDateStr(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const qty = parseFloat(form.quantity) || 0;
  const preview =
    selectedProduct && qty > 0
      ? selectedProduct.currentStock + signedAdjustment(form.adjustmentType, qty)
      : null;
  const canSubmit =
    Boolean(canAdjust && branchId && form.productId && form.reason && form.quantity) &&
    !(preview != null && preview < 0);

  const focusedProductName = products.find((p) => p.id === form.productId)?.name;

  return (
    <div className="relative mx-auto w-full max-w-[1600px] space-y-5 pb-10 text-base sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Stock Adjustments</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Correct inventory after stock counts, transfers, damages and manual corrections.
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Button
          type="button"
          className="h-11 rounded-xl bg-[#FF6A00] font-semibold text-white hover:bg-[#e85f00]"
          onClick={() => document.getElementById('adjustment-form')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <Plus className="h-4 w-4" />
          Create Adjustment
        </Button>
      </div>

      {historyOnly && focusedProductName ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Showing adjustment history for <strong>{focusedProductName}</strong>. Use the form below to add a new correction.
        </div>
      ) : null}

      {message ? (
        <div
          className={cn(
            'rounded-xl px-4 py-3 text-sm font-medium',
            message.type === 'success' && 'border border-emerald-200 bg-emerald-50 text-emerald-900',
            message.type === 'error' && 'border border-red-200 bg-red-50 text-red-900',
            message.type === 'info' && 'border border-sky-200 bg-sky-50 text-sky-900'
          )}
        >
          {message.text}
          <button type="button" className="ml-3 font-semibold underline" onClick={() => setMessage(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <InventoryCard
          label="Today's Adjustments"
          value={String(kpis.todaysCount)}
          subtitle="Entries logged today"
          icon={ClipboardList}
          tone="blue"
        />
        <InventoryCard
          label="Inventory Increased"
          value={String(kpis.inventoryIncreased)}
          subtitle="Units added"
          icon={ArrowUpRight}
          tone="emerald"
        />
        <InventoryCard
          label="Inventory Reduced"
          value={String(kpis.inventoryReduced)}
          subtitle="Units removed"
          icon={ArrowDownRight}
          tone="red"
        />
        <InventoryCard
          label="Pending Approvals"
          value={String(kpis.pendingApprovals)}
          subtitle={canApprove ? 'Needs manager review' : 'Awaiting approval'}
          icon={Hourglass}
          tone="orange"
          onClick={canApprove ? () => setQuick('pending') : undefined}
        />
        <InventoryCard
          label="Last Adjustment Time"
          value={formatRelativeTime(kpis.lastAdjustmentAt)}
          subtitle="Most recent change"
          icon={Clock3}
          tone="slate"
        />
      </div>

      <AdjustmentToolbar
        filters={filters}
        categories={categories}
        employees={employees}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        onChange={(next) => startTransition(() => setFilters((f) => ({ ...f, ...next })))}
        onReset={() => {
          setFilters(DEFAULT_ADJUSTMENT_FILTERS);
          setQuick('all');
        }}
        onExport={exportCsv}
      />

      <AdjustmentQuickChips
        active={quick}
        counts={chipCounts}
        onChange={(next) => startTransition(() => setQuick(next))}
      />

      <AdjustmentForm
        form={form}
        products={products}
        selected={selectedProduct}
        submitting={submitting}
        canSubmit={canSubmit}
        onChange={(next) => setForm((f) => ({ ...f, ...next }))}
        onSubmit={handleSubmit}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InventoryChart
          title="Adjustment Trend"
          subtitle="Last 30 days · absolute units"
          data={trend}
          color="#FF6A00"
          emptyTitle="No trend yet"
          emptyMessage="Create adjustments to see activity over time."
        />
        <InventoryChart
          title="Increase vs Decrease"
          subtitle="Net movement by direction"
          data={incDec}
          color="#0D1B2A"
          emptyTitle="No movement yet"
          emptyMessage="Increase and decrease totals appear after you log adjustments."
        />
        <InventoryChart
          title="Top Adjusted Products"
          subtitle="Highest absolute changes"
          data={topProducts}
          color="#FF6A00"
          emptyTitle="No products yet"
          emptyMessage="Top adjusted products will show here."
        />
        <InventoryChart
          title="Most Common Reasons"
          subtitle="Why stock was corrected"
          data={reasonPoints}
          color="#0D1B2A"
          emptyTitle="No reasons yet"
          emptyMessage="Reason breakdown appears after entries are logged."
        />
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Adjustment History</h2>
          <p className="text-sm text-slate-500">{filtered.length} entries</p>
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-100">
            Loading adjustments…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-100">
            <PackagePlus className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-lg font-bold text-slate-800">No stock adjustments recorded today.</p>
            <p className="mt-1 text-sm text-slate-500">
              Create an adjustment after a stock count, transfer, or manual correction.
            </p>
            <Button
              type="button"
              className="mt-4 rounded-xl bg-[#FF6A00] hover:bg-[#e85f00]"
              onClick={() => document.getElementById('adjustment-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Plus className="h-4 w-4" />
              Create Adjustment
            </Button>
          </div>
        ) : (
          <AdjustmentTable
            rows={filtered}
            canApprove={canApprove}
            canDelete={canDelete}
            onView={setViewRow}
            onApprove={(row) => void updateStatus(row, 'approved')}
            onReject={(row) => void updateStatus(row, 'rejected')}
            onDelete={(row) => void handleDelete(row)}
          />
        )}
      </div>

      {viewRow ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewRow.productName}</h3>
                <p className="text-sm text-slate-500">
                  {viewRow.date} · {viewRow.reason} · {viewRow.status}
                </p>
              </div>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setViewRow(null)}>
                Close
              </Button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Previous → New</dt>
                <dd className="font-semibold">
                  {viewRow.previousStock} → {viewRow.newStock} {viewRow.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Adjustment</dt>
                <dd className={cn('font-bold', viewRow.adjustment >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {viewRow.adjustment > 0 ? `+${viewRow.adjustment}` : viewRow.adjustment}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Employee</dt>
                <dd className="font-semibold">{viewRow.employee || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Approved by</dt>
                <dd className="font-semibold">{viewRow.approvedBy || '—'}</dd>
              </div>
              {viewRow.notes ? (
                <div>
                  <dt className="text-slate-500">Notes</dt>
                  <dd className="mt-1 rounded-xl bg-slate-50 p-3 text-slate-700">{viewRow.notes}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StockAdjustments;
