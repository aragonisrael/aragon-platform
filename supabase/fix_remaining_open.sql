-- תיקון מהיר לפי תוצאות האבחון
-- הרץ עם Role = postgres
--
-- 1) scheduled_followups — RLS עדיין כבוי
-- 2) notification_log — לוודא שאין policy פתוחה
-- 3) טבלאות בוט/צ'אט — לנעול אם יש USING (true)

-- ========== scheduled_followups ==========
ALTER TABLE public.scheduled_followups ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scheduled_followups'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.scheduled_followups', r.policyname);
  END LOOP;
END $$;

REVOKE ALL ON public.scheduled_followups FROM anon, authenticated;

-- ========== notification_log ==========
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notification_log'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notification_log', r.policyname);
  END LOOP;
END $$;

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_log FROM anon, authenticated;

-- ========== bot / chat / org_knowledge ==========
-- אין שימוש בלקוח האפליקציה — נעילה מלאה (service_role עדיין עוקף)
DO $$
DECLARE
  t text;
  r RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bot_knowledge_files',
    'bot_knowledge_texts',
    'bot_settings',
    'chat_messages',
    'service_chats',
    'org_knowledge'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;

    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- ========== אימות ==========
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
    'scheduled_followups',
    'notification_log',
    'bot_knowledge_files',
    'bot_knowledge_texts',
    'bot_settings',
    'chat_messages',
    'service_chats',
    'org_knowledge',
    'camps',
    'camp_compounds',
    'push_subscriptions'
  )
ORDER BY c.relname;

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;
