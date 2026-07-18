-- Assign orphan / demo rows (missing company_id or outlet_id) to CafePilots HQ.
-- NEVER updates Backbenchers rows (company_id = c1000000-…).
-- Safe to re-run. UUID-safe (no comparing uuid columns to '').
--
-- Run in Supabase SQL editor after ensure_hq_company.sql

-- CafePilots HQ company: a1000000-0000-4000-8000-000000000001
-- HQ demo outlet:        a1000000-0000-4000-8000-000000000010
-- Legacy demo company:   72956d5e-3fac-4770-a07a-dda72961818c
-- Legacy demo outlet:    d81e2aab-02d8-40ca-9ddd-7e20719b3442

INSERT INTO public.companies (id, name, subdomain, is_active)
VALUES (
  'a1000000-0000-4000-8000-000000000001',
  'CafePilots HQ',
  'cafepilots-hq',
  true
)
ON CONFLICT (id) DO UPDATE
SET name = 'CafePilots HQ', subdomain = 'cafepilots-hq', is_active = true;

INSERT INTO public.outlets (id, code, name, location, is_active, company_id)
VALUES (
  'a1000000-0000-4000-8000-000000000010',
  'CP-HQ',
  'CafePilots HQ Demo',
  'Platform demo branch',
  true,
  'a1000000-0000-4000-8000-000000000001'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  company_id = 'a1000000-0000-4000-8000-000000000001',
  is_active = true;

UPDATE public.outlets
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE id = 'd81e2aab-02d8-40ca-9ddd-7e20719b3442'
   OR company_id::text = '72956d5e-3fac-4770-a07a-dda72961818c';

DO $$
DECLARE
  hq_company uuid := 'a1000000-0000-4000-8000-000000000001';
  hq_outlet  uuid := 'a1000000-0000-4000-8000-000000000010';
  legacy_outlet uuid := 'd81e2aab-02d8-40ca-9ddd-7e20719b3442';
  legacy_company uuid := '72956d5e-3fac-4770-a07a-dda72961818c';
  target_outlet uuid;
  target_outlet_text text;
  pos_outlet_udt text;
  dining_outlet_udt text;
  users_outlet_udt text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.outlets WHERE id = legacy_outlet) THEN
    target_outlet := legacy_outlet;
  ELSE
    target_outlet := hq_outlet;
  END IF;
  target_outlet_text := target_outlet::text;

  SELECT c.udt_name INTO pos_outlet_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'pos_orders' AND c.column_name = 'outlet_id';

  SELECT c.udt_name INTO dining_outlet_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'dining_tables' AND c.column_name = 'outlet_id';

  SELECT c.udt_name INTO users_outlet_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'users' AND c.column_name = 'outlet_id';

  -- PRODUCTS / CATEGORIES: null company only
  UPDATE public.products SET company_id = hq_company WHERE company_id IS NULL;
  UPDATE public.categories SET company_id = hq_company WHERE company_id IS NULL;

  BEGIN
    UPDATE public.suppliers SET company_id = hq_company WHERE company_id IS NULL;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  BEGIN
    UPDATE public.recipes SET company_id = hq_company WHERE company_id IS NULL;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  -- USERS: null / legacy demo company → HQ
  UPDATE public.users
  SET company_id = hq_company
  WHERE company_id IS NULL
     OR company_id = legacy_company;

  -- USERS outlet: UUID columns → only IS NULL; text columns can match placeholders
  IF users_outlet_udt = 'uuid' THEN
    UPDATE public.users
    SET outlet_id = target_outlet
    WHERE outlet_id IS NULL
      AND (company_id IS NULL OR company_id IN (hq_company, legacy_company));
  ELSE
    UPDATE public.users
    SET outlet_id = target_outlet_text
    WHERE (outlet_id IS NULL OR outlet_id::text IN ('current-outlet', 'current_outlet'))
      AND (company_id IS NULL OR company_id IN (hq_company, legacy_company));
  END IF;

  -- POS ORDERS: uuid-safe
  IF pos_outlet_udt = 'uuid' THEN
    UPDATE public.pos_orders
    SET outlet_id = target_outlet
    WHERE outlet_id IS NULL;
  ELSE
    UPDATE public.pos_orders
    SET outlet_id = target_outlet_text
    WHERE outlet_id IS NULL
       OR outlet_id::text IN ('current-outlet', 'current_outlet');
  END IF;

  -- DINING TABLES: usually text (allows 'current-outlet')
  IF dining_outlet_udt = 'uuid' THEN
    UPDATE public.dining_tables d
    SET outlet_id = target_outlet
    WHERE d.outlet_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.dining_tables x
        WHERE x.outlet_id = target_outlet
          AND x.table_number = d.table_number
          AND x.id <> d.id
      );
  ELSE
    UPDATE public.dining_tables d
    SET outlet_id = target_outlet_text
    WHERE (d.outlet_id IS NULL OR d.outlet_id::text IN ('current-outlet', 'current_outlet'))
      AND NOT EXISTS (
        SELECT 1 FROM public.dining_tables x
        WHERE x.outlet_id::text = target_outlet_text
          AND x.table_number = d.table_number
          AND x.id <> d.id
      );

    DELETE FROM public.dining_tables
    WHERE outlet_id::text IN ('current-outlet', 'current_outlet');
  END IF;

  -- GUEST SESSIONS (text columns)
  BEGIN
    UPDATE public.guest_sessions
    SET
      outlet_id = COALESCE(
        NULLIF(outlet_id, 'current-outlet'),
        NULLIF(outlet_id, 'current_outlet'),
        target_outlet_text
      ),
      company_id = COALESCE(company_id, hq_company::text)
    WHERE outlet_id IS NULL
       OR company_id IS NULL
       OR outlet_id::text IN ('current-outlet', 'current_outlet');
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    UPDATE public.floors
    SET company_id = hq_company::text
    WHERE company_id IS NULL OR company_id = '';
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  BEGIN
    UPDATE public.floor_layouts
    SET company_id = hq_company::text
    WHERE company_id IS NULL OR company_id = '';
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;

  RAISE NOTICE 'Orphan demo rows assigned to CafePilots HQ outlet %', target_outlet;
END $$;
