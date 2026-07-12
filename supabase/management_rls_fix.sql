-- תיקון גישת הנהלה אחרי RLS
-- הרץ עם Role = postgres

-- 1) וידוא שהקישור תקין
SELECT
  u.username,
  u.role,
  u.auth_user_id,
  a.id AS auth_id,
  a.email
FROM public.users u
LEFT JOIN auth.users a ON a.id = u.auth_user_id
WHERE u.role IN ('admin', 'management')
ORDER BY u.role, u.username;

-- 2) יצירת הפונקציה מחדש (חזקה יותר)
CREATE OR REPLACE FUNCTION public.is_staff_management()
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
      AND role IN ('admin', 'management')
  ) INTO ok;

  RETURN COALESCE(ok, false);
END;
$$;

ALTER FUNCTION public.is_staff_management() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.is_staff_management() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_management() TO anon, authenticated, service_role;

-- 3) גם current_app_role מחדש
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

ALTER FUNCTION public.current_app_role() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO anon, authenticated, service_role;

-- 4) הרשאות רצף ל-insert
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5) חיזוק grants על טבלאות ההנהלה
GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_agenda_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_task_updates TO authenticated;

-- 6) יצירת policies מחדש (מפורשות יותר)
DROP POLICY IF EXISTS "mgmt_meetings_staff" ON public.management_meetings;
DROP POLICY IF EXISTS "mgmt_agenda_staff" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mgmt_tasks_staff" ON public.management_tasks;
DROP POLICY IF EXISTS "mgmt_updates_staff" ON public.management_task_updates;

CREATE POLICY "mgmt_meetings_staff"
ON public.management_meetings
FOR ALL
TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

CREATE POLICY "mgmt_agenda_staff"
ON public.meeting_agenda_items
FOR ALL
TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

CREATE POLICY "mgmt_tasks_staff"
ON public.management_tasks
FOR ALL
TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

CREATE POLICY "mgmt_updates_staff"
ON public.management_task_updates
FOR ALL
TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);
