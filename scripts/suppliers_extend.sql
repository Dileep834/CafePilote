-- Optional columns for premium Supplier onboarding.
-- Safe to re-run. Existing rows keep NULL defaults.

ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS pin_code TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS preferred_delivery_time TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS preferred_supplier BOOLEAN DEFAULT false;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
