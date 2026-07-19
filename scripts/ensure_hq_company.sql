-- CafePilots: separate platform HQ from real customer companies
-- Backbenchers is a REAL customer — never rename/merge their company into HQ.
-- Safe to re-run.

-- 1) Restore Backbenchers if a previous script renamed them to CafePilots HQ
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

-- 2) CafePilots HQ = separate platform-owner company (Super Admin)
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

-- Create subscriptions table if missing (was only in saas_tenant_floor_patch)
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  company_id text PRIMARY KEY,
  plan_id text NOT NULL DEFAULT 'professional'
    CHECK (plan_id IN ('lite', 'starter', 'professional', 'growth', 'enterprise')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  seats int,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_subscriptions
  DROP CONSTRAINT IF EXISTS company_subscriptions_plan_id_check;

ALTER TABLE public.company_subscriptions
  ADD CONSTRAINT company_subscriptions_plan_id_check
  CHECK (plan_id IN ('lite', 'starter', 'professional', 'growth', 'enterprise'));

ALTER TABLE public.company_subscriptions
  ALTER COLUMN plan_id SET DEFAULT 'professional';

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'company_subscriptions' AND policyname = 'company_subscriptions_all'
  ) THEN
    CREATE POLICY company_subscriptions_all ON public.company_subscriptions
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO public.company_subscriptions (company_id, plan_id, status)
VALUES ('a1000000-0000-4000-8000-000000000001', 'enterprise', 'active')
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO public.company_subscriptions (company_id, plan_id, status)
VALUES ('c1000000-0000-0000-0000-000000000001', 'professional', 'active')
ON CONFLICT (company_id) DO NOTHING;

-- 3) Super Admin with SYSTEM/null → CafePilots HQ (not Backbenchers)
UPDATE public.users
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE role = 'Super Admin'
  AND (
    company_id IS NULL
    OR company_id::text IN ('SYSTEM', 'default-company', '')
  );

-- Move Super Admin wrongly attached to Backbenchers UUID → HQ only
-- (does not move Backbenchers Admin/Staff)
UPDATE public.users
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE role = 'Super Admin'
  AND company_id::text = 'c1000000-0000-0000-0000-000000000001';
