-- Isolate vouchers by company (prevents HQ ↔ Backbenchers promo leak).
-- Safe to re-run.

ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS company_id text;

CREATE INDEX IF NOT EXISTS vouchers_company_idx
  ON public.vouchers (company_id);

UPDATE public.vouchers
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE company_id IS NULL;
