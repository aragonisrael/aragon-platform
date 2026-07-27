-- RLS לתלמידים + טבלאות משותפות
-- הרץ עם Role = postgres
-- רק אחרי שווידאנו שהתחברות תלמיד עובדת

-- פונקציות עזר
CREATE OR REPLACE FUNCTION public.is_app_student()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  ok boolean;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = uid
      AND role = 'student'
  ) INTO ok;

  RETURN COALESCE(ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.current_app_full_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

ALTER FUNCTION public.is_app_student() OWNER TO postgres;
ALTER FUNCTION public.current_app_full_name() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_app_student() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_app_full_name() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_student() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_app_full_name() TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========== users ==========
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_anon_select" ON public.users;
DROP POLICY IF EXISTS "users_auth_select" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;
DROP POLICY IF EXISTS "users_staff_insert" ON public.users;
DROP POLICY IF EXISTS "users_staff_update" ON public.users;
DROP POLICY IF EXISTS "users_admin_delete" ON public.users;

GRANT SELECT ON public.users TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- Login עדיין קורא users לפני Auth — לכן SELECT ל-anon נשאר
CREATE POLICY "users_anon_select"
ON public.users FOR SELECT TO anon
USING (true);

CREATE POLICY "users_auth_select"
ON public.users FOR SELECT TO authenticated
USING (true);

CREATE POLICY "users_self_update"
ON public.users FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "users_staff_insert"
ON public.users FOR INSERT TO authenticated
WITH CHECK (
  public.is_staff_instructor() = true
  OR public.is_staff_management() = true
);

CREATE POLICY "users_staff_update"
ON public.users FOR UPDATE TO authenticated
USING (
  public.is_staff_instructor() = true
  OR public.is_staff_management() = true
  OR public.is_staff_logistics() = true
)
WITH CHECK (
  public.is_staff_instructor() = true
  OR public.is_staff_management() = true
  OR public.is_staff_logistics() = true
);

CREATE POLICY "users_admin_delete"
ON public.users FOR DELETE TO authenticated
USING (public.is_staff_management() = true);

-- ========== orders ==========
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_student_select" ON public.orders;
DROP POLICY IF EXISTS "orders_student_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_staff_all" ON public.orders;
DROP POLICY IF EXISTS "Allow anon access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anonymous read and write" ON public.orders;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
REVOKE ALL ON public.orders FROM anon;

CREATE POLICY "orders_student_select"
ON public.orders FOR SELECT TO authenticated
USING (
  public.is_app_student() = true
  AND student = public.current_app_full_name()
);

CREATE POLICY "orders_student_insert"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  public.is_app_student() = true
  AND student = public.current_app_full_name()
);

CREATE POLICY "orders_staff_all"
ON public.orders FOR ALL TO authenticated
USING (
  public.is_staff_instructor() = true
  OR public.is_staff_management() = true
)
WITH CHECK (
  public.is_staff_instructor() = true
  OR public.is_staff_management() = true
);

-- ========== products ==========
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_auth_select" ON public.products;
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
DROP POLICY IF EXISTS "Allow anon access to products" ON public.products;
DROP POLICY IF EXISTS "Allow public access to products" ON public.products;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
REVOKE ALL ON public.products FROM anon;

CREATE POLICY "products_auth_select"
ON public.products FOR SELECT TO authenticated
USING (true);

CREATE POLICY "products_admin_write"
ON public.products FOR ALL TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

-- ========== admin_tasks ==========
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_tasks_auth_select" ON public.admin_tasks;
DROP POLICY IF EXISTS "admin_tasks_staff_write" ON public.admin_tasks;
DROP POLICY IF EXISTS "Allow anon access to admin_tasks" ON public.admin_tasks;
DROP POLICY IF EXISTS "Allow public access to admin_tasks" ON public.admin_tasks;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_tasks TO authenticated;
REVOKE ALL ON public.admin_tasks FROM anon;

CREATE POLICY "admin_tasks_auth_select"
ON public.admin_tasks FOR SELECT TO authenticated
USING (true);

CREATE POLICY "admin_tasks_staff_write"
ON public.admin_tasks FOR ALL TO authenticated
USING (
  public.is_staff_instructor() = true
  OR public.is_staff_management() = true
)
WITH CHECK (
  public.is_staff_instructor() = true
  OR public.is_staff_management() = true
);

-- ========== groups ==========
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_auth_select" ON public.groups;
DROP POLICY IF EXISTS "groups_staff_write" ON public.groups;
DROP POLICY IF EXISTS "Allow anon access to groups" ON public.groups;
DROP POLICY IF EXISTS "Allow public access to groups" ON public.groups;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
REVOKE ALL ON public.groups FROM anon;

CREATE POLICY "groups_auth_select"
ON public.groups FOR SELECT TO authenticated
USING (true);

CREATE POLICY "groups_staff_write"
ON public.groups FOR ALL TO authenticated
USING (
  public.is_staff_instructor() = true
  OR public.is_staff_management() = true
)
WITH CHECK (
  public.is_staff_instructor() = true
  OR public.is_staff_management() = true
);

-- בדיקה
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'orders', 'products', 'admin_tasks', 'groups')
ORDER BY tablename, policyname;
