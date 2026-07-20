/**
 * Copy Backbenchers raw_material catalog → CafePilots HQ.
 * READ-ONLY on Backbenchers. Never updates/deletes source rows.
 *
 * Usage: node scripts/copy_raw_materials_to_hq.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';

config({ path: '.env' });

const BB_COMPANY = 'c1000000-0000-0000-0000-000000000001';
const HQ_COMPANY = 'a1000000-0000-4000-8000-000000000001';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const sb = createClient(url, key);

async function fetchAll(table, filters) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    let q = sb.from(table).select('*').range(from, from + pageSize - 1);
    for (const [k, v] of Object.entries(filters)) {
      q = q.eq(k, v);
    }
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  console.log('Reading Backbenchers categories + raw materials (source untouched)…');

  const bbCategories = await fetchAll('categories', { company_id: BB_COMPANY });
  const bbProducts = (await fetchAll('products', { company_id: BB_COMPANY })).filter(
    (p) => p.item_type === 'raw_material' && p.is_active !== false
  );

  console.log(`Source: ${bbCategories.length} categories, ${bbProducts.length} raw materials`);

  const hqCategories = await fetchAll('categories', { company_id: HQ_COMPANY });
  const hqProducts = await fetchAll('products', { company_id: HQ_COMPANY });

  const hqCatByName = new Map(hqCategories.map((c) => [String(c.name).trim().toLowerCase(), c]));
  const hqProductByCode = new Map(
    hqProducts.filter((p) => p.code).map((p) => [String(p.code).trim().toLowerCase(), p])
  );
  const hqProductByName = new Map(
    hqProducts.map((p) => [String(p.name).trim().toLowerCase(), p])
  );

  // 1) Ensure categories exist on HQ (insert missing only)
  const categoryIdMap = new Map(); // bb category id → hq category id
  let catsCreated = 0;

  for (const cat of bbCategories) {
    const key = String(cat.name).trim().toLowerCase();
    const existing = hqCatByName.get(key);
    if (existing) {
      categoryIdMap.set(cat.id, existing.id);
      continue;
    }
    const newId = randomUUID();
    const { error } = await sb.from('categories').insert({
      id: newId,
      name: cat.name,
      description: cat.description ?? null,
      company_id: HQ_COMPANY,
    });
    if (error) {
      console.error('Category insert failed:', cat.name, error.message);
      continue;
    }
    categoryIdMap.set(cat.id, newId);
    hqCatByName.set(key, { id: newId, name: cat.name });
    catsCreated += 1;
  }

  console.log(`Categories: ${catsCreated} created, ${bbCategories.length - catsCreated} already present`);

  // 2) Copy raw materials (insert missing only — never touch BB rows)
  let productsCreated = 0;
  let productsSkipped = 0;
  const batch = [];

  for (const p of bbProducts) {
    const codeKey = p.code ? String(p.code).trim().toLowerCase() : '';
    const nameKey = String(p.name).trim().toLowerCase();
    if ((codeKey && hqProductByCode.has(codeKey)) || hqProductByName.has(nameKey)) {
      productsSkipped += 1;
      continue;
    }

    const hqCategoryId = p.category_id ? categoryIdMap.get(p.category_id) : null;
    // Prefix code to avoid unique (code, company_id) collisions with ready products
    let code = p.code || `RM-${String(p.name).slice(0, 12).toUpperCase().replace(/\s+/g, '-')}`;
    if (hqProductByCode.has(String(code).trim().toLowerCase())) {
      code = `RM-${code}`;
    }

    batch.push({
      id: randomUUID(),
      code,
      name: p.name,
      category_id: hqCategoryId || null,
      brand: p.brand,
      unit: p.unit || 'Unit',
      min_stock: p.min_stock ?? 0,
      max_stock: p.max_stock ?? 0,
      reorder_level: p.reorder_level ?? 0,
      purchase_price: p.purchase_price ?? 0,
      selling_price: p.selling_price ?? 0,
      gst: p.gst ?? 0,
      barcode: p.barcode,
      is_active: true,
      company_id: HQ_COMPANY,
      item_type: 'raw_material',
      image_url: p.image_url,
      dietary_preference: p.dietary_preference ?? 'veg',
    });
  }

  const chunkSize = 50;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    const { error } = await sb.from('products').insert(chunk);
    if (error) {
      console.error('Product batch insert failed:', error.message);
      // fallback one-by-one
      for (const row of chunk) {
        const { error: oneErr } = await sb.from('products').insert(row);
        if (oneErr) {
          console.error('  skip', row.name, oneErr.message);
          productsSkipped += 1;
        } else {
          productsCreated += 1;
        }
      }
    } else {
      productsCreated += chunk.length;
    }
  }

  const { count: hqRawAfter } = await sb
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', HQ_COMPANY)
    .eq('item_type', 'raw_material')
    .eq('is_active', true);

  console.log('\nDone. Backbenchers data was not modified.');
  console.log({
    productsCreated,
    productsSkippedExisting: productsSkipped,
    hqRawMaterialsNow: hqRawAfter,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
