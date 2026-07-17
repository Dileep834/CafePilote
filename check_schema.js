import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tzwczxjuseidiinbenpq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6d2N6eGp1c2VpZGlpbmJlbnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjA0NTIsImV4cCI6MjA5OTY5NjQ1Mn0.qUnET8lOjy2AIyeGkEVRaZKBVjCNcPiXm01vUFPPN6w'
);

async function checkSchema() {
  const tables = ['pos_orders', 'purchase_orders', 'stock_adjustments', 'daily_stock', 'inventory'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
    } else {
      if (data && data.length > 0) {
        console.log(`\nTable: ${table}`);
        console.log(Object.keys(data[0]).join(', '));
      } else {
        console.log(`\nTable: ${table} exists but is empty (cannot infer columns easily).`);
      }
    }
  }
}

checkSchema();
