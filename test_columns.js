import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tzwczxjuseidiinbenpq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6d2N6eGp1c2VpZGlpbmJlbnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjA0NTIsImV4cCI6MjA5OTY5NjQ1Mn0.qUnET8lOjy2AIyeGkEVRaZKBVjCNcPiXm01vUFPPN6w'
);

async function testColumns() {
  const tables = ['pos_orders', 'purchase_orders', 'stock_adjustments', 'daily_stock', 'inventory'];
  
  for (const table of tables) {
    let hasCompanyId = false;
    let hasOutletId = false;

    const { error: cErr } = await supabase.from(table).select('company_id').limit(1);
    if (!cErr || cErr.code !== '42703') hasCompanyId = true;

    const { error: oErr } = await supabase.from(table).select('outlet_id').limit(1);
    if (!oErr || oErr.code !== '42703') hasOutletId = true;

    console.log(`Table: ${table} | hasCompanyId: ${hasCompanyId} | hasOutletId: ${hasOutletId}`);
  }
}

testColumns();
