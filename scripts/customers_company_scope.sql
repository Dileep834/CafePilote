-- Add company scoping to customers (CRM) to stop cross-tenant guest directory leaks.
-- Safe to re-run.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company_id text;

CREATE INDEX IF NOT EXISTS customers_company_idx
  ON public.customers (company_id);

-- Existing guests without company → CafePilots HQ (demo), not Backbenchers
UPDATE public.customers
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE company_id IS NULL;
