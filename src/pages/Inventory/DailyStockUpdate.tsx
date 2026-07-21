import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ClipboardList, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryStatus } from '@/constants';
import { PERMISSIONS } from '@/constants/permissions';
import { canSwitchBranchesByRole } from '@/lib/access';
import { useFeedback } from '@/hooks/useFeedback';
import { useHasPermission } from '@/hooks/useHasPermission';
import { supabase } from '@/lib/supabase';
import { getScopedCompanyId } from '@/lib/tenantScope';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStore } from '@/store/useTenantStore';
import { DailyStockBulkBar } from '@/modules/inventory/daily/DailyStockBulkBar';
import { DailyStockCards } from '@/modules/inventory/daily/DailyStockCards';
import { DailyStockCategoryNav } from '@/modules/inventory/daily/DailyStockCategoryNav';
import { DailyStockProgressCard } from '@/modules/inventory/daily/DailyStockProgressCard';
import { DailyStockQuickChips } from '@/modules/inventory/daily/DailyStockQuickChips';
import { DailyStockStickyBar } from '@/modules/inventory/daily/DailyStockStickyBar';
import { DailyStockTable } from '@/modules/inventory/daily/DailyStockTable';
import { DailyStockToolbar } from '@/modules/inventory/daily/DailyStockToolbar';
import {
  applyDraftToRows,
  calcClosing,
  clearDraft,
  DEFAULT_DAILY_FILTERS,
  DRAFT_SAVE_MS,
  filterDailyRows,
  getLocalDateStr,
  groupByCategory,
  isOutOfStock,
  isProductUpdated,
  isLowStock,
  loadDraft,
  matchesQuickFilter,
  normalizeItemType,
  saveDraft,
  SEARCH_DEBOUNCE_MS,
  uniqueSorted,
  withFieldChange,
} from '@/modules/inventory/daily/lib';
import type {
  AutoSaveStatus,
  DailyQuickFilter,
  DailyStockFilters,
  DailyStockRow,
  EditableField,
} from '@/modules/inventory/daily/types';

function formatActionError(error: unknown, fallback: string) {
  const msg =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : '';
  const lower = msg.toLowerCase();
  if (!msg) return fallback;
  if (lower.includes('relation') || lower.includes('does not exist') || lower.includes('schema cache')) {
    return `${fallback} A required database table may be missing. Run scripts/phase1_production_schema.sql in Supabase.`;
  }
  if (lower.includes('permission') || lower.includes('rls') || lower.includes('policy')) {
    return `${fallback} You may not have permission for this outlet.`;
  }
  return `${fallback} ${msg}`;
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function useIsCompactTablet() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return compact;
}

function useIsMobileCards() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return mobile;
}

const DailyStockUpdate: React.FC = () => {
  const { user } = useAuthStore();
  const canSwitchByPermission = useHasPermission(PERMISSIONS.BRANCH_SWITCH);
  const canSelectOutlet = canSwitchBranchesByRole(user) || canSwitchByPermission;
  const activeOutletId = useTenantStore((s) => s.activeOutletId);
  const tenantOutlets = useTenantStore((s) => s.outlets);
  const setActiveOutletId = useTenantStore((s) => s.setActiveOutletId);
  const [searchParams] = useSearchParams();
  const { showFeedback, FeedbackComponent } = useFeedback();
  const compact = useIsCompactTablet();
  const mobileCards = useIsMobileCards();

  const [rows, setRows] = useState<DailyStockRow[]>([]);
  const [outlets, setOutlets] = useState<{ id: string; name: string; companyId?: string }[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [outletsError, setOutletsError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [lastSavedIso, setLastSavedIso] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [filters, setFilters] = useState<DailyStockFilters>(DEFAULT_DAILY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<DailyQuickFilter>('all');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkValues, setBulkValues] = useState({ purchase: '', consumption: '', waste: '' });
  const [, startTransition] = useTransition();

  const deferredSearch = useDeferredValue(filters.search);
  const debouncedSearch = useDebouncedValue(deferredSearch, SEARCH_DEBOUNCE_MS);

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowsRef = useRef(rows);
  const outletRef = useRef(selectedOutlet);
  const dirtyRef = useRef(false);
  const categoryEls = useRef(new Map<string, HTMLElement>());
  const showFeedbackRef = useRef(showFeedback);
  const userRef = useRef(user);
  const deepLinkAppliedRef = useRef(false);
  const fetchGenRef = useRef(0);

  rowsRef.current = rows;
  outletRef.current = selectedOutlet;
  dirtyRef.current = hasUnsavedChanges;
  showFeedbackRef.current = showFeedback;
  userRef.current = user;

  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    const q = searchParams.get('q');
    const productId = searchParams.get('productId');
    if (q) {
      deepLinkAppliedRef.current = true;
      setFilters((f) => (f.search === q ? f : { ...f, search: q }));
      return;
    }
    if (productId && rows.length > 0) {
      const match = rows.find((row) => row.product_id === productId);
      if (match?.productName) {
        deepLinkAppliedRef.current = true;
        setFilters((f) =>
          f.search === match.productName ? f : { ...f, search: match.productName }
        );
      }
    }
  }, [searchParams, rows]);

  useEffect(() => {
    if (searchParams.get('focus') !== 'receive' || !filters.search) return;
    const timer = window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[data-stock-field="purchase"]');
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus();
      input?.select();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchParams, filters.search]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (dirtyRef.current && outletRef.current) {
        saveDraft(outletRef.current, getLocalDateStr(), rowsRef.current);
      }
    };
  }, []);

  const scheduleDraftSave = useCallback((nextRows: DailyStockRow[], outletId: string) => {
    if (!outletId) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    setAutoSaveStatus('saving');
    draftTimerRef.current = setTimeout(() => {
      try {
        const draft = saveDraft(outletId, getLocalDateStr(), nextRows);
        setLastSavedIso(draft.savedAt);
        setAutoSaveStatus('saved');
      } catch {
        setAutoSaveStatus('failed');
      }
    }, DRAFT_SAVE_MS);
  }, []);

  const patchRows = useCallback(
    (updater: (prev: DailyStockRow[]) => DailyStockRow[]) => {
      setRows((prev) => {
        const next = updater(prev);
        scheduleDraftSave(next, outletRef.current);
        return next;
      });
      setHasUnsavedChanges(true);
      setAutoSaveStatus('unsaved');
    },
    [scheduleDraftSave]
  );

  const handleFieldChange = useCallback(
    (id: string, field: EditableField, value: number) => {
      patchRows((prev) =>
        prev.map((row) => (row.id === id ? withFieldChange(row, field, value) : row))
      );
    },
    [patchRows]
  );

  useEffect(() => {
    // Prefer header branch switcher as source of truth for outlet.
    if (activeOutletId && activeOutletId !== selectedOutlet) {
      setSelectedOutlet(activeOutletId);
      setFilters((f) => (f.outletId === activeOutletId ? f : { ...f, outletId: activeOutletId }));
    }
  }, [activeOutletId]); // eslint-disable-line react-hooks/exhaustive-deps -- sync from header only

  useEffect(() => {
    let cancelled = false;

    const applyOutlets = (
      list: { id: string; name: string; companyId?: string }[],
      preferredId?: string | null
    ) => {
      if (cancelled) return;
      setOutlets(list);
      setOutletsError(null);
      if (list.length === 0) {
        setSelectedOutlet('');
        setFilters((f) => ({ ...f, outletId: '' }));
        return;
      }
      const preferred =
        (preferredId && list.some((o) => o.id === preferredId) && preferredId) ||
        (activeOutletId && list.some((o) => o.id === activeOutletId) && activeOutletId) ||
        list[0].id;
      setSelectedOutlet((prev) => (prev && list.some((o) => o.id === prev) ? prev : preferred));
      setFilters((f) => {
        const nextId = f.outletId && list.some((o) => o.id === f.outletId) ? f.outletId : preferred;
        return f.outletId === nextId ? f : { ...f, outletId: nextId };
      });
    };

    if (tenantOutlets.length > 0) {
      applyOutlets(
        tenantOutlets
          .filter((o) => o.isActive)
          .map((o) => ({ id: o.id, name: o.name, companyId: o.companyId }))
      );
      return () => {
        cancelled = true;
      };
    }

    if (canSelectOutlet) {
      void (async () => {
        try {
          const companyId = getScopedCompanyId(userRef.current);
          let query = supabase
            .from('outlets')
            .select('id, name, company_id')
            .eq('is_active', true)
            .order('name');
          if (companyId) query = query.eq('company_id', companyId);
          const { data, error } = await query;
          if (error) throw error;
          applyOutlets(
            (data || []).map((o) => ({
              id: o.id,
              name: o.name,
              companyId: o.company_id ? String(o.company_id) : undefined,
            }))
          );
          if (!data?.length) {
            const message =
              'No active outlets found for this company. Create an outlet first, then open Daily Stock again.';
            setOutletsError(message);
            showFeedbackRef.current(message, 'error');
            window.alert(message);
          }
        } catch (error) {
          console.error('Error fetching outlets:', error);
          const message = formatActionError(
            error,
            'Could not load outlets for Daily Stock.'
          );
          if (!cancelled) {
            setOutletsError(message);
            showFeedbackRef.current(message, 'error');
            window.alert(message);
          }
        }
      })();
    } else if (user?.outletId) {
      applyOutlets(
        [{ id: user.outletId, name: 'My outlet', companyId: user.companyId || undefined }],
        user.outletId
      );
    } else {
      const message =
        'No outlet is assigned to your account. Ask an admin to assign an outlet, or use an Admin account that can select one.';
      setOutletsError(message);
      showFeedbackRef.current(message, 'error');
    }

    return () => {
      cancelled = true;
    };
  }, [canSelectOutlet, user?.outletId, user?.companyId, tenantOutlets, activeOutletId]);

  useEffect(() => {
    if (!selectedOutlet) {
      setLoading(false);
      setRows([]);
      setLoadError(
        canSelectOutlet
          ? 'Select an outlet to load daily stock entries.'
          : 'No outlet selected for Daily Stock.'
      );
      return;
    }

    const gen = ++fetchGenRef.current;
    let cancelled = false;

    const load = async () => {
      if (rowsRef.current.length === 0) setLoading(true);
      setDraftRestoredAt(null);
      setLoadError(null);

      try {
        const currentUser = userRef.current;

        // Resolve company from the selected outlet so branch switch loads the right catalog
        // (Backbenchers = raw materials, CafePilots HQ = ready products).
        let companyId =
          outlets.find((o) => o.id === selectedOutlet)?.companyId ||
          useTenantStore.getState().outlets.find((o) => o.id === selectedOutlet)?.companyId ||
          '';

        if (!companyId) {
          const { data: outletRow, error: outletErr } = await supabase
            .from('outlets')
            .select('company_id')
            .eq('id', selectedOutlet)
            .maybeSingle();
          if (outletErr) throw outletErr;
          companyId = outletRow?.company_id
            ? String(outletRow.company_id)
            : getScopedCompanyId(currentUser);
        }

        let pQuery = supabase
          .from('products')
          .select('*, categories(name)')
          .eq('is_active', true)
          .order('name');
        if (companyId) pQuery = pQuery.eq('company_id', companyId);
        const { data: productsData, error: pErr } = await pQuery;
        if (pErr) throw pErr;
        if (cancelled || gen !== fetchGenRef.current) return;

        const invMap: Record<string, number> = {};
        const { data: invData, error: invErr } = await supabase
          .from('inventory')
          .select('product_id, current_quantity')
          .eq('outlet_id', selectedOutlet);
        if (invErr) throw invErr;
        if (cancelled || gen !== fetchGenRef.current) return;
        if (invData) {
          invData.forEach((item) => {
            invMap[item.product_id] = Number(item.current_quantity);
          });
        }

        const dateStr = getLocalDateStr();
        const dailyMap: Record<string, any> = {};
        const { data: dailyData, error: dailyErr } = await supabase
          .from('daily_stock')
          .select('*')
          .eq('outlet_id', selectedOutlet)
          .eq('date', dateStr);
        if (dailyErr) throw dailyErr;
        if (cancelled || gen !== fetchGenRef.current) return;
        if (dailyData) {
          dailyData.forEach((item) => {
            dailyMap[item.product_id] = item;
          });
        }

        if (!productsData) {
          setRows([]);
          setLoadError('No products returned for this outlet.');
          return;
        }

        let mappedRows: DailyStockRow[] = productsData.map((p: any) => {
          const daily = dailyMap[p.id];
          const opening = daily ? Number(daily.opening_stock) : invMap[p.id] || 0;
          const pur = daily ? Number(daily.purchase) : 0;
          const con = daily ? Number(daily.consumption) : 0;
          const was = daily ? Number(daily.waste) : 0;
          const clos = daily ? Number(daily.closing_stock) : opening;
          const itemType = normalizeItemType(p.item_type);

          return {
            id: p.id,
            product_id: p.id,
            productName: p.name,
            productCode: p.code || '',
            barcode: p.barcode || '',
            alias: p.alias || p.short_name || '',
            categoryName: p.categories?.name || 'Uncategorized',
            supplier: p.supplier_name || p.supplier || '—',
            unit: p.unit || 'Unit',
            item_type: itemType,
            minStock: Math.max(0, Number(p.min_stock) || 0),
            openingStock: opening,
            purchase: pur,
            consumption: con,
            waste: was,
            closingStock: clos,
            status: daily ? daily.status : InventoryStatus.IN_PROGRESS,
            date: dateStr,
            markedComplete: false,
            editState: 'clean' as const,
            baseline: { purchase: pur, consumption: con, waste: was },
            updatedAt: daily?.updated_at || p.updated_at || null,
          };
        });

        const draft = loadDraft(selectedOutlet, dateStr);
        if (draft && draft.entries.length > 0) {
          mappedRows = applyDraftToRows(mappedRows, draft);
          setHasUnsavedChanges(true);
          setDraftRestoredAt(new Date(draft.savedAt).toLocaleString());
          setLastSavedIso(draft.savedAt);
          setAutoSaveStatus('saved');
        } else {
          setHasUnsavedChanges(false);
          setLastSavedIso(null);
          setAutoSaveStatus('idle');
        }

        setRows(mappedRows);
        setSelectedIds(new Set());

        // Auto-correct type filter so Raw material catalogs are not hidden
        // behind a Ready product filter (and vice versa).
        const rawCount = mappedRows.filter((r) => r.item_type === 'raw_material').length;
        const readyCount = mappedRows.length - rawCount;
        setFilters((f) => {
          if (f.stockType === 'raw_material' && rawCount === 0 && readyCount > 0) {
            return { ...f, stockType: 'all' };
          }
          if (f.stockType === 'ready_product' && readyCount === 0 && rawCount > 0) {
            return { ...f, stockType: 'all' };
          }
          // Prefer Raw material when that is the entire catalog
          if (f.stockType === 'all' && rawCount > 0 && readyCount === 0) {
            return { ...f, stockType: 'raw_material' };
          }
          return f;
        });
      } catch (error) {
        if (cancelled || gen !== fetchGenRef.current) return;
        console.error('Error fetching daily data:', error);
        const message = formatActionError(
          error,
          'Could not load daily stock for the selected outlet.'
        );
        setLoadError(message);
        setRows([]);
        showFeedbackRef.current(message, 'error');
      } finally {
        if (!cancelled && gen === fetchGenRef.current) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedOutlet, canSelectOutlet]);

  const handleOutletChange = (nextOutlet: string) => {
    if (!nextOutlet || nextOutlet === selectedOutlet) return;
    if (hasUnsavedChanges) {
      const ok = window.confirm(
        'You have unsaved daily stock entries for this outlet. Switch outlet?\n\nYour draft for the current outlet stays on this device.'
      );
      if (!ok) return;
      if (selectedOutlet) {
        try {
          saveDraft(selectedOutlet, getLocalDateStr(), rowsRef.current);
        } catch {
          window.alert('Could not save the current draft before switching outlet. Try again.');
          return;
        }
      }
    }
    setRows([]);
    setLoadError(null);
    setLoading(true);
    setSelectedOutlet(nextOutlet);
    setFilters((f) => ({ ...f, outletId: nextOutlet, stockType: 'all' }));
    setActiveOutletId(nextOutlet);
    const name = outlets.find((o) => o.id === nextOutlet)?.name || 'selected outlet';
    showFeedback(`Daily Stock switched to ${name}.`, 'success');
  };

  const exportRows = (list: DailyStockRow[], filename: string) => {
    if (list.length === 0) {
      const message = 'Nothing to export for the current filters.';
      showFeedback(message, 'error');
      window.alert(message);
      return;
    }
    try {
      const excelData = list.map((r) => ({
        Category: r.categoryName,
        'Product Name': r.productName,
        SKU: r.productCode,
        Barcode: r.barcode,
        Unit: r.unit,
        'Opening Stock': r.openingStock,
        'Purchase (+)': r.purchase,
        'Consumption (-)': r.consumption,
        'Waste (-)': r.waste,
        'Closing Stock': r.closingStock,
      }));
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Stock');
      XLSX.writeFile(workbook, filename);
      showFeedback(`Exported ${list.length} rows.`, 'success');
    } catch (error) {
      const message = formatActionError(error, 'Export failed.');
      showFeedback(message, 'error');
      window.alert(message);
    }
  };

  const handleSaveDraft = () => {
    if (!selectedOutlet) {
      const message = 'Please select an outlet before saving a draft.';
      showFeedback(message, 'error');
      window.alert(message);
      return;
    }
    try {
      const draft = saveDraft(selectedOutlet, getLocalDateStr(), rows);
      setLastSavedIso(draft.savedAt);
      setHasUnsavedChanges(true);
      setAutoSaveStatus('saved');
      setRows((prev) =>
        prev.map((r) => (r.editState === 'edited' ? { ...r, editState: 'saved' as const } : r))
      );
      showFeedback('Draft saved on this device. You can continue later without losing entries.', 'success');
    } catch (error) {
      setAutoSaveStatus('failed');
      const message = formatActionError(error, 'Could not save draft locally.');
      showFeedback(message, 'error');
      window.alert(message);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOutlet) {
      const message = 'Please select an outlet before submitting daily stock.';
      showFeedback(message, 'error');
      window.alert(message);
      return;
    }

    setSubmitting(true);
    try {
      const dateStr = getLocalDateStr();
      const payloads = rows
        .filter(
          (r) =>
            r.purchase > 0 ||
            r.consumption > 0 ||
            r.waste > 0 ||
            r.closingStock > 0
        )
        .map((r) => ({
          date: dateStr,
          outlet_id: selectedOutlet,
          product_id: r.product_id,
          opening_stock: r.openingStock,
          purchase: r.purchase,
          consumption: r.consumption,
          waste: r.waste,
          closing_stock: r.closingStock,
          status: InventoryStatus.SUBMITTED,
        }));

      if (payloads.length === 0) {
        const message = 'Please enter purchase, consumption, waste, or closing stock before submitting.';
        showFeedback(message, 'error');
        window.alert(message);
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('daily_stock')
        .upsert(payloads, { onConflict: 'date, outlet_id, product_id' });
      if (error) throw error;

      const inventoryPayloads = payloads.map((p) => ({
        outlet_id: p.outlet_id,
        product_id: p.product_id,
        current_quantity: p.closing_stock,
      }));

      const { error: invErr } = await supabase
        .from('inventory')
        .upsert(inventoryPayloads, { onConflict: 'outlet_id, product_id' });
      if (invErr) throw invErr;

      clearDraft(selectedOutlet, dateStr);
      setHasUnsavedChanges(false);
      setDraftRestoredAt(null);
      setLastSavedIso(new Date().toISOString());
      setAutoSaveStatus('saved');
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          status: payloads.some((p) => p.product_id === r.product_id)
            ? InventoryStatus.SUBMITTED
            : r.status,
          editState: 'saved' as const,
          baseline: {
            purchase: r.purchase,
            consumption: r.consumption,
            waste: r.waste,
          },
        }))
      );
      const outletName = outlets.find((o) => o.id === selectedOutlet)?.name || 'selected outlet';
      showFeedback(`Inventory submitted successfully for ${outletName}.`, 'success');
    } catch (err: unknown) {
      console.error('Error submitting inventory', err);
      if (selectedOutlet) {
        try {
          const draft = saveDraft(selectedOutlet, getLocalDateStr(), rowsRef.current);
          setLastSavedIso(draft.savedAt);
          setAutoSaveStatus('failed');
        } catch {
          /* keep previous draft state */
        }
      }
      const message = formatActionError(
        err,
        'Failed to submit inventory. Your entries were kept as a local draft.'
      );
      showFeedback(message, 'error');
      window.alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = useMemo(() => uniqueSorted(rows.map((r) => r.categoryName)), [rows]);
  const suppliers = useMemo(
    () => uniqueSorted(rows.map((r) => r.supplier).filter((s) => s && s !== '—')),
    [rows]
  );

  const filteredRows = useMemo(
    () => filterDailyRows(rows, filters, quickFilter, pendingOnly, debouncedSearch),
    [rows, filters, quickFilter, pendingOnly, debouncedSearch]
  );

  const groups = useMemo(() => groupByCategory(filteredRows), [filteredRows]);

  const updatedCount = useMemo(() => rows.filter(isProductUpdated).length, [rows]);

  const typeCounts = useMemo(() => {
    let raw_material = 0;
    let ready_product = 0;
    for (const row of rows) {
      if (normalizeItemType(row.item_type) === 'raw_material') raw_material += 1;
      else ready_product += 1;
    }
    return { raw_material, ready_product };
  }, [rows]);

  const chipCounts = useMemo(() => {
    // Keep chip counts stable against type/status filters so picking "Raw material"
    // does not zero-out every chip and look like a data failure.
    const base = filterDailyRows(
      rows,
      { ...filters, stockType: 'all', status: 'all', category: 'all', supplier: 'all', dateFrom: '' },
      'all',
      false,
      debouncedSearch
    );
    return {
      all: base.length,
      pending: base.filter((r) => !isProductUpdated(r)).length,
      updated: base.filter(isProductUpdated).length,
      has_purchase: base.filter((r) => matchesQuickFilter(r, 'has_purchase')).length,
      has_consumption: base.filter((r) => matchesQuickFilter(r, 'has_consumption')).length,
      has_waste: base.filter((r) => matchesQuickFilter(r, 'has_waste')).length,
      low_stock: base.filter(isLowStock).length,
      out_of_stock: base.filter(isOutOfStock).length,
      recently_updated: base.filter((r) => matchesQuickFilter(r, 'recently_updated')).length,
    } satisfies Partial<Record<DailyQuickFilter, number>>;
  }, [rows, filters, debouncedSearch]);

  const navCategories = useMemo(
    () =>
      groups.map((g) => ({
        name: g.name,
        total: g.total,
        updated: g.updated,
        pending: g.pending,
      })),
    [groups]
  );

  const activeFilterHint = useMemo(() => {
    const parts: string[] = [];
    if (filters.stockType === 'raw_material') {
      parts.push(
        typeCounts.raw_material === 0
          ? `No products are tagged as Raw material (${typeCounts.ready_product} are Ready product)`
          : 'Raw material filter is on'
      );
    } else if (filters.stockType === 'ready_product') {
      parts.push(
        typeCounts.ready_product === 0
          ? `No products are tagged as Ready product (${typeCounts.raw_material} are Raw material)`
          : 'Ready product filter is on'
      );
    }
    if (filters.category !== 'all') parts.push(`Category: ${filters.category}`);
    if (filters.supplier !== 'all') parts.push(`Supplier: ${filters.supplier}`);
    if (filters.status !== 'all') parts.push(`Status: ${filters.status}`);
    if (quickFilter !== 'all') parts.push(`Quick filter: ${quickFilter}`);
    if (pendingOnly) parts.push('Pending only');
    if (debouncedSearch) parts.push(`Search: “${debouncedSearch}”`);
    return parts;
  }, [filters, quickFilter, pendingOnly, debouncedSearch, typeCounts]);

  const onFiltersChange = (next: Partial<DailyStockFilters>) => {
    if (next.outletId !== undefined && next.outletId !== filters.outletId) {
      handleOutletChange(next.outletId);
    }
    startTransition(() => {
      setFilters((f) => ({ ...f, ...next }));
    });
  };

  const resetFilters = () => {
    setFilters({
      ...DEFAULT_DAILY_FILTERS,
      outletId: selectedOutlet,
    });
    setQuickFilter('all');
    setPendingOnly(false);
  };

  const scrollToCategory = (name: string) => {
    setActiveCategory(name);
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
    requestAnimationFrame(() => {
      categoryEls.current.get(name)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectCategory = (ids: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (selected) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.id)),
    [rows, selectedIds]
  );

  const markCompleted = () => {
    patchRows((prev) =>
      prev.map((r) =>
        selectedIds.has(r.id)
          ? { ...r, markedComplete: true, editState: 'edited' as const }
          : r
      )
    );
    setSelectedIds(new Set());
  };

  const clearValues = () => {
    patchRows((prev) =>
      prev.map((r) => {
        if (!selectedIds.has(r.id)) return r;
        return {
          ...r,
          purchase: 0,
          consumption: 0,
          waste: 0,
          closingStock: calcClosing(r.openingStock, 0, 0, 0),
          markedComplete: false,
          editState: 'edited' as const,
        };
      })
    );
    setSelectedIds(new Set());
  };

  const applyBulkUpdate = () => {
    const purchase = bulkValues.purchase === '' ? null : parseFloat(bulkValues.purchase) || 0;
    const consumption =
      bulkValues.consumption === '' ? null : parseFloat(bulkValues.consumption) || 0;
    const waste = bulkValues.waste === '' ? null : parseFloat(bulkValues.waste) || 0;
    patchRows((prev) =>
      prev.map((r) => {
        if (!selectedIds.has(r.id)) return r;
        const nextPurchase = purchase ?? r.purchase;
        const nextConsumption = consumption ?? r.consumption;
        const nextWaste = waste ?? r.waste;
        return {
          ...r,
          purchase: nextPurchase,
          consumption: nextConsumption,
          waste: nextWaste,
          closingStock: calcClosing(r.openingStock, nextPurchase, nextConsumption, nextWaste),
          editState: 'edited' as const,
        };
      })
    );
    setBulkOpen(false);
    setBulkValues({ purchase: '', consumption: '', waste: '' });
    setSelectedIds(new Set());
  };

  const printSelected = () => {
    const list = selectedRows.length > 0 ? selectedRows : filteredRows;
    const html = `
      <html><head><title>Daily Stock</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
        h1{font-size:18px;margin:0 0 12px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
        th{background:#f8fafc}
      </style></head><body>
      <h1>Daily Stock Update — ${getLocalDateStr()}</h1>
      <table><thead><tr>
        <th>Product</th><th>Opening</th><th>Purchase</th><th>Consumed</th><th>Waste</th><th>Closing</th>
      </tr></thead><tbody>
      ${list
        .map(
          (r) =>
            `<tr><td>${r.productName}</td><td>${r.openingStock}</td><td>${r.purchase}</td><td>${r.consumption}</td><td>${r.waste}</td><td>${r.closingStock}</td></tr>`
        )
        .join('')}
      </tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  useEffect(() => {
    if (groups.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const name = visible?.target.getAttribute('data-category');
        if (name) {
          setActiveCategory((prev) => (prev === name ? prev : name));
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.15, 0.4] }
    );
    groups.forEach((g) => {
      const el = categoryEls.current.get(g.name);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [groups]);

  return (
    <div className="relative mx-auto w-full max-w-[1600px] space-y-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] text-base sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Daily Stock Update
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {selectedOutlet
              ? ` · ${outlets.find((o) => o.id === selectedOutlet)?.name || 'Selected outlet'}`
              : ''}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {canSelectOutlet ? (
            <label className="inline-flex h-11 min-w-[220px] items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100">
              <Store className="h-4 w-4 shrink-0 text-[#FF6A00]" />
              <span className="sr-only">Select outlet</span>
              <select
                className="h-full w-full bg-transparent font-semibold text-slate-800 outline-none"
                value={selectedOutlet}
                onChange={(e) => handleOutletChange(e.target.value)}
                aria-label="Select outlet for daily stock"
              >
                <option value="">Select outlet…</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-xl bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(e) => setPendingOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
            />
            Show Pending Only
          </label>
        </div>
      </div>

      {outletsError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          {outletsError}
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {loadError}
        </div>
      ) : null}

      {!selectedOutlet && canSelectOutlet && !outletsError ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Choose an outlet above to load today&apos;s daily stock entry sheet.
        </div>
      ) : null}

      {typeCounts.raw_material === 0 && typeCounts.ready_product > 0 ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
          No raw materials on this branch yet. Use <strong>All types</strong> or{' '}
          <strong>Ready product</strong>, or refresh after catalog sync.
        </div>
      ) : null}

      {typeCounts.raw_material > 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          {typeCounts.raw_material} raw material{typeCounts.raw_material === 1 ? '' : 's'} available
          {typeCounts.ready_product > 0 ? ` · ${typeCounts.ready_product} ready products` : ''}.
        </div>
      ) : null}

      {draftRestoredAt ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Restored unsaved draft from {draftRestoredAt}. Submit when ready — changes auto-save on this
          device.
          <button
            type="button"
            className="ml-2 font-semibold underline"
            onClick={() => setDraftRestoredAt(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <DailyStockToolbar
        filters={filters}
        categories={categories}
        suppliers={suppliers}
        outlets={outlets}
        canSwitchOutlet={canSelectOutlet}
        filtersOpen={filtersOpen}
        autoSaveStatus={autoSaveStatus}
        lastSavedAt={lastSavedIso}
        typeCounts={typeCounts}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        onChange={onFiltersChange}
        onReset={resetFilters}
        onExport={() =>
          exportRows(filteredRows, `Daily_Stock_Update_${getLocalDateStr()}.xlsx`)
        }
      />

      <DailyStockQuickChips
        active={quickFilter}
        counts={chipCounts}
        onChange={(next) => startTransition(() => setQuickFilter(next))}
      />

      <DailyStockProgressCard
        updated={updatedCount}
        total={rows.length}
        lastSavedAt={lastSavedIso}
        autoSaveEnabled
      />

      <DailyStockBulkBar
        count={selectedIds.size}
        onMarkCompleted={markCompleted}
        onClearValues={clearValues}
        onExport={() =>
          exportRows(selectedRows, `Daily_Stock_Selected_${getLocalDateStr()}.xlsx`)
        }
        onPrint={printSelected}
        onBulkUpdate={() => setBulkOpen(true)}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {bulkOpen ? (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-sm font-bold text-slate-800">
            Bulk update {selectedIds.size} products
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(['purchase', 'consumption', 'waste'] as const).map((field) => (
              <label key={field} className="block text-sm font-semibold text-slate-600">
                <span className="mb-1 block capitalize">{field === 'consumption' ? 'Consumed' : field}</span>
                <input
                  type="number"
                  className="h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30"
                  placeholder="Leave blank to skip"
                  value={bulkValues[field]}
                  onChange={(e) => setBulkValues((v) => ({ ...v, [field]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" className="rounded-xl bg-[#FF6A00] hover:bg-[#e85f00]" onClick={applyBulkUpdate}>
              Apply
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <DailyStockCategoryNav
          categories={navCategories}
          active={activeCategory}
          onSelect={scrollToCategory}
        />

        <div className="min-w-0 space-y-4">
          {loading && rows.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-100">
              Loading products…
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-100">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300" aria-hidden />
              <p className="text-lg font-bold text-slate-800">No matching products.</p>
              <p className="mt-1 text-sm text-slate-500">
                {activeFilterHint.length > 0
                  ? activeFilterHint.join(' · ')
                  : 'Try adjusting search or filters.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={resetFilters}>
                  Clear filters
                </Button>
                {filters.stockType === 'raw_material' && typeCounts.ready_product > 0 ? (
                  <Button
                    type="button"
                    className="rounded-xl bg-[#FF6A00] hover:bg-[#e85f00]"
                    onClick={() => onFiltersChange({ stockType: 'ready_product' })}
                  >
                    Show Ready product ({typeCounts.ready_product})
                  </Button>
                ) : null}
                {filters.stockType === 'ready_product' && typeCounts.raw_material > 0 ? (
                  <Button
                    type="button"
                    className="rounded-xl bg-[#FF6A00] hover:bg-[#e85f00]"
                    onClick={() => onFiltersChange({ stockType: 'raw_material' })}
                  >
                    Show Raw material ({typeCounts.raw_material})
                  </Button>
                ) : null}
              </div>
            </div>
          ) : mobileCards ? (
            <DailyStockCards
              rows={filteredRows}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onChangeField={handleFieldChange}
            />
          ) : (
            <DailyStockTable
              groups={groups}
              selectedIds={selectedIds}
              collapsed={collapsed}
              compact={compact}
              onToggleCollapse={(name) =>
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(name)) next.delete(name);
                  else next.add(name);
                  return next;
                })
              }
              onToggleSelect={toggleSelect}
              onToggleSelectCategory={toggleSelectCategory}
              onChangeField={handleFieldChange}
              registerCategoryEl={(name, el) => {
                if (el) categoryEls.current.set(name, el);
                else categoryEls.current.delete(name);
              }}
            />
          )}
        </div>
      </div>

      {FeedbackComponent}

      <DailyStockStickyBar
        updated={updatedCount}
        total={rows.length}
        unsaved={hasUnsavedChanges}
        submitting={submitting}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default DailyStockUpdate;
