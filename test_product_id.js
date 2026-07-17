import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tzwczxjuseidiinbenpq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6d2N6eGp1c2VpZGlpbmJlbnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjA0NTIsImV4cCI6MjA5OTY5NjQ1Mn0.qUnET8lOjy2AIyeGkEVRaZKBVjCNcPiXm01vUFPPN6w'
);

async function testProductId() {
  const { error } = await supabase.from('stock_adjustments').select('product_id').limit(1);
  console.log('Error:', error ? error.message : 'None, column exists!');
}

testProductId();
