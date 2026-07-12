-- בדיקת אבחון: האם הבעיה היא הסשן או פונקציית ההרשאה?
-- הרץ עם Role = postgres

-- א. האם ל-users יש RLS?
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE oid = 'public.users'::regclass;

-- ב. האם הפונקציה קיימת ומי הבעלים?
SELECT
  p.proname,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'is_staff_management';

-- ג. פתיחה זמנית לבדיקה: כל משתמש Auth מחובר יכול לגשת
-- אם אחרי זה hey רואה משימות → הסשן תקין, והבעיה בפונקציה
-- אם עדיין לא → האפליקציה שולחת בקשות בלי סשן Auth

DROP POLICY IF EXISTS "mgmt_meetings_staff" ON public.management_meetings;
DROP POLICY IF EXISTS "mgmt_agenda_staff" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mgmt_tasks_staff" ON public.management_tasks;
DROP POLICY IF EXISTS "mgmt_updates_staff" ON public.management_task_updates;

DROP POLICY IF EXISTS "mgmt_meetings_tmp_auth" ON public.management_meetings;
DROP POLICY IF EXISTS "mgmt_agenda_tmp_auth" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mgmt_tasks_tmp_auth" ON public.management_tasks;
DROP POLICY IF EXISTS "mgmt_updates_tmp_auth" ON public.management_task_updates;

CREATE POLICY "mgmt_meetings_tmp_auth"
ON public.management_meetings
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "mgmt_agenda_tmp_auth"
ON public.meeting_agenda_items
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "mgmt_tasks_tmp_auth"
ON public.management_tasks
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "mgmt_updates_tmp_auth"
ON public.management_task_updates
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
