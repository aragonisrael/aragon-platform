-- שלב 1C: פונקציות עזר ל-RLS בהמשך
-- הרץ רק אחרי ש-1B הצליח

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_management()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'management')
  );
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff_management() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_management() TO anon, authenticated;
