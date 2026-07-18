-- Remove duplicate company: "CafePilot HQ" (typo/legacy) → keep "CafePilots HQ"
-- Does NOT touch Backbenchers Cafeteria.
-- Safe to re-run.

-- Old duplicate: 72956d5e-3fac-4770-a07a-dda72961818c  (CafePilot HQ / cafepilot)
-- Keep:          a1000000-0000-4000-8000-000000000001  (CafePilots HQ / cafepilots-hq)

-- Re-point any leftover FKs (usually already done)
UPDATE public.outlets
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE company_id::text = '72956d5e-3fac-4770-a07a-dda72961818c';

UPDATE public.users
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE company_id::text = '72956d5e-3fac-4770-a07a-dda72961818c';

UPDATE public.products
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE company_id::text = '72956d5e-3fac-4770-a07a-dda72961818c';

UPDATE public.categories
SET company_id = 'a1000000-0000-4000-8000-000000000001'
WHERE company_id::text = '72956d5e-3fac-4770-a07a-dda72961818c';

DELETE FROM public.company_subscriptions
WHERE company_id = '72956d5e-3fac-4770-a07a-dda72961818c';

DELETE FROM public.companies
WHERE id = '72956d5e-3fac-4770-a07a-dda72961818c';
