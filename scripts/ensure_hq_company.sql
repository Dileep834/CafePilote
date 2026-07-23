-- ============================================================
-- CafePilots: platform HQ + customer companies + subscriptions
-- ============================================================
-- Safe to re-run in Supabase SQL Editor.
--
-- TENANT MAP (do not confuse)
--   CafePilots HQ  a1000000-0000-4000-8000-000000000001  ← DEMO + platform owner
--                  subdomain: cafepilots-hq
--   Backbenchers   c1000000-0000-0000-0000-000000000001  ← REAL customer (protect)
--                  subdomain: backbenchers
--
-- BACKBENCHERS GUARANTEE
--   This script NEVER:
--     • renames / re-subdomains Backbenchers when already correct
--     • overwrites Backbenchers subscription plan/status
--     • moves Backbenchers outlets / products / orders / menus
--     • deletes any Backbenchers rows
--   Demo / Super Admin work uses CafePilots HQ only.
--
-- Order (this file is self-contained):
--   1) Ensure Backbenchers row exists (insert-only if missing)
--   2) Seed CafePilots HQ demo / platform company
--   3) company_subscriptions schema + plan_id CHECK (Lite..Enterprise)
--   4) Seed default subscriptions (DO NOTHING if plan already set)
--   5) Attach Super Admin users to CafePilots HQ (not Backbenchers)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Backbenchers = real customer company (protect existing data)
-- ------------------------------------------------------------
-- Insert only when the fixed UUID is missing. Do not rewrite
-- name / subdomain / is_active / onboarding fields on re-run.
INSERT INTO public.companies (id, name, subdomain, is_active)
VALUES (
  'c1000000-0000-0000-0000-000000000001',
  'Backbenchers Cafeteria',
  'backbenchers',
  true
)
ON CONFLICT (id) DO NOTHING;

-- One-time repair ONLY if this UUID was wrongly labeled as HQ/demo.
-- Does nothing when name/subdomain are already Backbenchers.
UPDATE public.companies
SET
  name = 'Backbenchers Cafeteria',
  subdomain = 'backbenchers',
  updated_at = NOW()
WHERE id = 'c1000000-0000-0000-0000-000000000001'
  AND (
    lower(COALESCE(name, '')) IN ('cafepilots hq', 'cafepilots demo', 'cafepilots')
    OR COALESCE(subdomain, '') IN ('cafepilots-hq')
  );

-- ------------------------------------------------------------
-- 2) CafePilots HQ = DEMO company + platform owner (Super Admin)
-- ------------------------------------------------------------
INSERT INTO public.companies (id, name, subdomain, is_active)
VALUES (
  'a1000000-0000-4000-8000-000000000001',
  'CafePilots HQ',
  'cafepilots-hq',
  true
)
ON CONFLICT (id) DO UPDATE
SET
  name = 'CafePilots HQ',
  subdomain = 'cafepilots-hq',
  is_active = true;

-- ------------------------------------------------------------
-- 3) Subscriptions table + refresh plan_id CHECK
--     (same logic as company_subscriptions_schema.sql)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  company_id  text PRIMARY KEY,
  plan_id     text NOT NULL DEFAULT 'professional',
  status      text NOT NULL DEFAULT 'active',
  seats       int,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Drop ALL plan_id checks (stale inline CHECKs block Lite / Professional)
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

-- ------------------------------------------------------------
-- 4) Seed default subscriptions (do not overwrite existing plans)
-- ------------------------------------------------------------
INSERT INTO public.company_subscriptions (company_id, plan_id, status)
VALUES ('a1000000-0000-4000-8000-000000000001', 'enterprise', 'active')
ON CONFLICT (company_id) DO NOTHING;

-- Backbenchers: insert professional ONLY if no row exists — never change plan
INSERT INTO public.company_subscriptions (company_id, plan_id, status)
VALUES ('c1000000-0000-0000-0000-000000000001', 'professional', 'active')
ON CONFLICT (company_id) DO NOTHING;

-- ------------------------------------------------------------
-- 5) Super Admin → CafePilots HQ (never Backbenchers)
--     Only moves Super Admin role users with unset / placeholder /
--     wrongly-attached-to-Backbenchers company_id.
--     Does NOT touch Admin / Manager / Cashier / Staff of Backbenchers.
-- ------------------------------------------------------------
UPDATE public.users
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE role = 'Super Admin'
  AND (
    company_id IS NULL
    OR company_id::text IN ('SYSTEM', 'default-company', '')
    OR company_id::text = 'c1000000-0000-0000-0000-000000000001'
  );
