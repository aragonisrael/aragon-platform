-- RLS למדריך + טבלאות משותפות עם לוגיסטיקה
-- הרץ עם Role = postgres
-- רק אחרי שכל המדריכים מחוברים ל-Auth (אין auth_user_id ריק)

-- instructor_gear
ALTER TABLE public.instructor_gear ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gear_staff_all" ON public.instructor_gear;
DROP POLICY IF EXISTS "gear_instructor_own" ON public.instructor_gear;
DROP POLICY IF EXISTS "Allow anon access to gear" ON public.instructor_gear;
DROP POLICY IF EXISTS "Allow public access to gear" ON public.instructor_gear;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_gear TO authenticated;
REVOKE ALL ON public.instructor_gear FROM anon;

-- לוגיסטיקה/אדמין: הכל
CREATE POLICY "gear_staff_all"
ON public.instructor_gear
FOR ALL TO authenticated
USING (public.is_staff_logistics() = true)
WITH CHECK (public.is_staff_logistics() = true);

-- מדריך: רק השורה שלו (לפי username)
CREATE POLICY "gear_instructor_own"
ON public.instructor_gear
FOR SELECT TO authenticated
USING (
  public.is_staff_instructor() = true
  AND username = public.current_app_username()
);

-- faults
ALTER TABLE public.faults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faults_staff_all" ON public.faults;
DROP POLICY IF EXISTS "faults_instructor_all" ON public.faults;
DROP POLICY IF EXISTS "Allow anon access to faults" ON public.faults;
DROP POLICY IF EXISTS "Allow public access to faults" ON public.faults;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.faults TO authenticated;
REVOKE ALL ON public.faults FROM anon;

CREATE POLICY "faults_staff_all"
ON public.faults
FOR ALL TO authenticated
USING (public.is_staff_logistics() = true)
WITH CHECK (public.is_staff_logistics() = true);

-- מדריך: קריאה/יצירה/עדכון (מדווח תקלות)
CREATE POLICY "faults_instructor_all"
ON public.faults
FOR ALL TO authenticated
USING (public.is_staff_instructor() = true)
WITH CHECK (public.is_staff_instructor() = true);

-- coin_grant_requests
ALTER TABLE public.coin_grant_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coin_req_admin_all" ON public.coin_grant_requests;
DROP POLICY IF EXISTS "coin_req_instructor_write" ON public.coin_grant_requests;
DROP POLICY IF EXISTS "coin_req_instructor_read" ON public.coin_grant_requests;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coin_grant_requests TO authenticated;
REVOKE ALL ON public.coin_grant_requests FROM anon;

-- אדמין/הנהלה: הכל (אישור מענקים)
CREATE POLICY "coin_req_admin_all"
ON public.coin_grant_requests
FOR ALL TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

-- מדריך: קריאה + יצירה
CREATE POLICY "coin_req_instructor_read"
ON public.coin_grant_requests
FOR SELECT TO authenticated
USING (public.is_staff_instructor() = true);

CREATE POLICY "coin_req_instructor_write"
ON public.coin_grant_requests
FOR INSERT TO authenticated
WITH CHECK (public.is_staff_instructor() = true);

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('instructor_gear', 'faults', 'coin_grant_requests')
ORDER BY tablename, policyname;
