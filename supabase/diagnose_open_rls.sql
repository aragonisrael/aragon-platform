-- אבחון: מה עדיין פתוח מדי
-- הרץ עם Role = postgres

-- 1) RLS כבוי
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
ORDER BY c.relname;

-- 2) policies עם USING/WITH CHECK = true (פתוחות)
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;

-- 3) notification_log + scheduled_followups ספציפית
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('notification_log', 'scheduled_followups', 'bot_knowledge_files', 'bot_knowledge_texts', 'bot_settings', 'chat_messages', 'service_chats', 'org_knowledge')
ORDER BY tablename, policyname;
