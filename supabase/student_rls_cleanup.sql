-- ניקוי policies פתוחות ישנות אחרי student_rls_secure
-- הרץ עם Role = postgres

-- users
DROP POLICY IF EXISTS "Allow public access to users table" ON public.users;
DROP POLICY IF EXISTS "Public Access" ON public.users;

-- products
DROP POLICY IF EXISTS "Public Access" ON public.products;
DROP POLICY IF EXISTS "Allow public access to products" ON public.products;
DROP POLICY IF EXISTS "Allow anon access to products" ON public.products;

-- orders
DROP POLICY IF EXISTS "Public Access" ON public.orders;
DROP POLICY IF EXISTS "Allow public access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous read and write" ON public.orders;

-- admin_tasks
DROP POLICY IF EXISTS "Public Access" ON public.admin_tasks;
DROP POLICY IF EXISTS "Allow public access to admin_tasks" ON public.admin_tasks;
DROP POLICY IF EXISTS "Allow anon access to admin_tasks" ON public.admin_tasks;

-- groups
DROP POLICY IF EXISTS "Public Access" ON public.groups;
DROP POLICY IF EXISTS "Allow public access to groups" ON public.groups;
DROP POLICY IF EXISTS "Allow anon access to groups" ON public.groups;

REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.products FROM anon;
REVOKE ALL ON public.admin_tasks FROM anon;
REVOKE ALL ON public.groups FROM anon;

-- users: anon נשאר רק SELECT ללוגין
REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon;
GRANT SELECT ON public.users TO anon;

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'orders', 'products', 'admin_tasks', 'groups')
ORDER BY tablename, policyname;
