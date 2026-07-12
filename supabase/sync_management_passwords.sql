-- איחוד סיסמאות הנהלה + אדמין ל-12345678
-- כדי שיתאימו למה שנוצר ב-Auth
-- הרץ ב-Supabase SQL Editor

UPDATE users
SET password = '12345678'
WHERE username IN (
  'ceo',
  'hey',
  'edu',
  'manager',
  'hello',
  'logistic',
  'hr',
  'admin'
);

SELECT username, role, password
FROM users
WHERE username IN (
  'ceo',
  'hey',
  'edu',
  'manager',
  'hello',
  'logistic',
  'hr',
  'admin'
)
ORDER BY role, username;
