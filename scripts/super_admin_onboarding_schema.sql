-- ============================================================
-- CafePilots: Super Admin company onboarding (idempotent)
-- ============================================================
-- Safe to re-run in Supabase SQL Editor.
--
-- BACKBENCHERS GUARANTEE
--   TENANT MAP:
--     CafePilots HQ  a1000000-0000-4000-8000-000000000001  ← DEMO + platform
--     Backbenchers   c1000000-0000-0000-0000-000000000001  ← REAL customer
--   This script is schema-only for new tables + additive columns.
--   It does NOT delete/update Backbenchers products, outlets, orders,
--   menus, users (non–Super Admin), or subscription plan.
--   Existing companies are marked onboarding "live" only when
--   onboarding_status is still NULL — so they do not appear as
--   "pending setup" after columns are added.
--
-- Prerequisites (recommended):
--   1) companies table          — scripts/saas_migration.sql / ensure_hq_company.sql
--   2) company_subscriptions    — scripts/company_subscriptions_schema.sql
--   3) (optional) phase3        — already adds trial_ends_at / billing_status
-- ============================================================

-- ------------------------------------------------------------
-- 1) Onboarding drafts (wizard autosave)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text,
  created_by text,
  draft_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
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
      AND t.relname = 'onboarding_drafts'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.onboarding_drafts DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.onboarding_drafts
  DROP CONSTRAINT IF EXISTS onboarding_drafts_status_check;

ALTER TABLE public.onboarding_drafts
  ADD CONSTRAINT onboarding_drafts_status_check
  CHECK (status IN ('draft', 'provisioning', 'setup', 'live', 'abandoned'));

CREATE INDEX IF NOT EXISTS onboarding_drafts_status_idx
  ON public.onboarding_drafts (status);

CREATE INDEX IF NOT EXISTS onboarding_drafts_company_idx
  ON public.onboarding_drafts (company_id);

ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'onboarding_drafts'
      AND policyname = 'onboarding_drafts_all'
  ) THEN
    CREATE POLICY onboarding_drafts_all ON public.onboarding_drafts
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.onboarding_drafts IS
  'Autosaved Super Admin company onboarding wizard drafts';

-- ------------------------------------------------------------
-- 2) Trial / lead requests
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trial_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  owner_name text,
  mobile text,
  email text,
  business_type text,
  city text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  converted_company_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
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
      AND t.relname = 'trial_requests'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.trial_requests DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.trial_requests
  DROP CONSTRAINT IF EXISTS trial_requests_status_check;

ALTER TABLE public.trial_requests
  ADD CONSTRAINT trial_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'converted'));

CREATE INDEX IF NOT EXISTS trial_requests_status_idx
  ON public.trial_requests (status);

CREATE INDEX IF NOT EXISTS trial_requests_converted_company_idx
  ON public.trial_requests (converted_company_id);

ALTER TABLE public.trial_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trial_requests'
      AND policyname = 'trial_requests_all'
  ) THEN
    CREATE POLICY trial_requests_all ON public.trial_requests
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.trial_requests IS
  'Inbound trial / lead requests for Super Admin queue';

-- ------------------------------------------------------------
-- 3) companies — extend base SaaS tenant row
--     Base columns today: id UUID, name, subdomain, is_active, created_at, updated_at
-- ------------------------------------------------------------
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS fssai text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS company_code text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS onboarding_status text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS onboarding_progress jsonb;

-- Defaults (safe if column already existed without default)
ALTER TABLE public.companies ALTER COLUMN country SET DEFAULT 'India';
ALTER TABLE public.companies ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';
ALTER TABLE public.companies ALTER COLUMN currency SET DEFAULT 'INR';
ALTER TABLE public.companies ALTER COLUMN language SET DEFAULT 'en';
ALTER TABLE public.companies ALTER COLUMN onboarding_status SET DEFAULT 'setup';
ALTER TABLE public.companies ALTER COLUMN onboarding_progress SET DEFAULT '{}'::jsonb;

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
      AND t.relname = 'companies'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%onboarding_status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_onboarding_status_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_onboarding_status_check
  CHECK (
    onboarding_status IS NULL
    OR onboarding_status IN ('draft', 'setup', 'live', 'abandoned')
  );

CREATE UNIQUE INDEX IF NOT EXISTS companies_company_code_uidx
  ON public.companies (company_code)
  WHERE company_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS companies_onboarding_status_idx
  ON public.companies (onboarding_status);

-- Existing tenants (Backbenchers, HQ, any live company) → mark live
-- ONLY when onboarding_status is still NULL. Never overwrite 'setup'
-- mid-wizard for newly created companies.
UPDATE public.companies
SET
  onboarding_status = 'live',
  onboarding_progress = COALESCE(
    onboarding_progress,
    jsonb_build_object(
      'companyCreated', true,
      'menuImported', true,
      'qrGenerated', true,
      'tablesCreated', true,
      'staffAdded', true,
      'taxesConfigured', true,
      'paymentSetup', true,
      'printerConnected', true,
      'inventoryEnabled', true,
      'kdsEnabled', true,
      'live', true
    )
  )
WHERE onboarding_status IS NULL
  AND id IN (
    'c1000000-0000-0000-0000-000000000001'::uuid,  -- Backbenchers (real customer)
    'a1000000-0000-4000-8000-000000000001'::uuid   -- CafePilots HQ (demo)
  );

-- Any other pre-existing company without onboarding flags → live (not pending)
UPDATE public.companies
SET
  onboarding_status = 'live',
  onboarding_progress = COALESCE(
    onboarding_progress,
    jsonb_build_object('companyCreated', true, 'live', true)
  )
WHERE onboarding_status IS NULL
  AND id NOT IN (
    'c1000000-0000-0000-0000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid
  )
  AND created_at < (NOW() - INTERVAL '1 hour');

-- ------------------------------------------------------------
-- 4) company_subscriptions — trial extensions
--     Already present in phase3_saas_schema.sql; IF NOT EXISTS keeps this safe.
--     Does NOT update Backbenchers plan_id / status rows.
-- ------------------------------------------------------------
ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS billing_status text;

ALTER TABLE public.company_subscriptions
  ALTER COLUMN billing_status SET DEFAULT 'active';

-- ------------------------------------------------------------
-- 5) Post-apply safety check (optional — uncomment to verify)
-- ------------------------------------------------------------
-- SELECT id, name, subdomain, is_active, onboarding_status, company_code
-- FROM public.companies
-- WHERE id = 'c1000000-0000-0000-0000-000000000001';
--
-- SELECT company_id, plan_id, status, billing_status
-- FROM public.company_subscriptions
-- WHERE company_id = 'c1000000-0000-0000-0000-000000000001';
