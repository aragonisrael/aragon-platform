-- policies חשודות (פתוחות מדי)
-- הרץ עם Role = postgres

SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    policyname ILIKE '%public%'
    OR policyname ILIKE '%anon%'
    OR policyname ILIKE '%allow%'
    OR qual = 'true'
    OR with_check = 'true'
  )
ORDER BY tablename, policyname;
