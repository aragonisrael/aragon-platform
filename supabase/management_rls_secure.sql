-- שלב 2: RLS אמיתי למודול הנהלה
-- הרץ עם Role = postgres
--
-- מי מורשה: admin + management בלבד
-- מי נחסם: anon, student, instructor, logistics (בלי סשן Auth מתאים)

-- וידוא RLS דלוק
ALTER TABLE public.management_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_task_updates ENABLE ROW LEVEL SECURITY;

-- מחיקת policies ישנות/פתוחות
DROP POLICY IF EXISTS "mgmt_meetings_all" ON public.management_meetings;
DROP POLICY IF EXISTS "mgmt_agenda_all" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mgmt_tasks_all" ON public.management_tasks;
DROP POLICY IF EXISTS "mgmt_updates_all" ON public.management_task_updates;

DROP POLICY IF EXISTS "mgmt_meetings_staff" ON public.management_meetings;
DROP POLICY IF EXISTS "mgmt_agenda_staff" ON public.meeting_agenda_items;
DROP POLICY IF EXISTS "mgmt_tasks_staff" ON public.management_tasks;
DROP POLICY IF EXISTS "mgmt_updates_staff" ON public.management_task_updates;

-- הרשאות בסיס ל-authenticated (המדיניות תגביל מי באמת עובר)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_agenda_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_task_updates TO authenticated;

-- חסימת anon על הטבלאות האלה
REVOKE ALL ON public.management_meetings FROM anon;
REVOKE ALL ON public.meeting_agenda_items FROM anon;
REVOKE ALL ON public.management_tasks FROM anon;
REVOKE ALL ON public.management_task_updates FROM anon;

-- policies: רק הנהלה + אדמין מחוברים ב-Auth
CREATE POLICY "mgmt_meetings_staff"
ON public.management_meetings
FOR ALL
TO authenticated
USING (public.is_staff_management())
WITH CHECK (public.is_staff_management());

CREATE POLICY "mgmt_agenda_staff"
ON public.meeting_agenda_items
FOR ALL
TO authenticated
USING (public.is_staff_management())
WITH CHECK (public.is_staff_management());

CREATE POLICY "mgmt_tasks_staff"
ON public.management_tasks
FOR ALL
TO authenticated
USING (public.is_staff_management())
WITH CHECK (public.is_staff_management());

CREATE POLICY "mgmt_updates_staff"
ON public.management_task_updates
FOR ALL
TO authenticated
USING (public.is_staff_management())
WITH CHECK (public.is_staff_management());

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
