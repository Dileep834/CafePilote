-- 1. Add company_id to the new operations tables
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Backfill existing data to the default company
UPDATE public.suppliers SET company_id = 'c1000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.recipes SET company_id = 'c1000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.sales SET company_id = 'c1000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 3. Enforce NOT NULL
ALTER TABLE public.suppliers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.recipes ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.sales ALTER COLUMN company_id SET NOT NULL;
