-- CafePilots: live dine-in guest sessions (QR login presence)
-- Run in Supabase SQL editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.guest_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id TEXT,
  table_id TEXT,
  table_number TEXT,
  guest_email TEXT NOT NULL,
  guest_name TEXT,
  guest_id TEXT,
  provider TEXT DEFAULT 'email',
  company_id TEXT,
  auth_user_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS guest_sessions_active_idx
  ON public.guest_sessions (outlet_id, ended_at)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS guest_sessions_email_idx
  ON public.guest_sessions (guest_email);

CREATE UNIQUE INDEX IF NOT EXISTS guest_sessions_one_active_per_email_table
  ON public.guest_sessions (guest_email, table_id)
  WHERE ended_at IS NULL AND table_id IS NOT NULL;

ALTER TABLE public.guest_sessions DISABLE ROW LEVEL SECURITY;

-- Ensure customers can be found by email for auto-upsert from guest login
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique
  ON public.customers (lower(email))
  WHERE email IS NOT NULL AND email <> '';
