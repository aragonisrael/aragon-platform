-- לוגיסטיקה: פונקציית הרשאה + קישור Auth
-- הרץ עם Role = postgres
--
-- לפני כן ב-Auth → Users → Add user:
--   Email: logistics@aragon.auth
--   Password: אותה סיסמה של המשתמש "לוגיסטיקה" באפליקציה (למשל 12345678)
--   Auto confirm: מסומן

-- קישור המשתמש העברי לחשבון Auth באנגלית
UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE u.username = 'לוגיסטיקה'
  AND lower(a.email) = 'logistics@aragon.auth'
  AND (u.auth_user_id IS DISTINCT FROM a.id);

-- האם המחובר הוא לוגיסטיקה או אדמין
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

-- בדיקה
SELECT username, role, auth_user_id
FROM public.users
WHERE username = 'לוגיסטיקה' OR role = 'logistics';
