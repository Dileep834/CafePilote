import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tzwczxjuseidiinbenpq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6d2N6eGp1c2VpZGlpbmJlbnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjA0NTIsImV4cCI6MjA5OTY5NjQ1Mn0.qUnET8lOjy2AIyeGkEVRaZKBVjCNcPiXm01vUFPPN6w'
);

async function dumpColumns() {
  const { data, error } = await supabase.from('stock_adjustments').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

dumpColumns();
