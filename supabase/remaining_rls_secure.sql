-- RLS לשאר הטבלאות הפתוחות
-- הרץ עם Role = postgres
--
-- מכסה:
--   camps, camp_compounds
--   push_subscriptions
--   notification_log
--   scheduled_followups (אם קיימת)

-- ========== camps ==========
ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "camps_staff_all" ON public.camps;
DROP POLICY IF EXISTS "camps_instructor_select" ON public.camps;
DROP POLICY IF EXISTS "Public Access" ON public.camps;
DROP POLICY IF EXISTS "Allow public access to camps" ON public.camps;
DROP POLICY IF EXISTS "Allow anon access to camps" ON public.camps;
DROP POLICY IF EXISTS "camps_all" ON public.camps;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camps TO authenticated;
REVOKE ALL ON public.camps FROM anon;

CREATE POLICY "camps_staff_all"
ON public.camps
FOR ALL TO authenticated
USING (
  public.is_staff_management() = true
  OR public.is_staff_logistics() = true
)
WITH CHECK (
  public.is_staff_management() = true
  OR public.is_staff_logistics() = true
);

CREATE POLICY "camps_instructor_select"
ON public.camps
FOR SELECT TO authenticated
USING (public.is_staff_instructor() = true);

-- ========== camp_compounds ==========
ALTER TABLE public.camp_compounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compounds_staff_all" ON public.camp_compounds;
DROP POLICY IF EXISTS "compounds_instructor_select" ON public.camp_compounds;
DROP POLICY IF EXISTS "Public Access" ON public.camp_compounds;
DROP POLICY IF EXISTS "Allow public access to camp_compounds" ON public.camp_compounds;
DROP POLICY IF EXISTS "Allow anon access to camp_compounds" ON public.camp_compounds;
DROP POLICY IF EXISTS "camp_compounds_all" ON public.camp_compounds;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_compounds TO authenticated;
REVOKE ALL ON public.camp_compounds FROM anon;

CREATE POLICY "compounds_staff_all"
ON public.camp_compounds
FOR ALL TO authenticated
USING (
  public.is_staff_management() = true
  OR public.is_staff_logistics() = true
)
WITH CHECK (
  public.is_staff_management() = true
  OR public.is_staff_logistics() = true
);

CREATE POLICY "compounds_instructor_select"
ON public.camp_compounds
FOR SELECT TO authenticated
USING (public.is_staff_instructor() = true);

-- ========== push_subscriptions ==========
-- משתמש מחובר: רק השורות שלו. Edge Functions (service_role) עוקפים RLS.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_own_all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Public Access" ON public.push_subscriptions;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
REVOKE ALL ON public.push_subscriptions FROM anon;

CREATE POLICY "push_own_all"
ON public.push_subscriptions
FOR ALL TO authenticated
USING (username = public.current_app_username())
WITH CHECK (username = public.current_app_username());

-- ========== notification_log ==========
-- רק Edge Functions עם service_role — אין גישת לקוח
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_log_all" ON public.notification_log;
DROP POLICY IF EXISTS "Public Access" ON public.notification_log;

REVOKE ALL ON public.notification_log FROM anon, authenticated;

-- ========== scheduled_followups (אם קיימת) ==========
-- רגיש (טלפון + הודעה). אין שימוש בלקוח — נעילה מלאה ללקוחות.
DO $$
BEGIN
  IF to_regclass('public.scheduled_followups') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.scheduled_followups ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "scheduled_followups_all" ON public.scheduled_followups';
    EXECUTE 'DROP POLICY IF EXISTS "Public Access" ON public.scheduled_followups';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon access to scheduled_followups" ON public.scheduled_followups';

    -- אם בעתיד צריך גישת staff מהאפליקציה — להחליף ב-policies
    EXECUTE 'REVOKE ALL ON public.scheduled_followups FROM anon, authenticated';
  END IF;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- בדיקה
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  COALESCE((
    SELECT COUNT(*)
    FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  ), 0) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'camps',
    'camp_compounds',
    'push_subscriptions',
    'notification_log',
    'scheduled_followups'
  )
ORDER BY c.relname;

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
