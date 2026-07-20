import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  FolderTree,
  Package,
  PackageX,
  Plus,
  Power,
  Tags,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { BRAND, HQ_COMPANY_ID } from '@/constants';
import { checkProductLimit } from '@/lib/planLimits';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { formatCurrency } from '@/utils/format';
import { ProductToolbar } from '@/modules/menu/components/ProductToolbar';
import { ProductTable } from '@/modules/menu/components/ProductTable';
import type { ProductRowAction } from '@/modules/menu/components/ProductActionMenu';
import { fetchCatalogProducts } from '@/modules/menu/lib/fetchCatalog';
import {
  loadPageSize,
  loadProductFilters,
  saveGroupBy,
  savePageSize,
  saveProductFilters,
} from '@/modules/menu/lib/prefs';
import {
  DEFAULT_PRODUCT_FILTERS,
  type CatalogProduct,
  type ProductFilters,
} from '@/modules/menu/types';

type CategoryOption = { id: string; name: string };

function exportCsv(rows: CatalogProduct[]) {
  const header = [
    'Name',
    'SKU',
    'Category',
    'Brand',
    'Unit',
    'Purchase',
    'Selling',
    'Stock',
    'Status',
    'Updated',
  ];
  const lines = rows.map((r) =>
    [
      r.name,
      r.code,
      r.categoryName,
      r.brand,
      r.unit,
      r.purchasePrice,
      r.sellingPrice,
      r.stockQty ?? '',
      r.isActive ? 'Active' : 'Inactive',
      r.updatedAt || '',
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const Products: React.FC = () => {
  const { user } = useAuthStore();
  const planId = useTenantStore((s) => s.planId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>(() => loadProductFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(() => loadPageSize());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({ is_active: true });
  const [viewOnly, setViewOnly] = useState(false);

  const companyId = getScopedCompanyId(user);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        fetchCatalogProducts(companyId),
        (async () => {
          let q = supabase.from('categories').select('id, name').order('name');
          if (companyId) q = q.eq('company_id', companyId);
          const { data } = await q;
          return (data || []) as CategoryOption[];
        })(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, [user?.companyId, companyId]);

  useEffect(() => {
    saveProductFilters(filters);
    saveGroupBy(filters.groupBy);
  }, [filters]);

  useEffect(() => {
    savePageSize(pageSize);
  }, [pageSize]);

  useEffect(() => {
    const productId = searchParams.get('productId');
    const shouldEdit = searchParams.get('edit') === '1';
    if (!productId || !shouldEdit || products.length === 0) return;
    const match = products.find((p) => p.id === productId);
    if (match) {
      openForm(match);
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
  }, [products, searchParams, setSearchParams]);

  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand).filter((b) => b && b !== '—'))].sort(),
    [products]
  );
  const suppliers = useMemo(
    () => [...new Set(products.map((p) => p.supplier).filter((s) => s && s !== '—'))].sort(),
    [products]
  );
  const units = useMemo(
    () => [...new Set(products.map((p) => p.unit).filter(Boolean))].sort(),
    [products]
  );
  const types = useMemo(
    () => [...new Set(products.map((p) => p.itemType).filter(Boolean))].sort(),
    [products]
  );
  const categoryNames = useMemo(
    () => [...new Set(products.map((p) => p.categoryName))].sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let list = products.filter((p) => {
      if (q) {
        const hay = `${p.name} ${p.code} ${p.brand} ${p.categoryName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.category !== 'all' && p.categoryName !== filters.category) return false;
      if (filters.brand !== 'all' && p.brand !== filters.brand) return false;
      if (filters.supplier !== 'all' && p.supplier !== filters.supplier) return false;
      if (filters.unit !== 'all' && p.unit !== filters.unit) return false;
      if (filters.type !== 'all' && p.itemType !== filters.type) return false;
      if (filters.status === 'active' && !p.isActive) return false;
      if (filters.status === 'inactive' && p.isActive) return false;
      if (filters.status === 'out_of_stock' && !(p.stockQty !== null && p.stockQty <= 0)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (filters.sort) {
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'updated_desc':
          return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
        case 'price_asc':
          return a.sellingPrice - b.sellingPrice;
        case 'price_desc':
          return b.sellingPrice - a.sellingPrice;
        case 'stock_asc':
          return (a.stockQty ?? 999999) - (b.stockQty ?? 999999);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [products, filters]);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const kpis = useMemo(() => {
    const active = products.filter((p) => p.isActive).length;
    const inactive = products.length - active;
    const out = products.filter((p) => p.stockQty !== null && p.stockQty <= 0).length;
    const cats = new Set(products.map((p) => p.categoryId).filter(Boolean)).size;
    return { total: products.length, cats, active, inactive, out };
  }, [products]);

  const openForm = (product?: CatalogProduct, readOnly = false) => {
    if (!product) {
      const gate = checkProductLimit(planId, products.length);
      if (!gate.ok) {
        window.alert(gate.message);
        return;
      }
      setFormData({
        code: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
        is_active: true,
        company_id: companyId || HQ_COMPANY_ID,
        purchase_price: 0,
        selling_price: 0,
        unit: 'Unit',
        item_type: 'raw_material',
      });
    } else {
      setFormData({
        ...product.raw,
        item_type: product.itemType,
      });
    }
    setViewOnly(readOnly);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({});
    setViewOnly(false);
  };

  const handleSave = async () => {
    if (viewOnly) {
      handleClose();
      return;
    }
    setSaving(true);
    try {
      const dataToSave = { ...formData };
      delete dataToSave.categories;
      delete dataToSave.categoryName;
      if (dataToSave.id) {
        const { error } = await supabase.from('products').update(dataToSave).eq('id', dataToSave.id);
        if (error) throw error;
      } else {
        const gate = checkProductLimit(planId, products.length);
        if (!gate.ok) throw new Error(gate.message);
        const { error } = await supabase.from('products').insert([dataToSave]);
        if (error) throw error;
      }
      handleClose();
      await fetchAll();
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : 'Error saving product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await fetchAll();
    }
  };

  const handleAction = async (action: ProductRowAction, product: CatalogProduct) => {
    if (action === 'view') openForm(product, true);
    if (action === 'edit') openForm(product);
    if (action === 'delete') await handleDelete(product.id);
    if (action === 'archive') {
      await supabase.from('products').update({ is_active: false }).eq('id', product.id);
      await fetchAll();
    }
    if (action === 'duplicate') {
      const gate = checkProductLimit(planId, products.length);
      if (!gate.ok) {
        window.alert(gate.message);
        return;
      }
      const copy = {
        ...product.raw,
        id: undefined,
        code: `${product.code}-COPY`,
        name: `${product.name} (Copy)`,
        company_id: product.companyId || companyId || HQ_COMPANY_ID,
      };
      delete (copy as { categories?: unknown }).categories;
      const { error } = await supabase.from('products').insert([copy]);
      if (error) window.alert(error.message);
      else await fetchAll();
    }
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} products?`)) return;
    await Promise.all([...selectedIds].map((id) => supabase.from('products').delete().eq('id', id)));
    setSelectedIds(new Set());
    await fetchAll();
  };

  const bulkArchive = async () => {
    if (selectedIds.size === 0) return;
    await Promise.all(
      [...selectedIds].map((id) => supabase.from('products').update({ is_active: false }).eq('id', id))
    );
    setSelectedIds(new Set());
    await fetchAll();
  };

  const bulkMoveCategory = async () => {
    if (selectedIds.size === 0 || categories.length === 0) return;
    const target = window.prompt(
      `Move ${selectedIds.size} products to category.\nEnter category name:\n${categories.map((c) => c.name).join(', ')}`
    );
    if (!target) return;
    const cat = categories.find((c) => c.name.toLowerCase() === target.trim().toLowerCase());
    if (!cat) {
      window.alert('Category not found.');
      return;
    }
    await Promise.all(
      [...selectedIds].map((id) => supabase.from('products').update({ category_id: cat.id }).eq('id', id))
    );
    setSelectedIds(new Set());
    await fetchAll();
  };

  const selectedRows = products.filter((p) => selectedIds.has(p.id));

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 pb-24 sm:pb-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Products Catalog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage menu products, raw materials and inventory items.
          </p>
        </div>
        <Button
          className="h-11 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e85f00]"
          onClick={() => openForm()}
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <InventoryCard label="Products" value={String(kpis.total)} subtitle="In catalog" icon={Package} tone="slate" className="min-h-[120px] sm:min-h-[120px]" />
        <InventoryCard label="Categories" value={String(kpis.cats)} subtitle="Linked" icon={FolderTree} tone="blue" className="min-h-[120px] sm:min-h-[120px]" />
        <InventoryCard label="Active" value={String(kpis.active)} subtitle="Sellable" icon={Power} tone="emerald" className="min-h-[120px] sm:min-h-[120px]" />
        <InventoryCard label="Inactive" value={String(kpis.inactive)} subtitle="Hidden from POS" icon={Tags} tone="amber" className="min-h-[120px] sm:min-h-[120px]" />
        <InventoryCard label="Out of Stock" value={String(kpis.out)} subtitle="Need replenishment" icon={PackageX} tone="red" className="min-h-[120px] sm:min-h-[120px]" />
      </div>

      <ProductToolbar
        filters={filters}
        categories={categoryNames}
        brands={brands}
        suppliers={suppliers}
        units={units}
        types={types}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        onChange={(next) => setFilters((f) => ({ ...f, ...next }))}
        onReset={() => setFilters(DEFAULT_PRODUCT_FILTERS)}
        onExport={() => exportCsv(filtered)}
      />

      {selectedIds.size > 0 ? (
        <div className="sticky top-[4.5rem] z-30 flex flex-wrap items-center gap-2 rounded-xl bg-[#0D1B2A] px-3 py-2.5 text-white shadow-md">
          <span className="text-sm font-bold">
            <span style={{ color: BRAND.orange }}>{selectedIds.size}</span> selected
          </span>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => openForm(selectedRows[0])}>
            Bulk Edit
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => void bulkMoveCategory()}>
            Move Category
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => exportCsv(selectedRows)}>
            Export
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => void bulkArchive()}>
            Archive
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-rose-300/40 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30" onClick={() => void bulkDelete()}>
            Delete
          </Button>
          <button type="button" className="ml-auto text-xs font-semibold text-white/70 hover:text-white" onClick={() => setSelectedIds(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-100">
          <Package className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-lg font-black text-slate-900">No Products Yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Create your first product for POS, kitchen and inventory.</p>
          <Button className="mt-4 h-11 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e85f00]" onClick={() => openForm()}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      ) : (
        <>
          <ProductTable
            rows={pageRows}
            selectedIds={selectedIds}
            groupBy={filters.groupBy}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onRowClick={(p) => openForm(p)}
            onAction={handleAction}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">
                Rows
                <select
                  className="ml-2 h-9 rounded-xl border-0 bg-slate-100 px-2 text-sm font-semibold text-slate-700"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value) as 25 | 50 | 100)}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <span className="text-xs font-bold tabular-nums text-slate-600">
                {page} / {pageCount}
              </span>
              <Button type="button" variant="outline" className="h-9 rounded-xl" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{viewOnly ? 'View Product' : formData.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pt: 1 }}>
            <TextField fullWidth label="SKU / Code" value={String(formData.code || '')} disabled={viewOnly} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
            <TextField fullWidth label="Product Name" value={String(formData.name || '')} disabled={viewOnly} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <TextField select fullWidth label="Category" value={String(formData.category_id || '')} disabled={viewOnly} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}>
              <MenuItem value=""><em>None</em></MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth label="Brand" value={String(formData.brand || '')} disabled={viewOnly} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
            <TextField fullWidth label="Unit" value={String(formData.unit || '')} disabled={viewOnly} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
            <TextField fullWidth type="number" label="Purchase Price" value={formData.purchase_price ?? ''} disabled={viewOnly} onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })} />
            <TextField fullWidth type="number" label="Selling Price" value={formData.selling_price ?? ''} disabled={viewOnly} onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })} />
            <TextField select fullWidth label="Type" value={String(formData.item_type || (Number(formData.selling_price) > 0 ? 'ready_product' : 'raw_material'))} disabled={viewOnly} onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}>
              <MenuItem value="raw_material">Raw material</MenuItem>
              <MenuItem value="ready_product">Ready product</MenuItem>
            </TextField>
            <TextField select fullWidth label="Status" value={formData.is_active === false ? '0' : '1'} disabled={viewOnly} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === '1' })}>
              <MenuItem value="1">Active</MenuItem>
              <MenuItem value="0">Inactive</MenuItem>
            </TextField>
          </Box>
          {viewOnly && formData.selling_price != null ? (
            <p className="mt-3 text-sm text-slate-500">Selling {formatCurrency(Number(formData.selling_price) || 0)}</p>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          {!viewOnly ? (
            <Button type="button" className="bg-[#FF6A00] text-white hover:bg-[#e85f00]" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Product'}
            </Button>
          ) : (
            <Button type="button" className="bg-[#FF6A00] text-white hover:bg-[#e85f00]" onClick={() => setViewOnly(false)}>
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Products;
