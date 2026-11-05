-- נבחרות הקבוצה הראשונה + חשבונות תלמידי יוניקורן
-- הרצה חד-פעמית ב-SQL Editor, Role = postgres
-- לא נוגע בסיסמאות של תלמידים קיימים

GRANT INSERT, UPDATE, DELETE ON public.unicorn_market_companies TO authenticated;

WITH spark AS (
  SELECT jsonb_agg(100) AS sparkline
  FROM generate_series(1, 24)
)
INSERT INTO public.unicorn_market_companies
  (name, ticker, blurb, school, age_group, valuation, change_percent, raised_amount, sparkline, is_example, is_listed, accent, icon, award_title)
SELECT v.name, v.ticker, '', '', '', 100000, 0, 0, spark.sparkline, false, true, '#67e8f9', '🦄', NULL
FROM spark,
  (VALUES
    ('הנבחרת של ליאן', 'LIAN'),
    ('הנבחרת של שלו', 'SHLO'),
    ('הנבחרת של לימאי', 'LMY'),
    ('הנבחרת של איתי', 'ITAI')
  ) AS v(name, ticker)
WHERE NOT EXISTS (
  SELECT 1 FROM public.unicorn_market_companies c WHERE c.ticker = v.ticker
);

INSERT INTO public.users (username, password, role, full_name, is_active, coins)
SELECT v.username, '12345678', 'unicorn_student', v.full_name, true, 0
FROM (VALUES
  ('ליאן.שקלים', 'ליאן שקלים'),
  ('איתמר.סבידרסקי', 'איתמר סבידרסקי'),
  ('ליב.נוריאל', 'ליב נוריאל'),
  ('שלו.נאמני', 'שלו נאמני'),
  ('נועם.מסיקה.פאר', 'נועם מסיקה פאר'),
  ('תום.הוקינס', 'תום הוקינס'),
  ('לימאי.סולומונס', 'לימאי סולומונס'),
  ('אביחי.מרדכי.כפיר', 'אביחי מרדכי כפיר'),
  ('אור.בר.דוד', 'אור בר דוד'),
  ('איתי.ניסנבוים', 'איתי ניסנבוים'),
  ('תום.אוסטינסקי', 'תום אוסטינסקי')
) AS v(username, full_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.username = v.username
);

INSERT INTO public.unicorn_team_members (company_id, user_id, team_role)
SELECT c.id, u.id, v.team_role
FROM (VALUES
  ('LIAN', 'ליאן.שקלים', 'ceo'),
  ('LIAN', 'איתמר.סבידרסקי', 'cfo'),
  ('LIAN', 'ליב.נוריאל', 'cmo'),
  ('SHLO', 'שלו.נאמני', 'ceo'),
  ('SHLO', 'נועם.מסיקה.פאר', 'cmo'),
  ('SHLO', 'תום.הוקינס', 'cfo'),
  ('LMY', 'לימאי.סולומונס', 'ceo'),
  ('LMY', 'אביחי.מרדכי.כפיר', 'cfo'),
  ('LMY', 'אור.בר.דוד', 'cmo'),
  ('ITAI', 'איתי.ניסנבוים', 'ceo'),
  ('ITAI', 'תום.אוסטינסקי', 'cto')
) AS v(ticker, username, team_role)
JOIN public.unicorn_market_companies c ON c.ticker = v.ticker
JOIN public.users u ON u.username = v.username AND u.role = 'unicorn_student'
WHERE NOT EXISTS (
  SELECT 1 FROM public.unicorn_team_members m WHERE m.user_id = u.id
);

SELECT
  c.name AS company,
  c.ticker,
  CASE m.team_role
    WHEN 'ceo' THEN 'מנכ״ל'
    WHEN 'cto' THEN 'סמנכ״ל טכנולוגיות'
    WHEN 'cmo' THEN 'שיווק'
    WHEN 'cfo' THEN 'כספים'
    ELSE m.team_role
  END AS role_he,
  u.full_name,
  u.username,
  u.password,
  u.role
FROM public.unicorn_team_members m
JOIN public.unicorn_market_companies c ON c.id = m.company_id
JOIN public.users u ON u.id = m.user_id
WHERE c.ticker IN ('LIAN', 'SHLO', 'LMY', 'ITAI')
ORDER BY c.id, array_position(ARRAY['ceo','cto','cfo','cmo','founder'], m.team_role);
