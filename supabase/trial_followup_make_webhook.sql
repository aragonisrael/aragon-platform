-- Push trial WhatsApp queue rows to Make immediately (no polling)
-- Requires: Database → Extensions → pg_net enabled
-- Run once as postgres

CREATE OR REPLACE FUNCTION public.trigger_trial_followup_to_make()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trial automations — never general extension followups
  IF NEW.purpose IS NULL OR NEW.purpose NOT IN ('trial_confirmation', 'trial_after_class') THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://hook.eu2.make.com/9wujxdedplsov4xafibq6g42741q4c1w',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'id', NEW.id,
      'phone', NEW.phone,
      'send_at', NEW.send_at,
      'message_text', NEW.message_text,
      'status', NEW.status,
      'purpose', NEW.purpose,
      'record', row_to_json(NEW)
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'trial followup → Make webhook failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trial_followup_to_make ON public.scheduled_followups;
CREATE TRIGGER trg_trial_followup_to_make
  AFTER INSERT ON public.scheduled_followups
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_trial_followup_to_make();
