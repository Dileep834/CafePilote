-- Open CRM + guest session writes for demo seeding (safe to re-run).
-- Run in Supabase SQL editor, then re-run: node scripts/seed_cafepilots_demo_branch.mjs

ALTER TABLE public.guest_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

-- Keep permissive policies if RLS is turned back on later
DO $$
BEGIN
  BEGIN
    CREATE POLICY "customers_all_demo" ON public.customers FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "guest_sessions_all_demo" ON public.guest_sessions FOR ALL USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
