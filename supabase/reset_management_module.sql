-- איפוס מלא של מודול משימות ההנהלה (התחלה נקייה לבדיקות / שימוש אמיתי)
-- מוחק: משימות, דיווחי סגירה, ישיבות, סדר יום, ולוג התראות push קשור
-- לא נוגע ב: משתמשים, חשבונות הנהלה, צירוף אחריות, admin_tasks (תלמידים/מדריכים)
--
-- הרץ ב-Supabase → SQL Editor → Run

BEGIN;

-- כל הטבלאות ביחד + CASCADE (פותר קשרי foreign key)
TRUNCATE TABLE
  public.management_task_updates,
  public.management_tasks,
  public.meeting_agenda_items,
  public.management_meetings
RESTART IDENTITY CASCADE;

-- מניעת דילוג על push כפול אחרי איפוס
DELETE FROM public.notification_log
WHERE notification_key LIKE 'task:%'
   OR notification_key LIKE 'meeting:%';

COMMIT;

-- אימות מהיר (אמור להחזיר 0 בכל השורות):
-- SELECT COUNT(*) FROM management_tasks;
-- SELECT COUNT(*) FROM management_meetings;
-- SELECT COUNT(*) FROM meeting_agenda_items;
-- SELECT COUNT(*) FROM management_task_updates;
