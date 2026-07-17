import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const missingSupabaseConfig =
  !supabaseUrl?.trim() || !supabaseAnonKey?.trim();

export const supabaseConfigError = missingSupabaseConfig
  ? 'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your host (e.g. Vercel) and redeploy.'
  : null;

/**
 * Always create a client so module import never crashes the app.
 * When env vars are missing, requests will fail with a clear config error UI instead of a blank page.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl?.trim() || 'https://placeholder.supabase.co',
  supabaseAnonKey?.trim() || 'public-anon-key-placeholder'
);
