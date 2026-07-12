-- רשימת מדריכים ליצירת Auth
-- הרץ עם Role = postgres
--
-- לכל שורה: צור משתמש ב-Authentication → Users עם:
--   Email = auth_email מהטבלה
--   Password = הסיסמה של אותו משתמש באפליקציה
--   Auto confirm = מסומן

SELECT
  u.id,
  u.username,
  u.role,
  u.full_name,
  CASE
    WHEN u.username ~ '^[a-zA-Z0-9._+-]+$' THEN lower(u.username) || '@aragon.auth'
    ELSE 'uid' || u.id::text || '@aragon.auth'
  END AS auth_email,
  u.auth_user_id,
  CASE
    WHEN u.auth_user_id IS NULL THEN 'צריך ליצור ב-Auth'
    ELSE 'כבר מחובר'
  END AS status
FROM public.users u
WHERE u.role IN ('instructor', 'temp_instructor')
ORDER BY u.auth_user_id NULLS FIRST, u.role, u.username;
