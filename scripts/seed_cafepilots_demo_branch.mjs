/**
 * Create CafePilots demo branch + sample operational data for demos.
 *
 * Idempotent — safe to re-run.
 * Does NOT modify Backbenchers data.
 *
 * Usage: node scripts/seed_cafepilots_demo_branch.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env' });

const HQ_COMPANY = 'a1000000-0000-4000-8000-000000000001';
const DEMO_OUTLET = {
  id: 'a1000000-0000-4000-8000-000000000020',
  code: 'CP-DEMO',
  name: 'CafePilots Demo Cafe',
  location: 'Bandra West, Mumbai — Platform demo branch',
};

const SUPPLIERS = [
  {
    id: 'a1000000-0000-4000-8000-000000000101',
    name: 'FreshHarvest Produce',
    category: 'Vegetables',
    contact_name: 'Ravi Mehta',
    phone: '+91 98200 11101',
    email: 'orders@freshharvest.demo',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '400050',
    payment_terms: '7 Days',
    preferred_delivery_time: 'Morning',
    preferred_supplier: true,
    address: 'Linking Road Wholesale Market\nBandra West, Mumbai, 400050',
    notes: 'Preferred veg vendor for demo cafe',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000102',
    name: 'DairyDirect Co',
    category: 'Dairy',
    contact_name: 'Priya Shah',
    phone: '+91 98200 11102',
    email: 'supply@dairydirect.demo',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '400013',
    payment_terms: '15 Days',
    preferred_delivery_time: 'Morning',
    preferred_supplier: true,
    address: 'Dadar Dairy Hub\nDadar East, Mumbai, 400013',
    notes: 'Milk, cream, cheese',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000103',
    name: 'PackRight Supplies',
    category: 'Packaging',
    contact_name: 'Amit Kulkarni',
    phone: '+91 98200 11103',
    email: 'hello@packright.demo',
    city: 'Thane',
    state: 'Maharashtra',
    pin_code: '400601',
    payment_terms: '30 Days',
    preferred_delivery_time: 'Afternoon',
    preferred_supplier: false,
    address: 'Wagle Estate\nThane, 400601',
    notes: 'Cups, lids, takeaway packs',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000104',
    name: 'Bean&Brew Traders',
    category: 'Coffee',
    contact_name: 'Neha Iyer',
    phone: '+91 98200 11104',
    email: 'beans@beanbrew.demo',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '400001',
    payment_terms: 'Cash',
    preferred_delivery_time: 'Evening',
    preferred_supplier: false,
    address: 'Fort Business District\nMumbai, 400001',
    notes: 'Coffee beans and syrups',
  },
];

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const sb = createClient(url, key);

function todayOffset(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function money(n) {
  return Math.round(n * 100) / 100;
}

async function upsertOutlet() {
  const row = {
    id: DEMO_OUTLET.id,
    code: DEMO_OUTLET.code,
    name: DEMO_OUTLET.name,
    location: DEMO_OUTLET.location,
    is_active: true,
    company_id: HQ_COMPANY,
  };
  const { error } = await sb.from('outlets').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(`outlet: ${error.message}`);
  console.log('✓ Outlet', DEMO_OUTLET.name);
}

async function upsertSuppliers() {
  for (const s of SUPPLIERS) {
    const full = {
      ...s,
      is_active: true,
      company_id: HQ_COMPANY,
    };
    let { error } = await sb.from('suppliers').upsert(full, { onConflict: 'id' });
    if (error && /column|schema cache|does not exist/i.test(error.message || '')) {
      const core = {
        id: s.id,
        name: s.name,
        category: s.category,
        contact_name: s.contact_name,
        phone: s.phone,
        address: s.address,
        is_active: true,
        company_id: HQ_COMPANY,
      };
      ({ error } = await sb.from('suppliers').upsert(core, { onConflict: 'id' }));
    }
    if (error) throw new Error(`supplier ${s.name}: ${error.message}`);
  }
  console.log(`✓ Suppliers (${SUPPLIERS.length})`);
}

async function loadProducts() {
  const { data, error } = await sb
    .from('products')
    .select('id, name, unit, min_stock, purchase_price, selling_price, item_type, code')
    .eq('company_id', HQ_COMPANY)
    .eq('is_active', true)
    .eq('item_type', 'raw_material')
    .order('name')
    .limit(80);
  if (error) throw new Error(`products: ${error.message}`);
  if (!data?.length) throw new Error('No HQ raw materials found. Run copy_raw_materials_to_hq.mjs first.');
  return data;
}

function pickDemoProducts(all) {
  // Prefer recognizable kitchen staples for demo storytelling
  const prefer = [
    'ADRAK',
    'American corn',
    'BUTTER',
    'CHEESE',
    'CREAM',
    'MILK',
    'ONION',
    'TOMATO',
    'POTATO',
    'COFFEE',
    'SUGAR',
    'OIL',
    'FLOUR',
    'BREAD',
    'EGG',
    'MAYO',
    'SAUCE',
    'RCT',
    'ROUND',
    'PATTY',
  ];
  const scored = all
    .map((p) => {
      const name = (p.name || '').toUpperCase();
      const score = prefer.reduce((acc, key) => (name.includes(key.toUpperCase()) ? acc + 2 : acc), 0);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));

  const picked = [];
  const seen = new Set();
  for (const { p } of scored) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    picked.push(p);
    if (picked.length >= 24) break;
  }
  return picked;
}

async function seedInventory(products) {
  // Varied health states for KPI / suggestions demos
  const patterns = [
    { qty: 0, label: 'out' },
    { qty: 0, label: 'out' },
    { qty: 1, label: 'critical' },
    { qty: 2, label: 'critical' },
    { qty: 4, label: 'low' },
    { qty: 5, label: 'low' },
    { qty: 8, label: 'low' },
    { qty: 12, label: 'ok' },
    { qty: 18, label: 'ok' },
    { qty: 25, label: 'healthy' },
    { qty: 30, label: 'healthy' },
    { qty: 40, label: 'healthy' },
  ];

  const rows = products.map((p, i) => {
    const min = Math.max(5, Number(p.min_stock) || 10);
    const pat = patterns[i % patterns.length];
    let qty = pat.qty;
    if (pat.label === 'healthy') qty = Math.max(min * 2, pat.qty);
    if (pat.label === 'ok') qty = Math.max(min + 2, pat.qty);
    if (pat.label === 'low') qty = Math.max(1, Math.min(min, pat.qty));
    if (pat.label === 'critical') qty = Math.max(0, Math.min(Math.ceil(min * 0.3), pat.qty));
    return {
      outlet_id: DEMO_OUTLET.id,
      product_id: p.id,
      current_quantity: qty,
      last_updated: new Date().toISOString(),
    };
  });

  const { error } = await sb.from('inventory').upsert(rows, { onConflict: 'outlet_id,product_id' });
  if (error) throw new Error(`inventory: ${error.message}`);
  console.log(`✓ Inventory (${rows.length} items)`);
  return rows;
}

async function clearDemoOps() {
  // Remove previous DEMO POs (items first)
  const { data: oldPos } = await sb
    .from('purchase_orders')
    .select('id')
    .eq('outlet_id', DEMO_OUTLET.id)
    .like('po_number', 'DEMO-%');
  if (oldPos?.length) {
    const ids = oldPos.map((p) => p.id);
    await sb.from('purchase_order_items').delete().in('po_id', ids);
    await sb.from('purchase_orders').delete().in('id', ids);
  }
  await sb.from('waste_logs').delete().eq('franchise_id', DEMO_OUTLET.id).like('reason', '%[DEMO]%');
  await sb.from('stock_adjustments').delete().eq('franchise_id', DEMO_OUTLET.id).like('reason', '%[DEMO]%');
  await sb.from('daily_stock').delete().eq('outlet_id', DEMO_OUTLET.id);

  // POS / QR for this outlet
  const { data: oldOrders } = await sb.from('pos_orders').select('id').eq('outlet_id', DEMO_OUTLET.id);
  if (oldOrders?.length) {
    const ids = oldOrders.map((o) => o.id);
    await sb.from('pos_order_items').delete().in('order_id', ids);
    await sb.from('pos_orders').delete().in('id', ids);
  }
  await sb.from('guest_sessions').delete().eq('outlet_id', DEMO_OUTLET.id);
  await sb.from('dining_tables').delete().eq('outlet_id', DEMO_OUTLET.id);
}

async function loadMenuProducts() {
  const { data, error } = await sb
    .from('products')
    .select('id, name, selling_price, unit')
    .eq('company_id', HQ_COMPANY)
    .eq('item_type', 'ready_product')
    .eq('is_active', true)
    .order('name')
    .limit(30);
  if (error) throw new Error(`menu products: ${error.message}`);
  if (!data?.length) throw new Error('No ready_product menu items on HQ. Seed menu products first.');
  return data.map((p) => ({
    ...p,
    selling_price: Math.max(49, Number(p.selling_price) || 149),
  }));
}

const DEMO_CUSTOMERS = [
  {
    id: 'a1000000-0000-4000-8000-000000000201',
    name: 'Ananya Sharma',
    phone: '9876500001',
    email: 'ananya.demo@cafepilots.com',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000202',
    name: 'Rahul Verma',
    phone: '9876500002',
    email: 'rahul.demo@cafepilots.com',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000203',
    name: 'Meera Kapoor',
    phone: '9876500003',
    email: 'meera.demo@cafepilots.com',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000204',
    name: 'Walk-in Guest',
    phone: '9876500004',
    email: 'walkin.demo@cafepilots.com',
  },
];

const DEMO_TABLES = [
  { id: 'a1000000-0000-4000-8000-000000000301', table_number: 'T-01', capacity: 2, table_type: 'square', status: 'occupied', sort_order: 1 },
  { id: 'a1000000-0000-4000-8000-000000000312', table_number: 'T-02', capacity: 4, table_type: 'square', status: 'occupied', sort_order: 2 },
  { id: 'a1000000-0000-4000-8000-000000000313', table_number: 'T-03', capacity: 4, table_type: 'round', status: 'available', sort_order: 3 },
  { id: 'a1000000-0000-4000-8000-000000000314', table_number: 'T-04', capacity: 6, table_type: 'sofa', status: 'reserved', sort_order: 4 },
  { id: 'a1000000-0000-4000-8000-000000000315', table_number: 'T-05', capacity: 2, table_type: 'square', status: 'cleaning', sort_order: 5 },
  { id: 'a1000000-0000-4000-8000-000000000316', table_number: 'T-06', capacity: 4, table_type: 'round', status: 'available', sort_order: 6 },
  { id: 'a1000000-0000-4000-8000-000000000317', table_number: 'T-07', capacity: 8, table_type: 'sofa', status: 'occupied', sort_order: 7 },
  { id: 'a1000000-0000-4000-8000-000000000318', table_number: 'T-08', capacity: 2, table_type: 'square', status: 'available', sort_order: 8 },
];

function lineItems(menu, indices) {
  return indices.map((i, idx) => {
    const p = menu[i % menu.length];
    const quantity = 1 + (idx % 2);
    const unit_price = p.selling_price;
    return {
      product_id: p.id,
      product_name: p.name,
      quantity,
      unit_price,
      total_price: money(quantity * unit_price),
    };
  });
}

function orderTotals(items) {
  const subtotal = money(items.reduce((s, i) => s + i.total_price, 0));
  const tax_amount = money(subtotal * 0.18);
  const total_amount = money(subtotal + tax_amount);
  return { subtotal, tax_amount, total_amount };
}

async function seedCustomers() {
  let ok = 0;
  for (const c of DEMO_CUSTOMERS) {
    const row = {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      loyalty_points: 50 + Math.floor(Math.random() * 200),
      total_spend: money(500 + Math.random() * 4000),
      is_active: true,
      company_id: HQ_COMPANY,
    };
    let { data, error } = await sb.from('customers').upsert(row, { onConflict: 'id' }).select('id');
    if (error && /column|schema cache|does not exist/i.test(error.message || '')) {
      const core = {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        is_active: true,
      };
      ({ data, error } = await sb.from('customers').upsert(core, { onConflict: 'id' }).select('id'));
    }
    if (error || !data?.length) {
      console.log(`· Customer ${c.email} skipped:`, error?.message || 'RLS blocked');
      continue;
    }
    ok += 1;
  }
  if (ok) console.log(`✓ Customers (${ok})`);
  else console.log('· Customers skipped (enable RLS open via scripts/guest_sessions_rls_open.sql)');
}

async function seedDiningTables() {
  const rows = DEMO_TABLES.map((t) => ({
    ...t,
    outlet_id: DEMO_OUTLET.id,
    company_id: HQ_COMPANY,
    qr_code_token: `demo-${t.table_number.toLowerCase()}-${DEMO_OUTLET.id.slice(0, 8)}`,
    is_active: true,
    current_order_id: null,
  }));
  const { error } = await sb.from('dining_tables').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`dining_tables: ${error.message}`);
  console.log(`✓ Dining tables (${rows.length})`);
  return rows;
}

async function seedGuestSessions(tables) {
  const sessions = [
    {
      outlet_id: DEMO_OUTLET.id,
      table_id: tables[0].id,
      table_number: tables[0].table_number,
      guest_email: DEMO_CUSTOMERS[0].email,
      guest_name: DEMO_CUSTOMERS[0].name,
      guest_id: DEMO_CUSTOMERS[0].id,
      provider: 'email',
      company_id: HQ_COMPANY,
      ended_at: null,
    },
    {
      outlet_id: DEMO_OUTLET.id,
      table_id: tables[1].id,
      table_number: tables[1].table_number,
      guest_email: DEMO_CUSTOMERS[1].email,
      guest_name: DEMO_CUSTOMERS[1].name,
      guest_id: DEMO_CUSTOMERS[1].id,
      provider: 'google',
      company_id: HQ_COMPANY,
      ended_at: null,
    },
    {
      outlet_id: DEMO_OUTLET.id,
      table_id: tables[6].id,
      table_number: tables[6].table_number,
      guest_email: DEMO_CUSTOMERS[2].email,
      guest_name: DEMO_CUSTOMERS[2].name,
      guest_id: DEMO_CUSTOMERS[2].id,
      provider: 'email',
      company_id: HQ_COMPANY,
      ended_at: null,
    },
    // ended session (history)
    {
      outlet_id: DEMO_OUTLET.id,
      table_id: tables[2].id,
      table_number: tables[2].table_number,
      guest_email: DEMO_CUSTOMERS[3].email,
      guest_name: DEMO_CUSTOMERS[3].name,
      guest_id: DEMO_CUSTOMERS[3].id,
      provider: 'email',
      company_id: HQ_COMPANY,
      ended_at: new Date(Date.now() - 3600_000).toISOString(),
    },
  ];
  const { error } = await sb.from('guest_sessions').insert(sessions);
  if (error) {
    console.log('· Guest sessions skipped (RLS):', error.message);
    return;
  }
  console.log(`✓ Guest sessions (${sessions.length})`);
}

async function insertPosOrder(order, items) {
  const { data, error } = await sb.from('pos_orders').insert([order]).select('id').single();
  if (error) throw new Error(`pos_order: ${error.message}`);
  const { error: itemErr } = await sb.from('pos_order_items').insert(
    items.map((it) => ({ ...it, order_id: data.id }))
  );
  if (itemErr) throw new Error(`pos_order_items: ${itemErr.message}`);
  return data.id;
}

async function seedPosAndQrOrders(menu, tables) {
  const createdAt = (hoursAgo) => {
    const d = new Date();
    d.setHours(d.getHours() - hoursAgo);
    return d.toISOString();
  };

  // 1) Completed counter sales (last few days)
  for (let i = 0; i < 8; i++) {
    const items = lineItems(menu, [i, i + 1, i + 3]);
    const { tax_amount, total_amount } = orderTotals(items);
    const methods = ['cash', 'upi', 'card', 'wallet'];
    await insertPosOrder(
      {
        outlet_id: DEMO_OUTLET.id,
        customer_name: DEMO_CUSTOMERS[i % DEMO_CUSTOMERS.length].name,
        customer_phone: DEMO_CUSTOMERS[i % DEMO_CUSTOMERS.length].phone,
        total_amount,
        tax_amount,
        payment_method: methods[i % methods.length],
        tendered_amount: money(total_amount + (methods[i % methods.length] === 'cash' ? 50 : 0)),
        change_due: methods[i % methods.length] === 'cash' ? 50 : 0,
        status: 'completed',
        kitchen_status: 'delivered',
        order_source: 'pos',
        notes: '[DEMO] Completed counter sale',
        created_at: createdAt(6 + i * 5),
      },
      items
    );
  }

  // 2) Completed QR table sales
  for (let i = 0; i < 4; i++) {
    const table = tables[i % tables.length];
    const items = lineItems(menu, [i + 2, i + 5]);
    const { tax_amount, total_amount } = orderTotals(items);
    await insertPosOrder(
      {
        outlet_id: DEMO_OUTLET.id,
        table_id: table.id,
        table_number: table.table_number,
        customer_name: DEMO_CUSTOMERS[i % DEMO_CUSTOMERS.length].name,
        customer_phone: DEMO_CUSTOMERS[i % DEMO_CUSTOMERS.length].email,
        total_amount,
        tax_amount,
        payment_method: 'upi',
        tendered_amount: total_amount,
        change_due: 0,
        status: 'completed',
        kitchen_status: 'delivered',
        order_source: 'qr',
        notes: `[DEMO] QR dine-in settled · ${table.table_number}`,
        created_at: createdAt(3 + i * 4),
      },
      items
    );
  }

  // 3) Open bills on occupied tables
  const openSpecs = [
    { table: tables[0], customer: DEMO_CUSTOMERS[0], idxs: [0, 2] },
    { table: tables[1], customer: DEMO_CUSTOMERS[1], idxs: [1, 4, 6] },
    { table: tables[6], customer: DEMO_CUSTOMERS[2], idxs: [3, 7, 8] },
  ];
  const openOrderIds = [];
  for (const spec of openSpecs) {
    const items = lineItems(menu, spec.idxs);
    const { tax_amount, total_amount } = orderTotals(items);
    const id = await insertPosOrder(
      {
        outlet_id: DEMO_OUTLET.id,
        table_id: spec.table.id,
        table_number: spec.table.table_number,
        customer_name: spec.customer.name,
        customer_phone: spec.customer.phone,
        total_amount,
        tax_amount,
        payment_method: 'pending',
        tendered_amount: 0,
        change_due: 0,
        status: 'open',
        kitchen_status: 'delivered',
        order_source: iOrderSource(spec.table),
        notes: `[DEMO] Open bill · ${spec.table.table_number}`,
        created_at: createdAt(1),
      },
      items
    );
    openOrderIds.push({ tableId: spec.table.id, orderId: id });
  }

  // Link occupied tables to open orders
  for (const link of openOrderIds) {
    await sb
      .from('dining_tables')
      .update({ current_order_id: link.orderId, status: 'occupied' })
      .eq('id', link.tableId);
  }

  // 4) Kitchen tickets (sent) with varied kitchen_status
  const kitchenSpecs = [
    { kitchen_status: 'pending', table: tables[0], idxs: [5, 9], source: 'qr' },
    { kitchen_status: 'preparing', table: tables[1], idxs: [2, 10], source: 'pos' },
    { kitchen_status: 'ready', table: tables[6], idxs: [0, 11], source: 'qr' },
    { kitchen_status: 'pending', table: tables[3], idxs: [4], source: 'pos' },
  ];
  for (const spec of kitchenSpecs) {
    const items = lineItems(menu, spec.idxs);
    const { tax_amount, total_amount } = orderTotals(items);
    await insertPosOrder(
      {
        outlet_id: DEMO_OUTLET.id,
        table_id: spec.table.id,
        table_number: spec.table.table_number,
        customer_name: `Table ${spec.table.table_number}`,
        total_amount,
        tax_amount,
        payment_method: 'pending',
        tendered_amount: 0,
        change_due: 0,
        status: 'sent',
        kitchen_status: spec.kitchen_status,
        order_source: spec.source,
        notes: `[DEMO] Kitchen ticket · ${spec.kitchen_status}`,
        created_at: createdAt(0.5),
      },
      items
    );
  }

  // 5) Held counter order
  {
    const items = lineItems(menu, [8, 12]);
    const { tax_amount, total_amount } = orderTotals(items);
    await insertPosOrder(
      {
        outlet_id: DEMO_OUTLET.id,
        customer_name: 'Held Order Guest',
        customer_phone: '9876500099',
        total_amount,
        tax_amount,
        payment_method: 'pending',
        tendered_amount: 0,
        change_due: 0,
        status: 'held',
        kitchen_status: 'pending',
        order_source: 'pos',
        notes: '[DEMO] Held counter order',
        created_at: createdAt(0.2),
      },
      items
    );
  }

  console.log('✓ POS / QR orders (completed + open + kitchen + held)');
}

function iOrderSource(table) {
  // First two occupied tables are QR guests; larger party is POS
  if (table.table_number === 'T-07') return 'pos';
  return 'qr';
}

async function seedLegacySales(menu) {
  // Optional ERP Sales screen data
  const rows = [];
  for (let i = 0; i < 5; i++) {
    const p = menu[i % menu.length];
    const qty = 1 + (i % 3);
    rows.push({
      outlet_id: DEMO_OUTLET.id,
      company_id: HQ_COMPANY,
      sold_by: null,
      total_amount: money(qty * (p.selling_price || 149)),
      sale_date: todayOffset(-i),
    });
  }
  let { data, error } = await sb.from('sales').insert(rows).select('id');
  if (error && /column|schema cache|does not exist/i.test(error.message || '')) {
    console.log('· Skipping legacy sales table:', error.message);
    return;
  }
  if (error) {
    console.log('· Skipping legacy sales:', error.message);
    return;
  }
  if (data?.length) {
    const items = data.map((sale, i) => {
      const p = menu[i % menu.length];
      return {
        sale_id: sale.id,
        product_id: p.id,
        quantity: 1 + (i % 3),
        price_at_sale: p.selling_price,
      };
    });
    const { error: ie } = await sb.from('sale_items').insert(items);
    if (ie) console.log('· sale_items skipped:', ie.message);
    else console.log(`✓ Legacy sales (${data.length})`);
  }
}

async function main() {
  console.log('Seeding CafePilots demo branch (full ops + POS/QR)…\n');
  await upsertOutlet();
  await upsertSuppliers();
  const all = await loadProducts();
  const products = pickDemoProducts(all);
  console.log('✓ Inventory products:', products.map((p) => p.name).slice(0, 8).join(', '), '…');

  const menu = await loadMenuProducts();
  console.log('✓ Menu products:', menu.map((p) => p.name).slice(0, 6).join(', '), '…');

  await clearDemoOps();
  const invRows = await seedInventory(products);
  await seedPurchaseOrders(products, Object.fromEntries(invRows.map((r) => [r.product_id, r])));
  await seedWaste(products);
  await seedAdjustments(products, invRows);
  await seedDailyStock(products, invRows);

  await seedCustomers();
  const tables = await seedDiningTables();
  await seedGuestSessions(tables);
  await seedPosAndQrOrders(menu, tables);
  await seedLegacySales(menu);

  console.log('\nDone. Switch branch to:');
  console.log(`  ${DEMO_OUTLET.name} (${DEMO_OUTLET.code})`);
  console.log(`  id: ${DEMO_OUTLET.id}`);
  console.log('\nDemo covers:');
  console.log('  Inventory · Suppliers · Purchase Orders · Waste · Adjustments · Daily Stock');
  console.log('  Dining Tables · QR Guests · Customers');
  console.log('  POS sales · Open bills · Kitchen tickets · Held orders');
}

main().catch((err) => {
  console.error('\nFAILED:', err.message || err);
  process.exit(1);
});


async function seedPurchaseOrders(products, invByProduct) {
  const [veg, dairy, pack, coffee] = SUPPLIERS;
  const price = (p) => Math.max(10, Number(p.purchase_price) || Number(p.selling_price) || 40);

  const scenarios = [
    {
      po_number: 'DEMO-PO-001',
      supplier_id: veg.id,
      status: 'Received',
      daysAgo: 18,
      expectedOffset: -14,
      notes: '[DEMO] Weekly vegetables — received',
      itemIdx: [0, 1, 2],
    },
    {
      po_number: 'DEMO-PO-002',
      supplier_id: dairy.id,
      status: 'Received',
      daysAgo: 10,
      expectedOffset: -7,
      notes: '[DEMO] Dairy restock — received',
      itemIdx: [3, 4],
    },
    {
      po_number: 'DEMO-PO-003',
      supplier_id: pack.id,
      status: 'Pending',
      daysAgo: 2,
      expectedOffset: 3,
      notes: '[DEMO] Packaging order — awaiting receive',
      itemIdx: [5, 6],
    },
    {
      po_number: 'DEMO-PO-004',
      supplier_id: coffee.id,
      status: 'Pending',
      daysAgo: 5,
      expectedOffset: -1,
      notes: '[DEMO] Overdue coffee beans',
      itemIdx: [7],
    },
    {
      po_number: 'DEMO-PO-005',
      supplier_id: veg.id,
      status: 'Draft',
      daysAgo: 0,
      expectedOffset: 5,
      notes: '[DEMO] Draft PO for manager approval',
      itemIdx: [8, 9],
    },
    {
      po_number: 'DEMO-PO-006',
      supplier_id: dairy.id,
      status: 'Cancelled',
      daysAgo: 12,
      expectedOffset: 0,
      notes: '[DEMO] Cancelled duplicate order',
      itemIdx: [10],
    },
  ];

  for (const sc of scenarios) {
    const items = sc.itemIdx
      .map((i) => products[i])
      .filter(Boolean)
      .map((p, idx) => {
        const qty = 10 + (idx + 1) * 2;
        const unit_price = price(p);
        return {
          product_id: p.id,
          quantity: qty,
          unit_price,
          total_price: money(qty * unit_price),
          received_quantity: sc.status === 'Received' ? qty : 0,
        };
      });
    if (!items.length) continue;

    const total = money(items.reduce((s, i) => s + i.total_price, 0));
    const created = new Date();
    created.setDate(created.getDate() - sc.daysAgo);
    const expected = todayOffset(sc.expectedOffset);

    // delete existing by po_number then insert
    const { data: existing } = await sb
      .from('purchase_orders')
      .select('id')
      .eq('po_number', sc.po_number)
      .maybeSingle();
    if (existing?.id) {
      await sb.from('purchase_order_items').delete().eq('po_id', existing.id);
      await sb.from('purchase_orders').delete().eq('id', existing.id);
    }

    const { data: po, error } = await sb
      .from('purchase_orders')
      .insert([
        {
          po_number: sc.po_number,
          outlet_id: DEMO_OUTLET.id,
          supplier_id: sc.supplier_id,
          status: sc.status,
          total_amount: total,
          notes: sc.notes,
          expected_date: expected,
          created_at: created.toISOString(),
        },
      ])
      .select('id')
      .single();
    if (error) throw new Error(`PO ${sc.po_number}: ${error.message}`);

    const { error: itemErr } = await sb.from('purchase_order_items').insert(
      items.map((it) => ({ ...it, po_id: po.id }))
    );
    if (itemErr) throw new Error(`PO items ${sc.po_number}: ${itemErr.message}`);
  }
  console.log(`✓ Purchase orders (${scenarios.length})`);
}

async function seedWaste(products) {
  const rows = [
    {
      franchise_id: DEMO_OUTLET.id,
      product_id: products[0].id,
      quantity: 2,
      reason: '[DEMO] Spoilage — fridge temp spike',
      logged_by: 'Demo Manager',
      date: todayOffset(-1),
      status: 'approved',
      unit_cost: Number(products[0].purchase_price) || 40,
      notes: 'Morning check found soft stock',
    },
    {
      franchise_id: DEMO_OUTLET.id,
      product_id: products[1].id,
      quantity: 1.5,
      reason: '[DEMO] Prep error — overcut garnish',
      logged_by: 'Kitchen Staff',
      date: todayOffset(0),
      status: 'pending',
      unit_cost: Number(products[1].purchase_price) || 30,
      notes: 'Training shift',
    },
    {
      franchise_id: DEMO_OUTLET.id,
      product_id: products[2].id,
      quantity: 3,
      reason: '[DEMO] Expired — past use-by',
      logged_by: 'Demo Manager',
      date: todayOffset(-3),
      status: 'approved',
      unit_cost: Number(products[2].purchase_price) || 25,
      notes: 'FIFO reminder sent to team',
    },
  ].map((r) => ({
    ...r,
    total_loss: money((r.unit_cost || 0) * r.quantity),
  }));

  // Prefer extended columns; fallback to core
  let { error } = await sb.from('waste_logs').insert(rows);
  if (error && /column|schema cache|does not exist/i.test(error.message || '')) {
    const core = rows.map(({ franchise_id, product_id, quantity, reason, logged_by, date }) => ({
      franchise_id,
      product_id,
      quantity,
      reason,
      logged_by,
      date,
    }));
    ({ error } = await sb.from('waste_logs').insert(core));
  }
  if (error) throw new Error(`waste: ${error.message}`);
  console.log(`✓ Waste logs (${rows.length})`);
}

async function seedAdjustments(products, invRows) {
  const p0 = products[3] || products[0];
  const p1 = products[4] || products[1];
  const inv0 = invRows.find((r) => r.product_id === p0.id)?.current_quantity ?? 10;
  const inv1 = invRows.find((r) => r.product_id === p1.id)?.current_quantity ?? 10;

  const rows = [
    {
      franchise_id: DEMO_OUTLET.id,
      product_id: p0.id,
      adjustment_qty: 5,
      reason: '[DEMO] Stock count correction (+)',
      approved_by: 'Demo Manager',
      date: todayOffset(-2),
      status: 'approved',
      logged_by: 'Inventory Staff',
      previous_stock: inv0,
      new_stock: inv0 + 5,
      adjustment_type: 'increase',
      notes: 'Cycle count variance',
    },
    {
      franchise_id: DEMO_OUTLET.id,
      product_id: p1.id,
      adjustment_qty: -2,
      reason: '[DEMO] Damaged packaging write-off',
      approved_by: 'Demo Manager',
      date: todayOffset(0),
      status: 'pending',
      logged_by: 'Inventory Staff',
      previous_stock: inv1,
      new_stock: Math.max(0, inv1 - 2),
      adjustment_type: 'decrease',
      notes: 'Torn bags found in dry store',
    },
  ];

  let { error } = await sb.from('stock_adjustments').insert(rows);
  if (error && /column|schema cache|does not exist/i.test(error.message || '')) {
    const core = rows.map(
      ({ franchise_id, product_id, adjustment_qty, reason, approved_by, date }) => ({
        franchise_id,
        product_id,
        adjustment_qty,
        reason,
        approved_by,
        date,
      })
    );
    ({ error } = await sb.from('stock_adjustments').insert(core));
  }
  if (error) throw new Error(`adjustments: ${error.message}`);
  console.log(`✓ Stock adjustments (${rows.length})`);
}

async function seedDailyStock(products, invRows) {
  const days = [-6, -5, -4, -3, -2, -1, 0];
  const sample = products.slice(0, 12);
  const rows = [];

  for (const day of days) {
    for (const p of sample) {
      const base = invRows.find((r) => r.product_id === p.id)?.current_quantity ?? 10;
      const opening = Math.max(0, base + 8 + ((day + 6) % 3));
      const purchase = day === -2 || day === -5 ? 10 : 0;
      const consumption = 3 + ((Math.abs(day) + sample.indexOf(p)) % 5);
      const waste = day === -1 && sample.indexOf(p) < 2 ? 1 : 0;
      const closing = Math.max(0, opening + purchase - consumption - waste);
      rows.push({
        date: todayOffset(day),
        outlet_id: DEMO_OUTLET.id,
        product_id: p.id,
        opening_stock: opening,
        purchase,
        consumption,
        waste,
        closing_stock: closing,
        status: day === 0 ? 'In Progress' : 'Approved',
      });
    }
  }

  // Try outlet_id schema first; fallback franchise_id if needed
  let { error } = await sb.from('daily_stock').upsert(rows, {
    onConflict: 'date,outlet_id,product_id',
  });
  if (error && /outlet_id|schema cache|does not exist|conflict/i.test(error.message || '')) {
    const legacy = rows.map(({ outlet_id, ...rest }) => ({
      ...rest,
      franchise_id: outlet_id,
    }));
    ({ error } = await sb.from('daily_stock').upsert(legacy, {
      onConflict: 'date,franchise_id,product_id',
    }));
  }
  if (error) throw new Error(`daily_stock: ${error.message}`);
  console.log(`✓ Daily stock (${rows.length} rows across ${days.length} days)`);
}
