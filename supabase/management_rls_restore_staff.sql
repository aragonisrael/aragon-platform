-- החזרת RLS מלא להנהלה+אדמין בלבד
-- אחרי שווידאנו שהסשן עובד ב-Vercel
-- הרץ עם Role = postgres

DROP POLICY IF EXISTS "mgmt_meetings_tmp_auth" ON public.management_meetings;
DROP POLICY IF EXISTS "mgmt_agenda_tmp_auth" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mgmt_tasks_tmp_auth" ON public.management_tasks;
DROP POLICY IF EXISTS "mgmt_updates_tmp_auth" ON public.management_task_updates;

DROP POLICY IF EXISTS "mgmt_meetings_staff" ON public.management_meetings;
DROP POLICY IF EXISTS "mgmt_agenda_staff" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mgmt_tasks_staff" ON public.management_tasks;
DROP POLICY IF EXISTS "mgmt_updates_staff" ON public.management_task_updates;

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

CREATE POLICY "mgmt_meetings_staff"
ON public.management_meetings
FOR ALL TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

CREATE POLICY "mgmt_agenda_staff"
ON public.meeting_agenda_items
FOR ALL TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

CREATE POLICY "mgmt_tasks_staff"
ON public.management_tasks
FOR ALL TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

CREATE POLICY "mgmt_updates_staff"
ON public.management_task_updates
FOR ALL TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

-- בדיקה
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'management_meetings',
    'meeting_agenda_items',
    'management_tasks',
    'management_task_updates'
  )
ORDER BY tablename, policyname;
