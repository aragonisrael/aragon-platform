-- נבחרות הקבוצה השנייה + חשבונות תלמידי יוניקורן
-- הרצה חד-פעמית ב-SQL Editor, Role = postgres
-- לא נוגע בסיסמאות של תלמידים קיימים
-- מדלג על דור דניאל

WITH spark AS (
  SELECT jsonb_agg(100) AS sparkline
  FROM generate_series(1, 24)
)
INSERT INTO public.unicorn_market_companies
  (name, ticker, blurb, school, age_group, valuation, change_percent, raised_amount, sparkline, is_example, is_listed, accent, icon, award_title)
SELECT v.name, v.ticker, '', '', '', 100000, 0, 0, spark.sparkline, false, true, '#67e8f9', '🦄', NULL
FROM spark,
  (VALUES
    ('הנבחרת של לירוי', 'LIRY'),
    ('הנבחרת של נעם', 'NOAM'),
    ('הנבחרת של נבו', 'NEVO'),
    ('הנבחרת של עלמה', 'ALMA')
  ) AS v(name, ticker)
WHERE NOT EXISTS (
  SELECT 1 FROM public.unicorn_market_companies c WHERE c.ticker = v.ticker
);

INSERT INTO public.users (username, password, role, full_name, is_active, coins)
SELECT v.username, '12345678', 'unicorn_student', v.full_name, true, 0
FROM (VALUES
  ('לירוי.צדקה', 'לירוי צדקה'),
  ('אמרי.נוהיאן', 'אמרי נוהיאן'),
  ('מאור.גלם', 'מאור גלם'),
  ('נדב.ששוני', 'נדב ששוני'),
  ('נעם.עוז', 'נעם עוז'),
  ('שי.אופנר', 'שי אופנר'),
  ('תום.רסין', 'תום רסין'),
  ('נתנאל.אברהם.בוטרשוילי', 'נתנאל אברהם בוטרשוילי'),
  ('נבו.צסקופ', 'נבו צסקופ'),
  ('יובל.קרוואני', 'יובל קרוואני'),
  ('דניאל.אדרי', 'דניאל אדרי'),
  ('אורי.שמואל', 'אורי שמואל'),
  ('לביא.דנינו', 'לביא דנינו'),
  ('עלמה.לאמעי', 'עלמה לאמעי'),
  ('הילי.ברקן', 'הילי ברקן'),
  ('יהלי.ששו', 'יהלי ששו'),
  ('אגם.דובריש', 'אגם דובריש')
) AS v(username, full_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.username = v.username
);

INSERT INTO public.unicorn_team_members (company_id, user_id, team_role)
SELECT c.id, u.id, v.team_role
FROM (VALUES
  ('LIRY', 'לירוי.צדקה', 'ceo'),
  ('LIRY', 'אמרי.נוהיאן', 'cfo'),
  ('LIRY', 'מאור.גלם', 'cmo'),
  ('LIRY', 'נדב.ששוני', 'cto'),
  ('NOAM', 'נעם.עוז', 'ceo'),
  ('NOAM', 'שי.אופנר', 'cmo'),
  ('NOAM', 'תום.רסין', 'cfo'),
  ('NOAM', 'נתנאל.אברהם.בוטרשוילי', 'cto'),
  ('NEVO', 'נבו.צסקופ', 'ceo'),
  ('NEVO', 'יובל.קרוואני', 'cmo'),
  ('NEVO', 'דניאל.אדרי', 'cmo'),
  ('NEVO', 'אורי.שמואל', 'cto'),
  ('NEVO', 'לביא.דנינו', 'cfo'),
  ('ALMA', 'עלמה.לאמעי', 'ceo'),
  ('ALMA', 'הילי.ברקן', 'cmo'),
  ('ALMA', 'יהלי.ששו', 'cfo'),
  ('ALMA', 'אגם.דובריש', 'cto')
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
WHERE c.ticker IN ('LIRY', 'NOAM', 'NEVO', 'ALMA')
ORDER BY c.id, array_position(ARRAY['ceo','cto','cfo','cmo','founder'], m.team_role);
