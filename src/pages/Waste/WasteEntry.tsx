import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  AlertTriangle,
  ClipboardList,
  Hourglass,
  IndianRupee,
  Percent,
  Plus,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { InventoryChart } from '@/modules/inventory/components/InventoryChart';
import { WasteForm, type WasteFormState } from '@/modules/inventory/waste/WasteForm';
import {
  buildCategoryPoints,
  buildTrendPoints,
  canApproveWaste,
  canDeleteWaste,
  canEditWaste,
  computeWasteKpis,
  decodeReason,
  encodeReason,
  filterWasteRows,
  toDateStr,
  uniqueSorted,
} from '@/modules/inventory/waste/lib';
import { WasteQuickChips } from '@/modules/inventory/waste/WasteQuickChips';
import { WasteTable } from '@/modules/inventory/waste/WasteTable';
import { WasteToolbar } from '@/modules/inventory/waste/WasteToolbar';
import {
  DEFAULT_WASTE_FILTERS,
  type WasteFilters,
  type WasteLogRow,
  type WasteProductOption,
  type WasteQuickFilter,
  type WasteReason,
  type WasteStatus,
} from '@/modules/inventory/waste/types';
import { useHasPermission } from '@/hooks/useHasPermission';
import { supabase } from '@/lib/supabase';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { useAuthStore } from '@/store/useAuthStore';
import { getTenantOutletId } from '@/store/useTenantStore';
import { PERMISSIONS } from '@/constants/permissions';

const EMPTY_FORM: WasteFormState = {
  productId: '',
  quantity: '',
  reason: '',
  notes: '',
  imageFile: null,
  imagePreview: '',
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

function mapDbRow(item: any, productMap: Map<string, WasteProductOption>): WasteLogRow {
  const product = Array.isArray(item.product) ? item.product[0] : item.product;
  const decoded = decodeReason(item.reason);
  const productMeta = productMap.get(item.product_id);
  const unitCost =
    item.unit_cost != null
      ? Number(item.unit_cost)
      : decoded.meta.unitCost ?? productMeta?.purchasePrice ?? 0;
  const totalLoss =
    item.total_loss != null
      ? Number(item.total_loss)
      : decoded.meta.totalLoss ?? Number(item.quantity) * unitCost;

  return {
    id: item.id,
    date: item.date,
    createdAt: item.created_at || null,
    productId: item.product_id,
    productName: product?.name || productMeta?.name || 'Unknown',
    category: product?.categories?.name || productMeta?.category || 'Uncategorized',
    supplier: productMeta?.supplier || '—',
    quantity: Number(item.quantity) || 0,
    unit: product?.unit || productMeta?.unit || 'Unit',
    unitCost,
    totalLoss,
    reason: decoded.reason,
    notes: item.notes ?? decoded.meta.notes ?? '',
    status: (item.status as WasteStatus) || decoded.meta.status || 'pending',
    loggedBy: item.logged_by || '',
    approvedBy: item.approved_by ?? decoded.meta.approvedBy ?? '',
    imageUrl: item.image_url ?? decoded.meta.imageUrl ?? '',
    franchiseId: item.franchise_id,
  };
}

const WasteEntry: React.FC = () => {
  const { user } = useAuthStore();
  const canLog = useHasPermission(PERMISSIONS.INVENTORY_WASTE);
  const canApprove = canApproveWaste(user);
  const canDelete = canDeleteWaste(user);

  const [products, setProducts] = useState<WasteProductOption[]>([]);
  const [rows, setRows] = useState<WasteLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState<WasteFilters>(DEFAULT_WASTE_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quick, setQuick] = useState<WasteQuickFilter>('all');
  const [form, setForm] = useState<WasteFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<WasteLogRow | null>(null);
  const [inventoryValue, setInventoryValue] = useState<number | null>(null);
  const [extendedSchema, setExtendedSchema] = useState(true);
  const [, startTransition] = useTransition();

  const deferredSearch = useDeferredValue(filters.search);
  const debouncedSearch = useDebouncedValue(deferredSearch, 200);

  const branchId = resolveBranchId(user);
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const selectedProduct = products.find((p) => p.id === form.productId) || null;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const companyId = getScopedCompanyId(user);
      let pQuery = supabase
        .from('products')
        .select('id, name, unit, code, purchase_price, item_type, categories(name)')
        .eq('is_active', true)
        .order('name');
      if (companyId) pQuery = pQuery.eq('company_id', companyId);
      const { data: productData, error: pErr } = await pQuery;
      if (pErr) throw pErr;

      const invMap: Record<string, number> = {};
      let invValue = 0;
      if (branchId) {
        const { data: invData } = await supabase
          .from('inventory')
          .select('product_id, current_quantity')
          .eq('outlet_id', branchId);
        invData?.forEach((row) => {
          invMap[row.product_id] = Number(row.current_quantity) || 0;
        });
      }

      const mappedProducts: WasteProductOption[] = (productData || []).map((p: any) => {
        const price = Number(p.purchase_price) || 0;
        const stock = invMap[p.id] || 0;
        invValue += stock * price;
        return {
          id: p.id,
          name: p.name,
          unit: p.unit || 'Unit',
          category: p.categories?.name || 'Uncategorized',
          supplier: '—',
          purchasePrice: price,
          currentStock: stock,
        };
      });
      setProducts(mappedProducts);
      setInventoryValue(invValue);

      const pmap = new Map(mappedProducts.map((p) => [p.id, p]));

      // Prefer extended columns; fall back if schema not migrated yet.
      let wasteQuery = supabase
        .from('waste_logs')
        .select(
          `
          id, date, quantity, reason, logged_by, franchise_id, product_id, created_at,
          notes, status, approved_by, unit_cost, total_loss, image_url,
          product:products(name, unit, categories(name))
        `
        )
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);

      if (branchId) wasteQuery = wasteQuery.eq('franchise_id', branchId);

      let { data: wasteData, error: wErr } = await wasteQuery;
      if (wErr) {
        setExtendedSchema(false);
        let fallback = supabase
          .from('waste_logs')
          .select(
            `
            id, date, quantity, reason, logged_by, franchise_id, product_id, created_at,
            product:products(name, unit, categories(name))
          `
          )
          .order('date', { ascending: false })
          .limit(500);
        if (branchId) fallback = fallback.eq('franchise_id', branchId);
        const res = await fallback;
        if (res.error) throw res.error;
        wasteData = res.data;
      } else {
        setExtendedSchema(true);
      }

      setRows((wasteData || []).map((item) => mapDbRow(item, pmap)));
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err?.message || 'Could not load waste logs.' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, branchId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(
    () => filterWasteRows(rows, filters, quick, debouncedSearch),
    [rows, filters, quick, debouncedSearch]
  );

  const kpis = useMemo(() => computeWasteKpis(filtered, inventoryValue), [filtered, inventoryValue]);
  const trend = useMemo(() => buildTrendPoints(rows), [rows]);
  const byCategory = useMemo(() => buildCategoryPoints(filtered), [filtered]);

  const categories = useMemo(() => uniqueSorted(products.map((p) => p.category)), [products]);
  const suppliers = useMemo(
    () => uniqueSorted(products.map((p) => p.supplier).filter((s) => s && s !== '—')),
    [products]
  );
  const employees = useMemo(() => uniqueSorted(rows.map((r) => r.loggedBy)), [rows]);

  const chipCounts = useMemo(() => {
    const searched = filterWasteRows(rows, DEFAULT_WASTE_FILTERS, 'all', debouncedSearch);
    return {
      all: searched.length,
      today: filterWasteRows(searched, DEFAULT_WASTE_FILTERS, 'today', '').length,
      this_week: filterWasteRows(searched, DEFAULT_WASTE_FILTERS, 'this_week', '').length,
      expired: filterWasteRows(searched, DEFAULT_WASTE_FILTERS, 'expired', '').length,
      damaged: filterWasteRows(searched, DEFAULT_WASTE_FILTERS, 'damaged', '').length,
      pending: filterWasteRows(searched, DEFAULT_WASTE_FILTERS, 'pending', '').length,
    } satisfies Partial<Record<WasteQuickFilter, number>>;
  }, [rows, debouncedSearch]);

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

  const uploadImage = async (file: File | null): Promise<string> => {
    if (!file) return '';
    try {
      const path = `waste/${branchId || 'shared'}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const { error } = await supabase.storage.from('waste-images').upload(path, file);
      if (error) return '';
      const { data } = supabase.storage.from('waste-images').getPublicUrl(path);
      return data.publicUrl || '';
    } catch {
      return '';
    }
  };

  const persistWaste = async (payload: {
    id?: string;
    productId: string;
    quantity: number;
    reason: string;
    notes: string;
    status: WasteStatus;
    approvedBy: string;
    unitCost: number;
    totalLoss: number;
    imageUrl: string;
    previousQuantity?: number;
  }) => {
    const reasonEncoded = encodeReason(payload.reason, {
      notes: payload.notes,
      status: payload.status,
      approvedBy: payload.approvedBy,
      unitCost: payload.unitCost,
      totalLoss: payload.totalLoss,
      imageUrl: payload.imageUrl,
    });

    const baseRow: Record<string, unknown> = {
      franchise_id: branchId,
      product_id: payload.productId,
      quantity: payload.quantity,
      reason: extendedSchema ? payload.reason : reasonEncoded,
      logged_by: user?.name || user?.email || 'Staff',
      date: toDateStr(new Date()),
    };

    if (extendedSchema) {
      baseRow.notes = payload.notes;
      baseRow.status = payload.status;
      baseRow.approved_by = payload.approvedBy || null;
      baseRow.unit_cost = payload.unitCost;
      baseRow.total_loss = payload.totalLoss;
      baseRow.image_url = payload.imageUrl || null;
    }

    if (payload.id) {
      const { error } = await supabase.from('waste_logs').update(baseRow).eq('id', payload.id);
      if (error) {
        // Retry with encoded reason only
        const { error: e2 } = await supabase
          .from('waste_logs')
          .update({
            product_id: payload.productId,
            quantity: payload.quantity,
            reason: reasonEncoded,
            logged_by: baseRow.logged_by,
            date: baseRow.date,
          })
          .eq('id', payload.id);
        if (e2) throw e2;
        setExtendedSchema(false);
      }
      const delta = (payload.previousQuantity || 0) - payload.quantity;
      if (delta !== 0) await adjustInventory(payload.productId, delta);
      return;
    }

    const { error } = await supabase.from('waste_logs').insert([baseRow]);
    if (error) {
      const { error: e2 } = await supabase.from('waste_logs').insert([
        {
          franchise_id: branchId,
          product_id: payload.productId,
          quantity: payload.quantity,
          reason: reasonEncoded,
          logged_by: baseRow.logged_by,
          date: baseRow.date,
        },
      ]);
      if (e2) throw e2;
      setExtendedSchema(false);
    }
    await adjustInventory(payload.productId, -payload.quantity);
  };

  const handleSubmit = async () => {
    if (!canLog) {
      setMessage({ type: 'error', text: 'You do not have permission to log waste.' });
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
    const qty = parseFloat(form.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setMessage({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }
    if (!selectedProduct) return;
    if (qty > selectedProduct.currentStock) {
      setMessage({ type: 'error', text: 'Waste quantity cannot exceed available stock.' });
      return;
    }

    setSubmitting(true);
    try {
      const imageUrl = form.imagePreview?.startsWith('http')
        ? form.imagePreview
        : await uploadImage(form.imageFile);
      const unitCost = selectedProduct.purchasePrice;
      const totalLoss = qty * unitCost;
      const status: WasteStatus = canApprove ? 'approved' : 'pending';

      const editing = editingId ? rows.find((r) => r.id === editingId) : null;
      await persistWaste({
        id: editingId || undefined,
        productId: form.productId,
        quantity: qty,
        reason: form.reason,
        notes: form.notes,
        status: editing ? editing.status : status,
        approvedBy: editing?.approvedBy || (status === 'approved' ? user?.name || '' : ''),
        unitCost,
        totalLoss,
        imageUrl: imageUrl || editing?.imageUrl || '',
        previousQuantity: editing?.quantity,
      });

      setForm(EMPTY_FORM);
      setEditingId(null);
      setMessage({
        type: 'success',
        text: `Waste saved. Inventory reduced by ${qty} ${selectedProduct.unit}. Loss ${formatCurrency(totalLoss)}.`,
      });
      await loadData();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err?.message || 'Failed to save waste entry.' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (row: WasteLogRow, status: WasteStatus) => {
    if (!canApprove) return;
    try {
      const reasonEncoded = encodeReason(row.reason, {
        notes: row.notes,
        status,
        approvedBy: user?.name || '',
        unitCost: row.unitCost,
        totalLoss: row.totalLoss,
        imageUrl: row.imageUrl,
      });

      if (extendedSchema) {
        const { error } = await supabase
          .from('waste_logs')
          .update({
            status,
            approved_by: user?.name || '',
            reason: row.reason,
            notes: row.notes,
            unit_cost: row.unitCost,
            total_loss: row.totalLoss,
            image_url: row.imageUrl || null,
          })
          .eq('id', row.id);
        if (error) {
          await supabase.from('waste_logs').update({ reason: reasonEncoded }).eq('id', row.id);
          setExtendedSchema(false);
        }
      } else {
        await supabase.from('waste_logs').update({ reason: reasonEncoded }).eq('id', row.id);
      }

      if (status === 'rejected') {
        await adjustInventory(row.productId, row.quantity);
      }

      setMessage({
        type: 'success',
        text: status === 'approved' ? 'Waste entry approved.' : 'Waste entry rejected. Stock restored.',
      });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Could not update status.' });
    }
  };

  const handleDelete = async (row: WasteLogRow) => {
    if (!canDelete) return;
    if (!window.confirm(`Delete waste entry for ${row.productName}? Stock will be restored.`)) return;
    try {
      const { error } = await supabase.from('waste_logs').delete().eq('id', row.id);
      if (error) throw error;
      if (row.status !== 'rejected') {
        await adjustInventory(row.productId, row.quantity);
      }
      setMessage({ type: 'success', text: 'Waste entry deleted.' });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Could not delete entry.' });
    }
  };

  const handleEdit = (row: WasteLogRow) => {
    if (!canEditWaste(user, row)) {
      setMessage({ type: 'error', text: 'You cannot edit this entry.' });
      return;
    }
    setEditingId(row.id);
    setForm({
      productId: row.productId,
      quantity: String(row.quantity),
      reason: (row.reason as WasteReason) || '',
      notes: row.notes,
      imageFile: null,
      imagePreview: row.imageUrl || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exportCsv = () => {
    const header = [
      'Date',
      'Time',
      'Product',
      'Category',
      'Quantity',
      'Unit',
      'Cost',
      'Total Loss',
      'Reason',
      'Status',
      'Logged By',
      'Approved By',
      'Notes',
    ];
    const lines = filtered.map((r) =>
      [
        r.date,
        r.createdAt || '',
        r.productName,
        r.category,
        r.quantity,
        r.unit,
        r.unitCost,
        r.totalLoss,
        r.reason,
        r.status,
        r.loggedBy,
        r.approvedBy,
        r.notes,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waste-log-${toDateStr(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canSubmit =
    Boolean(form.productId && form.reason && form.quantity && branchId && canLog) &&
    !(selectedProduct && parseFloat(form.quantity) > selectedProduct.currentStock);

  return (
    <div className="relative mx-auto w-full max-w-[1600px] space-y-5 pb-10 text-base sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Waste Log</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Track spoilage, damage, and expired stock — then recover loss insights for the kitchen.
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
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY_FORM);
            document.getElementById('waste-form')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Plus className="h-4 w-4" />
          Log Waste
        </Button>
      </div>

      {message ? (
        <div
          className={cn(
            'rounded-xl px-4 py-3 text-sm font-medium',
            message.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border border-red-200 bg-red-50 text-red-900'
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
          label="Waste Value"
          value={formatCurrency(kpis.wasteValue)}
          subtitle="Filtered period loss"
          icon={IndianRupee}
          tone="orange"
        />
        <InventoryCard
          label="Entries Today"
          value={String(kpis.entriesToday)}
          subtitle="Logged today"
          icon={ClipboardList}
          tone="blue"
        />
        <InventoryCard
          label="Highest Waste Product"
          value={kpis.highestWasteProduct}
          subtitle={kpis.highestWasteQty > 0 ? `${kpis.highestWasteQty} units` : 'No entries yet'}
          icon={Trophy}
          tone="amber"
        />
        <InventoryCard
          label="Waste Percentage"
          value={kpis.wastePercentage == null ? '—' : `${kpis.wastePercentage}%`}
          subtitle="Of stock value"
          icon={Percent}
          tone="red"
          empty={kpis.wastePercentage == null}
          emptyMessage="Need stock value"
          emptyHint="Update inventory costs to unlock %"
        />
        <InventoryCard
          label="Pending Approvals"
          value={String(kpis.pendingApprovals)}
          subtitle={canApprove ? 'Needs manager review' : 'Awaiting approval'}
          icon={Hourglass}
          tone="slate"
          onClick={canApprove ? () => setQuick('pending') : undefined}
        />
      </div>

      <WasteToolbar
        filters={filters}
        categories={categories}
        suppliers={suppliers}
        employees={employees}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        onChange={(next) => startTransition(() => setFilters((f) => ({ ...f, ...next })))}
        onReset={() => {
          setFilters(DEFAULT_WASTE_FILTERS);
          setQuick('all');
        }}
        onExport={exportCsv}
      />

      <WasteQuickChips
        active={quick}
        counts={chipCounts}
        onChange={(next) => startTransition(() => setQuick(next))}
      />

      <div id="waste-form">
        <WasteForm
          form={form}
          products={products}
          selected={selectedProduct}
          submitting={submitting}
          canSubmit={canSubmit}
          onChange={(next) => setForm((f) => ({ ...f, ...next }))}
          onSubmit={handleSubmit}
          onClearImage={() => setForm((f) => ({ ...f, imageFile: null, imagePreview: '' }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InventoryChart
          title="Waste Trend"
          subtitle="Last 30 days · monetary loss"
          data={trend}
          color="#FF6A00"
          valueFormatter={(v) => formatCurrency(v)}
          emptyTitle="No trend yet"
          emptyMessage="Log waste entries to see the 30-day trend."
        />
        <InventoryChart
          title="Waste by Category"
          subtitle="Loss by product category"
          data={byCategory}
          color="#0D1B2A"
          valueFormatter={(v) => formatCurrency(v)}
          emptyTitle="No category data"
          emptyMessage="Waste by category appears after you log entries."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Waste History</h2>
            <p className="text-sm text-slate-500">{filtered.length} entries</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm ring-1 ring-slate-100">
            Loading waste logs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-100">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-lg font-bold text-slate-800">No waste entries yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Log spoilage or damage to keep inventory accurate and track loss.
            </p>
            <Button
              type="button"
              className="mt-4 rounded-xl bg-[#FF6A00] hover:bg-[#e85f00]"
              onClick={() => document.getElementById('waste-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Plus className="h-4 w-4" />
              Log first waste entry
            </Button>
          </div>
        ) : (
          <WasteTable
            rows={filtered}
            canApprove={canApprove}
            canDelete={canDelete}
            onView={setViewRow}
            onEdit={handleEdit}
            onApprove={(row) => void updateStatus(row, 'approved')}
            onReject={(row) => void updateStatus(row, 'rejected')}
            onDelete={(row) => void handleDelete(row)}
          />
        )}
      </div>

      {viewRow ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
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
                <dt className="text-slate-500">Quantity</dt>
                <dd className="font-semibold">
                  {viewRow.quantity} {viewRow.unit}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Total loss</dt>
                <dd className="font-semibold text-[#FF6A00]">{formatCurrency(viewRow.totalLoss)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Logged by</dt>
                <dd className="font-semibold">{viewRow.loggedBy || '—'}</dd>
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
              {viewRow.imageUrl ? (
                <img src={viewRow.imageUrl} alt="Waste evidence" className="mt-2 max-h-56 w-full rounded-xl object-cover" />
              ) : null}
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WasteEntry;
