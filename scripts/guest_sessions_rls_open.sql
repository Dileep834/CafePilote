-- Allow demo seeding + QR guest presence writes (safe to re-run).
ALTER TABLE public.guest_sessions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guest_sessions_all" ON public.guest_sessions;
-- If RLS is re-enabled later, keep a permissive policy for the app key:
-- ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "guest_sessions_all" ON public.guest_sessions FOR ALL USING (true) WITH CHECK (true);
