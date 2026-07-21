-- ============================================================
-- CafePilots: platform HQ + customer companies + subscriptions
-- ============================================================
-- Safe to re-run in Supabase SQL Editor.
--
-- Order (this file is self-contained):
--   1) Restore / seed Backbenchers (real customer — never merge into HQ)
--   2) Seed CafePilots HQ (platform owner / Super Admin tenant)
--   3) company_subscriptions schema + plan_id CHECK (Lite..Enterprise)
--   4) Seed default subscriptions
--   5) Attach Super Admin users to HQ (not Backbenchers)
--
-- Related (run separately if needed):
--   scripts/assign_orphans_to_hq.sql
--   scripts/saas_tenant_floor_patch.sql   -- floors.company_id only
--   scripts/phase2_enterprise_schema.sql  -- app_notifications, etc.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Backbenchers = real customer company
-- ------------------------------------------------------------
UPDATE public.companies
SET
  name = 'Backbenchers Cafeteria',
  subdomain = 'backbenchers',
  updated_at = NOW()
WHERE id = 'c1000000-0000-0000-0000-000000000001'
  AND (
    lower(name) IN ('cafepilots hq', 'cafepilots demo', 'cafepilots')
    OR subdomain IN ('cafepilots-hq')
  );

INSERT INTO public.companies (id, name, subdomain, is_active)
VALUES (
  'c1000000-0000-0000-0000-000000000001',
  'Backbenchers Cafeteria',
  'backbenchers',
  true
)
ON CONFLICT (id) DO UPDATE
SET
  name = CASE
    WHEN lower(companies.name) IN ('cafepilots hq', 'cafepilots demo', 'cafepilots')
      THEN 'Backbenchers Cafeteria'
    ELSE companies.name
  END,
  subdomain = CASE
    WHEN companies.subdomain IN ('cafepilots-hq') THEN 'backbenchers'
    ELSE COALESCE(companies.subdomain, 'backbenchers')
  END,
  is_active = true;

-- ------------------------------------------------------------
-- 2) CafePilots HQ = platform-owner company (Super Admin)
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

INSERT INTO public.company_subscriptions (company_id, plan_id, status)
VALUES ('c1000000-0000-0000-0000-000000000001', 'professional', 'active')
ON CONFLICT (company_id) DO NOTHING;

-- ------------------------------------------------------------
-- 5) Super Admin → CafePilots HQ (never Backbenchers)
-- ------------------------------------------------------------
UPDATE public.users
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE role = 'Super Admin'
  AND (
    company_id IS NULL
    OR company_id::text IN ('SYSTEM', 'default-company', '')
  );

UPDATE public.users
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE role = 'Super Admin'
  AND company_id::text = 'c1000000-0000-0000-0000-000000000001';
