-- ============================================================
-- CafePilots: company_subscriptions (canonical, idempotent)
-- ============================================================
-- Fixes stale plan_id CHECK constraints that block Lite / Professional.
-- Safe to re-run in Supabase SQL Editor.
--
-- Allowed plan_id values (app):
--   lite | starter | professional | growth | enterprise
-- Note: UI "Standard" maps to plan_id = 'starter'
-- ============================================================

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  company_id  text PRIMARY KEY,
  plan_id     text NOT NULL DEFAULT 'professional',
  status      text NOT NULL DEFAULT 'active',
  seats       int,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'company_subscriptions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%plan_id%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.company_subscriptions DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.company_subscriptions
  DROP CONSTRAINT IF EXISTS company_subscriptions_plan_id_check;

ALTER TABLE public.company_subscriptions
  ADD CONSTRAINT company_subscriptions_plan_id_check
  CHECK (plan_id IN ('lite', 'starter', 'professional', 'growth', 'enterprise'));

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'company_subscriptions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
      AND c.conname <> 'company_subscriptions_plan_id_check'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.company_subscriptions DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.company_subscriptions
  DROP CONSTRAINT IF EXISTS company_subscriptions_status_check;

ALTER TABLE public.company_subscriptions
  ADD CONSTRAINT company_subscriptions_status_check
  CHECK (status IN ('active', 'trialing', 'past_due', 'canceled'));

ALTER TABLE public.company_subscriptions
  ALTER COLUMN plan_id SET DEFAULT 'professional';

ALTER TABLE public.company_subscriptions
  ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_subscriptions'
      AND policyname = 'company_subscriptions_all'
  ) THEN
    CREATE POLICY company_subscriptions_all ON public.company_subscriptions
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
