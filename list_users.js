import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tzwczxjuseidiinbenpq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6d2N6eGp1c2VpZGlpbmJlbnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjA0NTIsImV4cCI6MjA5OTY5NjQ1Mn0.qUnET8lOjy2AIyeGkEVRaZKBVjCNcPiXm01vUFPPN6w'
);

async function listUsers() {
  const { data, error } = await supabase.from('users').select('*');
  
  if (error) {
    console.error('Error fetching users:', error.message);
  } else {
    console.log("ALL USERS IN DB:");
    data.forEach(u => console.log(u.email));
    
    console.log("\nBACKBENCHERS USERS:");
    const bbUsers = data.filter(u => 
      (u.email && u.email.toLowerCase().includes('bench')) || 
      (u.name && u.name.toLowerCase().includes('bench'))
    );
    console.log(JSON.stringify(bbUsers, null, 2));
  }
}

listUsers();
