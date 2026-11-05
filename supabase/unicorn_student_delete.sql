-- מאפשר ליוניקורן למחוק רק חשבונות תלמידי המסלול.
-- הרצה חד-פעמית ב-SQL Editor אחרי unicorn_teams.sql

DROP POLICY IF EXISTS "users_unicorn_delete_students" ON public.users;
CREATE POLICY "users_unicorn_delete_students"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    public.is_unicorn_reviewer() = true
    AND role = 'unicorn_student'
  );
