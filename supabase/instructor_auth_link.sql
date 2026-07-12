-- קישור מדריכים ל-Auth + פונקציות הרשאה
-- הרץ עם Role = postgres
-- אחרי שיצרת את כל משתמשי ה-Auth לפי list_instructors_for_auth.sql

-- קישור לפי אימייל ASCII רגיל: username@aragon.auth
UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE u.role IN ('instructor', 'temp_instructor')
  AND u.username ~ '^[a-zA-Z0-9._+-]+$'
  AND lower(a.email) = lower(u.username) || '@aragon.auth'
  AND (u.auth_user_id IS DISTINCT FROM a.id);

-- קישור לפי uid{id}@aragon.auth לשמות לא-ASCII
UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE u.role IN ('instructor', 'temp_instructor')
  AND u.username !~ '^[a-zA-Z0-9._+-]+$'
  AND lower(a.email) = 'uid' || u.id::text || '@aragon.auth'
  AND (u.auth_user_id IS DISTINCT FROM a.id);

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

-- בדיקה
SELECT username, role, auth_user_id
FROM public.users
WHERE role IN ('instructor', 'temp_instructor')
ORDER BY auth_user_id NULLS FIRST, username;
