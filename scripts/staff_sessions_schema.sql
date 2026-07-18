-- CafePilots: staff login/logout session logs.
-- Run in Supabase SQL editor. Safe to re-run.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  company_id UUID,
  login_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  logout_time TIMESTAMPTZ,
  logout_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS logout_reason TEXT;

ALTER TABLE public.user_sessions
  DROP CONSTRAINT IF EXISTS user_sessions_logout_reason_check;

ALTER TABLE public.user_sessions
  ADD CONSTRAINT user_sessions_logout_reason_check
  CHECK (
    logout_reason IS NULL
    OR logout_reason IN ('manual', 'expired', 'replaced', 'invalid')
  );

CREATE INDEX IF NOT EXISTS user_sessions_user_idx
  ON public.user_sessions (user_id, login_time DESC);

CREATE INDEX IF NOT EXISTS user_sessions_active_idx
  ON public.user_sessions (user_id, logout_time)
  WHERE logout_time IS NULL;

CREATE INDEX IF NOT EXISTS user_sessions_company_idx
  ON public.user_sessions (company_id, login_time DESC);

ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
