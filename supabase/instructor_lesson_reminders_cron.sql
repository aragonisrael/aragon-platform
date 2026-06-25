-- הרץ רק אחרי deploy של instructor-lesson-reminders + הגדרת PUSH_CRON_SECRET
-- דורש Extensions: pg_cron, pg_net
-- בודק כל 15 דקות ושולח התראה אחת ביום, 90 דקות לפני השיעור הראשון

SELECT cron.schedule(
  'aragon-instructor-lesson-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ohskpvihxwxtvsgrcbak.supabase.co/functions/v1/instructor-lesson-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'AragonCron2026!'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
