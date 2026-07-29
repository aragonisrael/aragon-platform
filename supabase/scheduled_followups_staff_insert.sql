-- Allow staff (admin/management + instructors) to insert scheduled followups
-- for manual trial-lesson registrations from the app.
-- Run as postgres role.

GRANT SELECT, INSERT ON public.scheduled_followups TO authenticated;

DROP POLICY IF EXISTS "scheduled_followups_staff_insert" ON public.scheduled_followups;
DROP POLICY IF EXISTS "scheduled_followups_staff_select" ON public.scheduled_followups;

CREATE POLICY "scheduled_followups_staff_insert"
ON public.scheduled_followups
FOR INSERT TO authenticated
WITH CHECK (
  public.is_staff_management() = true
  OR public.is_staff_instructor() = true
);

CREATE POLICY "scheduled_followups_staff_select"
ON public.scheduled_followups
FOR SELECT TO authenticated
USING (
  public.is_staff_management() = true
  OR public.is_staff_instructor() = true
);
