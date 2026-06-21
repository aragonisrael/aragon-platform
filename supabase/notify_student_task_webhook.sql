-- Webhook DB: Push לתלמידים כשנוצרת משימה / אתגר / שידור ב-admin_tasks
-- דורש pg_net (Database → Extensions → pg_net)
-- דורש deploy של notify-student-task + אותו PUSH_WEBHOOK_SECRET כמו notify-new-task

CREATE OR REPLACE FUNCTION public.trigger_notify_student_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_secret text := 'AragonPush2026!';
BEGIN
  IF NEW.category NOT IN ('student_challenge', 'student_mission', 'student_broadcast') THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://ohskpvihxwxtvsgrcbak.supabase.co/functions/v1/notify-student-task',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify-student-task webhook failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_student_task ON public.admin_tasks;
CREATE TRIGGER trg_notify_student_task
  AFTER INSERT ON public.admin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_student_task();
