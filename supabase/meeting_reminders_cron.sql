-- הרץ רק אחרי deploy של meeting-reminders + הגדרת PUSH_CRON_SECRET
-- דורש Extensions: pg_cron, pg_net
-- החלף YOUR_PUSH_CRON_SECRET לפני הרצה

SELECT cron.schedule(
  'aragon-meeting-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ohskpvihxwxtvsgrcbak.supabase.co/functions/v1/meeting-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'AragonCron2026!'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
