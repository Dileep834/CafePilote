import { supabase } from '@/lib/supabase';
import { isMissingSchemaField } from '@/modules/inventory/lib/fetchInventory';
import { normalizeItemType } from '@/modules/inventory/daily/lib';
import type { CatalogCategory, CatalogProduct } from '../types';

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function catName(categories: unknown) {
  if (Array.isArray(categories)) return (categories[0] as { name?: string })?.name || 'Uncategorized';
  if (categories && typeof categories === 'object') {
    return (categories as { name?: string }).name || 'Uncategorized';
  }
  return 'Uncategorized';
}

/**
 * Resolve catalog item type.
 * - Prefer explicit item_type when present
 * - Ready products mistagged with ₹0 selling price are treated as raw materials
 * - Missing type: sellable if selling_price > 0, otherwise raw material (matches inventory)
 */
export function resolveCatalogItemType(row: {
  item_type?: unknown;
  selling_price?: unknown;
}): 'raw_material' | 'ready_product' {
  const selling = toNumber(row.selling_price);
  const explicit = String(row.item_type ?? '').trim();

  if (explicit) {
    const normalized = normalizeItemType(explicit);
    if (normalized === 'ready_product' && selling <= 0) return 'raw_material';
    return normalized;
  }

  return selling > 0 ? 'ready_product' : 'raw_material';
}

export function itemTypeLabel(type: string) {
  return type === 'raw_material' ? 'Raw material' : 'Ready product';
}

export async function fetchCatalogProducts(
  companyId?: string | null,
  outletId?: string | null
): Promise<CatalogProduct[]> {
  const selectFull =
    'id, code, name, category_id, company_id, brand, unit, min_stock, purchase_price, selling_price, gst, barcode, is_active, item_type, supplier_name, image_url, updated_at, created_at, categories(name)';
  const selectBase =
    'id, code, name, category_id, company_id, brand, unit, min_stock, purchase_price, selling_price, is_active, updated_at, created_at, categories(name)';

  let query = supabase.from('products').select(selectFull).order('name');
  if (companyId) query = query.eq('company_id', companyId);

  let { data, error } = await query;
  if (error && isMissingSchemaField(error)) {
    let fallback = supabase.from('products').select(selectBase).order('name');
    if (companyId) fallback = fallback.eq('company_id', companyId);
    const fb = await fallback;
    if (fb.error) throw fb.error;
    data = fb.data as typeof data;
  } else if (error) {
    throw error;
  }

  const stockMap = new Map<string, number>();
  const availabilityMap = new Map<
    string,
    {
      effective_status?: string | null;
      computed_status?: string | null;
      manual_status?: string | null;
      manual_reason?: string | null;
      available_servings?: number | null;
    }
  >();
  try {
    const { data: inv } = await supabase
      .from('inventory')
      .select('product_id, current_quantity');
    for (const row of inv || []) {
      const pid = String((row as { product_id?: string }).product_id || '');
      if (!pid) continue;
      const qty = toNumber((row as { current_quantity?: number }).current_quantity);
      stockMap.set(pid, (stockMap.get(pid) || 0) + qty);
    }
  } catch {
    // inventory optional
  }

  if (outletId) {
    try {
      const { data: availability } = await supabase
        .from('product_outlet_availability')
        .select('product_id, effective_status, computed_status, manual_status, manual_reason, available_servings')
        .eq('outlet_id', outletId);
      for (const row of availability || []) {
        const pid = String((row as { product_id?: string }).product_id || '');
        if (!pid) continue;
        availabilityMap.set(pid, row as {
          effective_status?: string | null;
          computed_status?: string | null;
          manual_status?: string | null;
          manual_reason?: string | null;
          available_servings?: number | null;
        });
      }
    } catch {
      // optional table
    }
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const id = String(row.id);
    const minStock = toNumber(row.min_stock);
    const stockQty = stockMap.has(id) ? stockMap.get(id)! : null;
    const availability = availabilityMap.get(id);
    const manualStatus = availability?.manual_status
      ? (String(availability.manual_status) as CatalogProduct['availabilityStatus'])
      : null;
    const availabilityStatus = manualStatus
      ? manualStatus
      : availability?.effective_status
        ? (String(availability.effective_status) as CatalogProduct['availabilityStatus'])
        : row.is_active === false
          ? 'inactive'
          : Boolean(row.is_hidden)
            ? 'hidden'
            : 'active';
    return {
      id,
      code: String(row.code || ''),
      name: String(row.name || ''),
      categoryId: row.category_id ? String(row.category_id) : null,
      categoryName: catName(row.categories),
      companyId: row.company_id ? String(row.company_id) : null,
      brand: String(row.brand || '—'),
      supplier: String(row.supplier_name || '—'),
      unit: String(row.unit || 'Unit'),
      itemType: resolveCatalogItemType(row),
      purchasePrice: toNumber(row.purchase_price),
      sellingPrice: toNumber(row.selling_price),
      minStock,
      stockQty,
      isActive: row.is_active !== false,
      isHidden: Boolean(row.is_hidden),
      isArchived: Boolean(row.is_archived) || row.is_active === false,
      availabilityStatus,
      computedAvailabilityStatus: (availability?.computed_status as string | null) || null,
      manualAvailabilityStatus: (availability?.manual_status as string | null) || null,
      availabilityReason: (availability?.manual_reason as string | null) || null,
      availableServings:
        availability?.available_servings === null || availability?.available_servings === undefined
          ? null
          : toNumber(availability.available_servings),
      imageUrl: (row.image_url as string | null) || null,
      updatedAt: (row.updated_at as string | null) || null,
      createdAt: (row.created_at as string | null) || null,
      raw: row,
    };
  });
}

export async function fetchCatalogCategories(
  companyId?: string | null
): Promise<CatalogCategory[]> {
  let query = supabase.from('categories').select('*').order('name');
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  if (error) throw error;

  let productCounts = new Map<string, number>();
  try {
    let pq = supabase.from('products').select('category_id');
    if (companyId) pq = pq.eq('company_id', companyId);
    const { data: products } = await pq;
    for (const p of products || []) {
      const cid = String((p as { category_id?: string }).category_id || '');
      if (!cid) continue;
      productCounts.set(cid, (productCounts.get(cid) || 0) + 1);
    }
  } catch {
    productCounts = new Map();
  }

  return (data || []).map((row: Record<string, unknown>) => {
    const id = String(row.id);
    const rawName = String(row.name || '');
    const hiddenByFlag = Boolean(row.is_hidden);
    const hiddenByPrefix = rawName.startsWith('[Hidden] ');
    const isHidden = hiddenByFlag || hiddenByPrefix;
    const displayName = hiddenByPrefix ? rawName.replace(/^\[Hidden\]\s*/, '') : rawName;
    const isActive = row.is_active !== false && !row.is_archived && !isHidden;
    return {
      id,
      name: displayName,
      description: String(row.description || ''),
      companyId: row.company_id ? String(row.company_id) : null,
      productCount: productCounts.get(id) || 0,
      isActive,
      isHidden,
      isArchived: Boolean(row.is_archived),
      createdAt: (row.created_at as string | null) || null,
      updatedAt: (row.updated_at as string | null) || null,
      raw: {
        ...row,
        name: rawName,
        is_hidden: isHidden,
      },
    };
  });
}

export function formatShortDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}
