-- ניקוי policy פתוח ישן על faults
-- הרץ עם Role = postgres

DROP POLICY IF EXISTS "Allow anonymous read and write" ON public.faults;
DROP POLICY IF EXISTS "Allow anon access to faults" ON public.faults;
DROP POLICY IF EXISTS "Allow public access to faults" ON public.faults;

REVOKE ALL ON public.faults FROM anon;
REVOKE ALL ON public.instructor_gear FROM anon;
REVOKE ALL ON public.coin_grant_requests FROM anon;

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('instructor_gear', 'faults', 'coin_grant_requests')
ORDER BY tablename, policyname;
