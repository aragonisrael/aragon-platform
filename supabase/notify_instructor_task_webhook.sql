-- Webhook DB: Push למדריך כשנוצר אתגר / משימה / עדכון ממפקדה (instructor_incentive)
-- דורש pg_net + deploy של notify-instructor-task + PUSH_WEBHOOK_SECRET

CREATE OR REPLACE FUNCTION public.trigger_notify_instructor_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_secret text := 'AragonPush2026!';
BEGIN
  IF NEW.category <> 'instructor_incentive' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://ohskpvihxwxtvsgrcbak.supabase.co/functions/v1/notify-instructor-task',
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
    RAISE WARNING 'notify-instructor-task webhook failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_instructor_task ON public.admin_tasks;
CREATE TRIGGER trg_notify_instructor_task
  AFTER INSERT ON public.admin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_instructor_task();
