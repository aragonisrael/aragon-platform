-- רשימת תלמידים לחיבור Auth
-- הרץ עם Role = postgres

SELECT
  COUNT(*) FILTER (WHERE auth_user_id IS NULL) AS need_auth,
  COUNT(*) FILTER (WHERE auth_user_id IS NOT NULL) AS already_linked,
  COUNT(*) AS total_students
FROM public.users
WHERE role = 'student';
