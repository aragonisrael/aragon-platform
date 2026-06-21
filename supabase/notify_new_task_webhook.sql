-- Webhook DB: שליחת Push כשנוצרת משימה חדשה
-- דורש pg_net (Database → Extensions → pg_net)
-- הגדר Secret ב-Supabase: PUSH_WEBHOOK_SECRET (אותו ערך כמו ב-webhook)

CREATE OR REPLACE FUNCTION public.trigger_notify_new_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_secret text := 'AragonPush2026!';
BEGIN
  PERFORM net.http_post(
    url := 'https://ohskpvihxwxtvsgrcbak.supabase.co/functions/v1/notify-new-task',
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
    RAISE WARNING 'notify-new-task webhook failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_task ON public.management_tasks;
CREATE TRIGGER trg_notify_new_task
  AFTER INSERT ON public.management_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_new_task();
