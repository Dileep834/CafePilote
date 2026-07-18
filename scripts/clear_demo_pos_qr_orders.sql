-- Clear POS + QR order demo data (CafePilots HQ outlets only).
-- Does NOT delete Backbenchers orders.
-- Safe to re-run.
--
-- Related rows live on:
--   pos_orders       (open / sent kitchen / completed / held — POS + QR)
--   pos_order_items
--   guest_sessions   (QR signed-in guests)

-- HQ / demo outlet ids
--   d81e2aab-02d8-40ca-9ddd-7e20719b3442  CafePilot Main Branch
--   a1000000-0000-4000-8000-000000000010  CafePilots HQ Demo

BEGIN;

-- 1) Delete line items for demo orders first (FK safety)
DELETE FROM public.pos_order_items
WHERE order_id IN (
  SELECT id FROM public.pos_orders
  WHERE outlet_id::text IN (
    'd81e2aab-02d8-40ca-9ddd-7e20719b3442',
    'a1000000-0000-4000-8000-000000000010',
    'current-outlet'
  )
  OR outlet_id IS NULL
);

-- 2) Delete demo POS + QR orders (all statuses: open / sent / completed / held)
DELETE FROM public.pos_orders
WHERE outlet_id::text IN (
  'd81e2aab-02d8-40ca-9ddd-7e20719b3442',
  'a1000000-0000-4000-8000-000000000010',
  'current-outlet'
)
OR outlet_id IS NULL;

-- 3) Clear QR guest sessions on demo outlets (table may not exist on older DBs)
DO $$
BEGIN
  DELETE FROM public.guest_sessions
  WHERE outlet_id IS NULL
     OR outlet_id::text IN (
       'd81e2aab-02d8-40ca-9ddd-7e20719b3442',
       'a1000000-0000-4000-8000-000000000010',
       'current-outlet'
     )
     OR company_id::text = 'a1000000-0000-4000-8000-000000000001';
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- 4) Reset demo dining tables to available (optional cleanup)
UPDATE public.dining_tables
SET status = 'available'
WHERE outlet_id::text IN (
  'd81e2aab-02d8-40ca-9ddd-7e20719b3442',
  'a1000000-0000-4000-8000-000000000010'
)
AND EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dining_tables'
    AND column_name = 'status'
);

COMMIT;

-- ---------------------------------------------------------------------------
-- OPTIONAL — wipe ALL POS/QR orders everywhere (including Backbenchers).
-- Uncomment ONLY if you intentionally want a full reset:
--
-- BEGIN;
-- TRUNCATE TABLE public.pos_order_items, public.pos_orders RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE public.guest_sessions RESTART IDENTITY CASCADE;  -- if exists
-- COMMIT;
-- ---------------------------------------------------------------------------
