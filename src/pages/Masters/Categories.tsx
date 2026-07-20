import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { Clock3, EyeOff, FolderOpen, FolderTree, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryCard } from '@/modules/inventory/components/InventoryCard';
import { BRAND, HQ_COMPANY_ID } from '@/constants';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useFeedback } from '@/hooks/useFeedback';
import { CategoryToolbar } from '@/modules/menu/components/CategoryToolbar';
import { CategoryTable } from '@/modules/menu/components/CategoryTable';
import type { CategoryRowAction } from '@/modules/menu/components/CategoryActionMenu';
import { fetchCatalogCategories, formatShortDate } from '@/modules/menu/lib/fetchCatalog';
import { loadCategoryFilters, saveCategoryFilters } from '@/modules/menu/lib/prefs';
import {
  DEFAULT_CATEGORY_FILTERS,
  type CatalogCategory,
  type CategoryFilters,
} from '@/modules/menu/types';

function exportCsv(rows: CatalogCategory[]) {
  const header = ['Name', 'Description', 'Products', 'Status', 'Created', 'Updated'];
  const lines = rows.map((r) =>
    [
      r.name,
      r.description,
      r.productCount,
      r.isHidden ? 'Hidden' : r.isActive ? 'Active' : 'Inactive',
      r.createdAt || '',
      r.updatedAt || '',
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `categories-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const Categories: React.FC = () => {
  const { user } = useAuthStore();
  const { showFeedback, FeedbackComponent } = useFeedback();
  const companyId = getScopedCompanyId(user);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CategoryFilters>(() => loadCategoryFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      setCategories(await fetchCatalogCategories(companyId));
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
    saveCategoryFilters(filters);
  }, [filters]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let list = categories.filter((c) => {
      if (q && !`${c.name} ${c.description}`.toLowerCase().includes(q)) return false;
      if (filters.status === 'active' && (!c.isActive || c.isHidden)) return false;
      if (filters.status === 'inactive' && c.isActive) return false;
      if (filters.status === 'hidden' && !c.isHidden) return false;
      if (filters.productCount === 'empty' && c.productCount > 0) return false;
      if (filters.productCount === 'has_products' && c.productCount === 0) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (filters.sort) {
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'products_desc':
          return b.productCount - a.productCount;
        case 'updated_desc':
          return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [categories, filters]);

  const kpis = useMemo(() => {
    const products = categories.reduce((sum, c) => sum + c.productCount, 0);
    const hidden = categories.filter((c) => c.isHidden).length;
    const recent = [...categories]
      .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0];
    return {
      total: categories.length,
      products,
      hidden,
      recentLabel: recent ? formatShortDate(recent.updatedAt || recent.createdAt) : '—',
    };
  }, [categories]);

  const handleOpen = (category?: CatalogCategory) => {
    if (category) setFormData({ ...category.raw });
    else setFormData({ company_id: companyId || HQ_COMPANY_ID, name: '', description: '' });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...formData };
      if (payload.id) {
        const { error } = await supabase.from('categories').update(payload).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert([payload]);
        if (error) throw error;
      }
      handleClose();
      await fetchAll();
    } catch (error) {
      console.error(error);
      showFeedback('Error saving category.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this category? Products will become uncategorized.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await fetchAll();
    }
  };

  const applyHiddenNamePrefix = async (id: string, hide: boolean) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const rawName = String(cat.raw?.name || cat.name);
    if (hide) {
      if (!rawName.startsWith('[Hidden] ')) {
        await supabase.from('categories').update({ name: `[Hidden] ${cat.name}` }).eq('id', id);
      }
      return;
    }
    if (rawName.startsWith('[Hidden] ')) {
      await supabase.from('categories').update({ name: rawName.slice('[Hidden] '.length) }).eq('id', id);
    }
  };

  const softUpdate = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from('categories').update(patch).eq('id', id);
    if (error) {
      // Columns like is_hidden may not exist — fall back to name prefix for hide/unhide
      if ('is_hidden' in patch) {
        await applyHiddenNamePrefix(id, Boolean(patch.is_hidden));
      } else {
        showFeedback(error.message, 'error');
      }
    } else if ('is_hidden' in patch) {
      // Keep name prefix in sync when is_hidden is supported (or silently ignored)
      await applyHiddenNamePrefix(id, Boolean(patch.is_hidden));
    }
    await fetchAll();
  };

  const handleAction = async (action: CategoryRowAction, category: CatalogCategory) => {
    if (action === 'edit') handleOpen(category);
    if (action === 'delete') await handleDelete(category.id);
    if (action === 'hide') await softUpdate(category.id, { is_hidden: true });
    if (action === 'unhide') await softUpdate(category.id, { is_hidden: false });
    if (action === 'archive') await softUpdate(category.id, { is_active: false, is_archived: true });
    if (action === 'duplicate') {
      const { error } = await supabase.from('categories').insert([
        {
          name: `${category.name} (Copy)`,
          description: category.description || null,
          company_id: category.companyId || companyId || HQ_COMPANY_ID,
        },
      ]);
      if (error) showFeedback(error.message, 'error');
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
    if (!window.confirm(`Delete ${selectedIds.size} categories?`)) return;
    await Promise.all([...selectedIds].map((id) => supabase.from('categories').delete().eq('id', id)));
    setSelectedIds(new Set());
    await fetchAll();
  };

  const bulkHide = async () => {
    await Promise.all([...selectedIds].map((id) => softUpdate(id, { is_hidden: true })));
    setSelectedIds(new Set());
  };

  const bulkMoveProducts = async () => {
    if (!moveTargetId) return;
    const sourceIds = [...selectedIds];
    for (const sourceId of sourceIds) {
      await supabase.from('products').update({ category_id: moveTargetId }).eq('category_id', sourceId);
    }
    setMoveOpen(false);
    setMoveTargetId('');
    setSelectedIds(new Set());
    await fetchAll();
    showFeedback('Products moved to the selected category.', 'success');
  };

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 pb-24 sm:pb-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Product Categories</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize menu items for POS, Kitchen and QR Menu.
          </p>
        </div>
        <Button
          className="h-11 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e85f00]"
          onClick={() => handleOpen()}
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InventoryCard label="Categories" value={String(kpis.total)} subtitle="Total folders" icon={FolderTree} tone="slate" className="min-h-[120px] sm:min-h-[120px]" onClick={() => setFilters((f) => ({ ...f, status: 'all' }))} />
        <InventoryCard label="Products" value={String(kpis.products)} subtitle="Assigned items" icon={Package} tone="blue" className="min-h-[120px] sm:min-h-[120px]" />
        <InventoryCard label="Hidden" value={String(kpis.hidden)} subtitle="Not on menus" icon={EyeOff} tone="amber" className="min-h-[120px] sm:min-h-[120px]" onClick={() => setFilters((f) => ({ ...f, status: 'hidden' }))} />
        <InventoryCard label="Recently Updated" value={kpis.recentLabel} subtitle="Last change" icon={Clock3} tone="emerald" className="min-h-[120px] sm:min-h-[120px]" />
      </div>

      <CategoryToolbar
        filters={filters}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        onChange={(next) => setFilters((f) => ({ ...f, ...next }))}
        onReset={() => setFilters(DEFAULT_CATEGORY_FILTERS)}
        onExport={() => exportCsv(filtered)}
      />

      {selectedIds.size > 0 ? (
        <div className="sticky top-[4.5rem] z-30 flex flex-wrap items-center gap-2 rounded-xl bg-[#0D1B2A] px-3 py-2.5 text-white shadow-md">
          <span className="text-sm font-bold">
            <span style={{ color: BRAND.orange }}>{selectedIds.size}</span> selected
          </span>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => void bulkHide()}>
            Bulk Hide
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => setMoveOpen(true)}>
            Move Products
          </Button>
          <Button type="button" variant="outline" className="h-9 rounded-xl border-rose-300/40 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30" onClick={() => void bulkDelete()}>
            Bulk Delete
          </Button>
          <button type="button" className="ml-auto text-xs font-semibold text-white/70 hover:text-white" onClick={() => setSelectedIds(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-100">
          <FolderOpen className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-lg font-black text-slate-900">No Categories Yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Create your first category to organize the menu.</p>
          <Button className="mt-4 h-11 rounded-xl bg-[#FF6A00] font-bold text-white hover:bg-[#e85f00]" onClick={() => handleOpen()}>
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      ) : (
        <CategoryTable
          rows={filtered}
          selectedIds={selectedIds}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onRowClick={(c) => handleOpen(c)}
          onAction={handleAction}
        />
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{formData.id ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Category Name"
              value={String(formData.name || '')}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Description (optional)"
              multiline
              minRows={2}
              value={String(formData.description || '')}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="button" className="bg-[#FF6A00] text-white hover:bg-[#e85f00]" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Move Products</DialogTitle>
        <DialogContent dividers>
          <p className="mb-3 text-sm text-slate-500">
            Move all products from the selected categories into one target category.
          </p>
          <TextField
            select
            fullWidth
            label="Target category"
            value={moveTargetId}
            onChange={(e) => setMoveTargetId(e.target.value)}
            SelectProps={{ native: true }}
          >
            <option value="">Select…</option>
            {categories
              .filter((c) => !selectedIds.has(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>Cancel</Button>
          <Button type="button" className="bg-[#FF6A00] text-white hover:bg-[#e85f00]" disabled={!moveTargetId} onClick={() => void bulkMoveProducts()}>
            Move Products
          </Button>
        </DialogActions>
      </Dialog>

      {FeedbackComponent}
    </div>
  );
};

export default Categories;
