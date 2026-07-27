-- ניקוי policies פתוחות ישנות אחרי remaining_rls_secure
-- הרץ עם Role = postgres

-- camps
DROP POLICY IF EXISTS "Public Access" ON public.camps;
DROP POLICY IF EXISTS "Allow public access to camps" ON public.camps;
DROP POLICY IF EXISTS "Allow anon access to camps" ON public.camps;
DROP POLICY IF EXISTS "camps_all" ON public.camps;

-- camp_compounds
DROP POLICY IF EXISTS "Public Access" ON public.camp_compounds;
DROP POLICY IF EXISTS "Allow public access to camp_compounds" ON public.camp_compounds;
DROP POLICY IF EXISTS "Allow anon access to camp_compounds" ON public.camp_compounds;
DROP POLICY IF EXISTS "camp_compounds_all" ON public.camp_compounds;

-- push_subscriptions
DROP POLICY IF EXISTS "push_subscriptions_all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Public Access" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow anon access to push_subscriptions" ON public.push_subscriptions;

-- notification_log
DROP POLICY IF EXISTS "notification_log_all" ON public.notification_log;
DROP POLICY IF EXISTS "Public Access" ON public.notification_log;

REVOKE ALL ON public.camps FROM anon;
REVOKE ALL ON public.camp_compounds FROM anon;
REVOKE ALL ON public.push_subscriptions FROM anon;
REVOKE ALL ON public.notification_log FROM anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.scheduled_followups') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public Access" ON public.scheduled_followups';
    EXECUTE 'DROP POLICY IF EXISTS "scheduled_followups_all" ON public.scheduled_followups';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon access to scheduled_followups" ON public.scheduled_followups';
    EXECUTE 'REVOKE ALL ON public.scheduled_followups FROM anon, authenticated';
  END IF;
END $$;

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'camps',
    'camp_compounds',
    'push_subscriptions',
    'notification_log',
    'scheduled_followups'
  )
ORDER BY tablename, policyname;
