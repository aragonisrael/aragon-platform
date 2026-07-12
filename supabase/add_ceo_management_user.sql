-- הוספת משתמש הנהלה: מנכ״ל (ceo)
-- הרץ פעם אחת ב-Supabase SQL Editor

INSERT INTO users (username, password, role, full_name, department, is_active, coins, ils_balance)
SELECT 'ceo', '12345678', 'management', 'מנכ״ל', 'ceo', true, 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'ceo'
);

-- אם ceo כבר קיים — רק מעדכן פרטים
UPDATE users
SET
  password = '12345678',
  role = 'management',
  full_name = 'מנכ״ל',
  department = 'ceo',
  is_active = true
WHERE username = 'ceo';

SELECT username, role, full_name, department
FROM users
WHERE username = 'ceo';
