-- חשבונות הנהלה לפי מחלקה (role: management)
-- הרץ ב-Supabase SQL Editor

INSERT INTO users (username, password, role, full_name, department, is_active, coins, ils_balance)
VALUES
  ('hey', 'aragon1991', 'management', 'משרד', 'office', true, 0, 0),
  ('edu', 'aragon1991', 'management', 'תוכן', 'content', true, 0, 0),
  ('manager', 'aragon1991', 'management', 'ניהול הדרכה', 'training', true, 0, 0),
  ('hello', 'aragon1991', 'management', 'שיווק', 'marketing', true, 0, 0),
  ('logistic', 'aragon1991', 'management', 'לוגיסטיקה', 'logistics', true, 0, 0),
  ('hr', 'aragon1991', 'management', 'משאבי אנוש', 'hr', true, 0, 0)
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  department = EXCLUDED.department,
  is_active = EXCLUDED.is_active;
