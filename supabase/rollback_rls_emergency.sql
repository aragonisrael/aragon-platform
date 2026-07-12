-- Emergency rollback: restore pre-RLS behavior for affected tables.
-- Run once in Supabase Dashboard → SQL Editor → Run.
-- Expected: screens work again; Security Advisor RLS errors may return (that is OK for now).

BEGIN;

-- 1) Remove any RLS policies on the affected tables (if created)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'instructor_gear',
        'network_procurement',
        'coin_grant_requests',
        'procurement_budget',
        'scheduled_followups'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2) Disable RLS (back to open table access model)
ALTER TABLE IF EXISTS public.instructor_gear DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.network_procurement DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coin_grant_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.procurement_budget DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scheduled_followups DISABLE ROW LEVEL SECURITY;

-- 3) Restore default API grants for frontend (anon/authenticated)
GRANT ALL ON TABLE public.instructor_gear TO anon, authenticated;
GRANT ALL ON TABLE public.network_procurement TO anon, authenticated;
GRANT ALL ON TABLE public.coin_grant_requests TO anon, authenticated;
GRANT ALL ON TABLE public.procurement_budget TO anon, authenticated;
GRANT ALL ON TABLE public.scheduled_followups TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

COMMIT;

-- 4) Quick verification (should show rowsecurity = false)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'instructor_gear',
    'network_procurement',
    'coin_grant_requests',
    'procurement_budget',
    'scheduled_followups'
  )
ORDER BY tablename;
