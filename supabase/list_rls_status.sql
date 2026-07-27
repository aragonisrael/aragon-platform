-- מיפוי מצב RLS לכל טבלאות public
-- הרץ עם Role = postgres

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
ORDER BY c.relrowsecurity ASC, c.relname;
