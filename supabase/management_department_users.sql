-- חשבונות הנהלה לפי מחלקה (role: management)
-- הרץ ב-Supabase SQL Editor

INSERT INTO users (username, password, role, full_name, department, is_active, coins, ils_balance)
SELECT v.username, v.password, v.role, v.full_name, v.department, v.is_active, v.coins, v.ils_balance
FROM (
  VALUES
    ('ceo', '12345678', 'management', 'מנכ״ל', 'ceo', true, 0, 0),
    ('hey', '12345678', 'management', 'משרד', 'office', true, 0, 0),
    ('edu', '12345678', 'management', 'תוכן', 'content', true, 0, 0),
    ('manager', '12345678', 'management', 'ניהול הדרכה', 'training', true, 0, 0),
    ('hello', '12345678', 'management', 'שיווק', 'marketing', true, 0, 0),
    ('logistic', '12345678', 'management', 'לוגיסטיקה', 'logistics', true, 0, 0),
    ('hr', '12345678', 'management', 'משאבי אנוש', 'hr', true, 0, 0)
) AS v(username, password, role, full_name, department, is_active, coins, ils_balance)
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.username = v.username
);

UPDATE users u
SET
  password = v.password,
  role = v.role,
  full_name = v.full_name,
  department = v.department,
  is_active = v.is_active
FROM (
  VALUES
    ('ceo', '12345678', 'management', 'מנכ״ל', 'ceo', true),
    ('hey', '12345678', 'management', 'משרד', 'office', true),
    ('edu', '12345678', 'management', 'תוכן', 'content', true),
    ('manager', '12345678', 'management', 'ניהול הדרכה', 'training', true),
    ('hello', '12345678', 'management', 'שיווק', 'marketing', true),
    ('logistic', '12345678', 'management', 'לוגיסטיקה', 'logistics', true),
    ('hr', '12345678', 'management', 'משאבי אנוש', 'hr', true)
) AS v(username, password, role, full_name, department, is_active)
WHERE u.username = v.username;

-- לוח לוגיסטיקה מבצעי (/admin/logistics) — נפרד מאפליקציית המשימות
INSERT INTO users (username, password, role, full_name, department, is_active, coins, ils_balance)
SELECT 'לוגיסטיקה', '12345678', 'logistics', 'לוגיסטיקה', 'logistics', true, 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'לוגיסטיקה'
);

UPDATE users
SET
  password = '12345678',
  role = 'logistics',
  full_name = 'לוגיסטיקה',
  department = 'logistics',
  is_active = true
WHERE username = 'לוגיסטיקה';
