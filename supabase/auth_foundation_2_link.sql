-- שלב 1B: קישור משתמשים קיימים ל-Auth
-- הרץ רק אחרי ש-1A הצליח

UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE lower(a.email) = lower(u.username) || '@aragon.auth'
  AND u.role IN ('admin', 'management')
  AND (u.auth_user_id IS DISTINCT FROM a.id);

SELECT username, role, auth_user_id
FROM public.users
WHERE role IN ('admin', 'management')
ORDER BY role, username;
