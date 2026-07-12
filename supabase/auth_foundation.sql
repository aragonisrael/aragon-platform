-- שלב 1: בסיס זהות אמיתית להנהלה + אדמין
-- אם מקבלים "must be owner of table users" — אל תריץ את הקובץ הזה במלואו.
-- במקום זאת הרץ לפי הסדר:
--   1) auth_foundation_1_column.sql
--   2) auth_foundation_2_link.sql
--   3) auth_foundation_3_functions.sql
--
-- לפני כן:
-- 1) Authentication → Providers → Email מופעל
-- 2) Confirm email כבוי / משתמשים נוצרו עם Auto confirm
-- 3) Authentication → Users נוצרו עם אימייל: <username>@aragon.auth

-- קישור בין Auth לטבלת המשתמשים של האפליקציה
-- בלי Foreign Key ל-auth.users (כדי להימנע מבעיות הרשאה)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
  ON public.users(auth_user_id);

-- קישור אוטומטי לפי האימייל הסינתטי: username@aragon.auth
UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE lower(a.email) = lower(u.username) || '@aragon.auth'
  AND u.role IN ('admin', 'management')
  AND (u.auth_user_id IS DISTINCT FROM a.id);

-- תפקיד המשתמש המחובר (לשימוש ב-RLS בהמשך)
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

-- האם המחובר הוא הנהלה או אדמין
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

-- בדיקה
SELECT username, role, auth_user_id
FROM public.users
WHERE role IN ('admin', 'management')
ORDER BY role, username;
