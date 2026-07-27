-- הקמת פונקציות מדריך + RLS
-- הרץ עם Role = postgres

-- 1) פונקציות הרשאה
CREATE OR REPLACE FUNCTION public.is_staff_instructor()
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
      AND role IN ('instructor', 'temp_instructor')
  ) INTO ok;

  RETURN COALESCE(ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.current_app_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

ALTER FUNCTION public.is_staff_instructor() OWNER TO postgres;
ALTER FUNCTION public.current_app_username() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.is_staff_instructor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_app_username() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_instructor() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_app_username() TO anon, authenticated, service_role;

-- וידוא שפונקציית לוגיסטיקה קיימת (נדרשת ל-gear/faults)
CREATE OR REPLACE FUNCTION public.is_staff_logistics()
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
      AND role IN ('admin', 'logistics')
  ) INTO ok;

  RETURN COALESCE(ok, false);
END;
$$;

ALTER FUNCTION public.is_staff_logistics() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_staff_logistics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_logistics() TO anon, authenticated, service_role;

-- 2) instructor_gear
ALTER TABLE public.instructor_gear ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gear_staff_all" ON public.instructor_gear;
DROP POLICY IF EXISTS "gear_instructor_own" ON public.instructor_gear;
DROP POLICY IF EXISTS "Allow anon access to gear" ON public.instructor_gear;
DROP POLICY IF EXISTS "Allow public access to gear" ON public.instructor_gear;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_gear TO authenticated;
REVOKE ALL ON public.instructor_gear FROM anon;

CREATE POLICY "gear_staff_all"
ON public.instructor_gear
FOR ALL TO authenticated
USING (public.is_staff_logistics() = true)
WITH CHECK (public.is_staff_logistics() = true);

CREATE POLICY "gear_instructor_own"
ON public.instructor_gear
FOR SELECT TO authenticated
USING (
  public.is_staff_instructor() = true
  AND username = public.current_app_username()
);

-- 3) faults
ALTER TABLE public.faults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faults_staff_all" ON public.faults;
DROP POLICY IF EXISTS "faults_instructor_all" ON public.faults;
DROP POLICY IF EXISTS "Allow anon access to faults" ON public.faults;
DROP POLICY IF EXISTS "Allow public access to faults" ON public.faults;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faults TO authenticated;
REVOKE ALL ON public.faults FROM anon;

CREATE POLICY "faults_staff_all"
ON public.faults
FOR ALL TO authenticated
USING (public.is_staff_logistics() = true)
WITH CHECK (public.is_staff_logistics() = true);

CREATE POLICY "faults_instructor_all"
ON public.faults
FOR ALL TO authenticated
USING (public.is_staff_instructor() = true)
WITH CHECK (public.is_staff_instructor() = true);

-- 4) coin_grant_requests
ALTER TABLE public.coin_grant_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coin_req_admin_all" ON public.coin_grant_requests;
DROP POLICY IF EXISTS "coin_req_instructor_write" ON public.coin_grant_requests;
DROP POLICY IF EXISTS "coin_req_instructor_read" ON public.coin_grant_requests;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coin_grant_requests TO authenticated;
REVOKE ALL ON public.coin_grant_requests FROM anon;

CREATE POLICY "coin_req_admin_all"
ON public.coin_grant_requests
FOR ALL TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

CREATE POLICY "coin_req_instructor_read"
ON public.coin_grant_requests
FOR SELECT TO authenticated
USING (public.is_staff_instructor() = true);

CREATE POLICY "coin_req_instructor_write"
ON public.coin_grant_requests
FOR INSERT TO authenticated
WITH CHECK (public.is_staff_instructor() = true);

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- בדיקה
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('instructor_gear', 'faults', 'coin_grant_requests')
ORDER BY tablename, policyname;
