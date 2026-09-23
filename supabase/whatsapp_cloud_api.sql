-- Official WhatsApp Cloud API infrastructure (Meta Graph API)
-- Replaces Green API / unofficial WhatsApp Web session for trial automations.
--
-- BEFORE enabling sends:
-- 1) Meta Business Suite → WhatsApp Business Platform → Cloud API
-- 2) Create / recover a WABA and a Cloud API phone number (not Green API QR)
-- 3) Submit message templates (see seed at bottom) and wait for APPROVED
-- 4) Deploy edge functions send-whatsapp + whatsapp-webhook
-- 5) Set secrets: WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
--    WHATSAPP_VERIFY_TOKEN, WHATSAPP_WEBHOOK_SECRET
-- 6) Point Meta webhook to:
--    https://ohskpvihxwxtvsgrcbak.supabase.co/functions/v1/whatsapp-webhook
--    subscribe to messages + message_status
-- 7) UPDATE public.whatsapp_cloud_settings SET enabled = true WHERE id = 1;
--    AND/OR secret WHATSAPP_CLOUD_ENABLED=true
--
-- Sending stays OFF until step 7. Rows still queue in whatsapp_outbox.

-- ---------------------------------------------------------------------------
-- Settings (single row)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_cloud_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.whatsapp_cloud_settings (id, enabled, notes)
VALUES (1, false, 'Official Cloud API. Keep false until templates are approved and the banned Green API number is not reused on an unofficial session.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.whatsapp_cloud_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_cloud_settings FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Template catalog (names must match Meta exactly)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  purpose TEXT PRIMARY KEY,
  template_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'he',
  category TEXT NOT NULL DEFAULT 'UTILITY',
  body_example TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.whatsapp_templates (purpose, template_name, language, category, body_example)
VALUES
  (
    'trial_confirmation',
    'trial_confirmation',
    'he',
    'UTILITY',
    E'איזה כיף {{1}}!\nרשמנו את {{2}} לשיעור התנסות בחוג {{3}}.\nיוצרים עבור {{2}} את המקפצה לעולם הטכנולוגי והיזמי.\n\nנתראה! :)'
  ),
  (
    'trial_after_class',
    'trial_after_class',
    'he',
    'MARKETING',
    E'היי {{1}}, איזה כיף היה לראות את {{2}} בשיעור ההתנסות בחוג {{3}}!\nשיעור הניסיון הוא רק הטעימה הראשונה — בהמשך מחכה עולם טכנולוגי שלם, עשיר ומלא ביצירה!\nלתשומת ליבך: הקבוצה מוגבלת ל-10 משתתפים בלבד כדי להבטיח יחס אישי. זה בדיוק הזמן לשריין מקום עבור {{2}}!'
  ),
  (
    'website_contact',
    'website_contact_received',
    'he',
    'UTILITY',
    E'היי {{1}}, קיבלנו את פנייתך מאתר אראגון. נחזור אליך בהקדם.'
  ),
  (
    'general',
    'staff_followup',
    'he',
    'UTILITY',
    E'{{1}}'
  )
ON CONFLICT (purpose) DO UPDATE
SET template_name = EXCLUDED.template_name,
    language = EXCLUDED.language,
    category = EXCLUDED.category,
    body_example = EXCLUDED.body_example,
    updated_at = timezone('utc', now());

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_templates FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Outbox + inbound (24h session window)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_outbox (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  phone TEXT NOT NULL,
  purpose TEXT NOT NULL,
  template_name TEXT,
  template_language TEXT NOT NULL DEFAULT 'he',
  template_params JSONB NOT NULL DEFAULT '[]'::jsonb,
  fallback_text TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'skipped')),
  scheduled_followup_id BIGINT,
  trial_lead_id BIGINT,
  provider_message_id TEXT,
  provider_response JSONB,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_status_id
  ON public.whatsapp_outbox (status, id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_phone
  ON public.whatsapp_outbox (phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_provider_message_id
  ON public.whatsapp_outbox (provider_message_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_inbound (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  phone TEXT NOT NULL,
  provider_message_id TEXT,
  message_type TEXT,
  message_text TEXT,
  raw JSONB
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_phone_received
  ON public.whatsapp_inbound (phone, received_at DESC);

ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_inbound ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_outbox FROM anon, authenticated;
REVOKE ALL ON public.whatsapp_inbound FROM anon, authenticated;

GRANT SELECT ON public.whatsapp_outbox TO authenticated;
GRANT SELECT ON public.whatsapp_inbound TO authenticated;

DROP POLICY IF EXISTS "whatsapp_outbox_staff_select" ON public.whatsapp_outbox;
CREATE POLICY "whatsapp_outbox_staff_select"
ON public.whatsapp_outbox
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "whatsapp_inbound_staff_select" ON public.whatsapp_inbound;
CREATE POLICY "whatsapp_inbound_staff_select"
ON public.whatsapp_inbound
FOR SELECT
TO authenticated
USING (true);

-- Keep outbox writable only via service role / SECURITY DEFINER functions.
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_outbox FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_inbound FROM authenticated;

ALTER TABLE public.scheduled_followups
  ADD COLUMN IF NOT EXISTS template_params JSONB;

-- ---------------------------------------------------------------------------
-- Enqueue helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_whatsapp_outbox(
  p_phone TEXT,
  p_purpose TEXT,
  p_fallback_text TEXT,
  p_template_params JSONB DEFAULT '[]'::jsonb,
  p_scheduled_followup_id BIGINT DEFAULT NULL,
  p_trial_lead_id BIGINT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tpl RECORD;
  new_id BIGINT;
BEGIN
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RETURN NULL;
  END IF;

  SELECT template_name, language
  INTO tpl
  FROM public.whatsapp_templates
  WHERE purpose = p_purpose;

  INSERT INTO public.whatsapp_outbox (
    phone,
    purpose,
    template_name,
    template_language,
    template_params,
    fallback_text,
    status,
    scheduled_followup_id,
    trial_lead_id
  ) VALUES (
    p_phone,
    p_purpose,
    tpl.template_name,
    COALESCE(tpl.language, 'he'),
    COALESCE(p_template_params, '[]'::jsonb),
    p_fallback_text,
    'queued',
    p_scheduled_followup_id,
    p_trial_lead_id
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

ALTER FUNCTION public.enqueue_whatsapp_outbox(TEXT, TEXT, TEXT, JSONB, BIGINT, BIGINT) OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- Trial queue: also stamp template params + outbox
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.queue_trial_whatsapp(
  p_phone TEXT,
  p_message TEXT,
  p_send_at DATE DEFAULT (timezone('asia/jerusalem', now()))::DATE,
  p_purpose TEXT DEFAULT 'trial_confirmation',
  p_template_params JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_purpose TEXT := COALESCE(nullif(trim(p_purpose), ''), 'trial_confirmation');
BEGIN
  IF p_phone IS NULL OR p_phone = '' OR p_message IS NULL OR trim(p_message) = '' THEN
    RETURN;
  END IF;

  IF to_regclass('public.scheduled_followups') IS NULL THEN
    RETURN;
  END IF;

  IF clean_purpose NOT IN ('trial_confirmation', 'trial_after_class') THEN
    clean_purpose := 'trial_confirmation';
  END IF;

  INSERT INTO public.scheduled_followups (phone, send_at, message_text, status, purpose, template_params)
  VALUES (
    p_phone,
    COALESCE(p_send_at, (timezone('asia/jerusalem', now()))::DATE),
    p_message,
    'pending',
    clean_purpose,
    COALESCE(p_template_params, '[]'::jsonb)
  );
END;
$$;

ALTER FUNCTION public.queue_trial_whatsapp(TEXT, TEXT, DATE, TEXT, JSONB) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.queue_trial_whatsapp(
  p_phone TEXT,
  p_message TEXT,
  p_send_at DATE DEFAULT (timezone('asia/jerusalem', now()))::DATE,
  p_purpose TEXT DEFAULT 'trial_confirmation'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.queue_trial_whatsapp(p_phone, p_message, p_send_at, p_purpose, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_trial_whatsapp(
  p_phone TEXT,
  p_message TEXT,
  p_send_at DATE DEFAULT (timezone('asia/jerusalem', now()))::DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.queue_trial_whatsapp(p_phone, p_message, p_send_at, 'trial_confirmation', '[]'::jsonb);
END;
$$;

-- Pass structured template params from registration
CREATE OR REPLACE FUNCTION public.register_trial_lead(
  p_group_id BIGINT,
  p_student_full_name TEXT,
  p_student_grade TEXT,
  p_parent_name TEXT,
  p_parent_phone TEXT,
  p_needs_pickup BOOLEAN DEFAULT false,
  p_source_channel TEXT DEFAULT 'phone',
  p_created_by TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id BIGINT;
  clean_student TEXT := trim(COALESCE(p_student_full_name, ''));
  clean_grade TEXT := trim(COALESCE(p_student_grade, ''));
  clean_parent TEXT := trim(COALESCE(p_parent_name, ''));
  clean_phone TEXT := public.normalize_israeli_phone(p_parent_phone);
  clean_source TEXT := lower(trim(COALESCE(p_source_channel, 'phone')));
  actor TEXT := COALESCE(nullif(trim(p_created_by), ''), clean_source);
  group_label TEXT;
BEGIN
  IF clean_student = '' OR clean_grade = '' OR clean_parent = '' OR clean_phone IS NULL THEN
    RAISE EXCEPTION 'missing required fields';
  END IF;

  IF clean_source NOT IN ('whatsapp', 'phone', 'website') THEN
    clean_source := 'phone';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id AND g.is_active = true
  ) THEN
    RAISE EXCEPTION 'group not available';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.trial_leads tl
    WHERE tl.parent_phone = clean_phone
      AND tl.group_id = p_group_id
      AND tl.status NOT IN ('registered', 'not_interested')
  ) THEN
    RAISE EXCEPTION 'duplicate phone for group';
  END IF;

  INSERT INTO public.trial_leads (
    student_full_name,
    student_grade,
    parent_name,
    parent_phone,
    group_id,
    needs_pickup_from_after_school,
    source_channel,
    status,
    attended_trial,
    immediate_sent_at,
    created_by,
    updated_by
  ) VALUES (
    clean_student,
    clean_grade,
    clean_parent,
    clean_phone,
    p_group_id,
    COALESCE(p_needs_pickup, false),
    clean_source,
    'before_class',
    false,
    timezone('utc', now()),
    actor,
    actor
  )
  RETURNING id INTO new_id;

  group_label := public.trial_group_label(p_group_id);

  PERFORM public.queue_trial_whatsapp(
    clean_phone,
    public.build_trial_confirmation_message(clean_parent, clean_student, p_group_id),
    (timezone('asia/jerusalem', now()))::DATE,
    'trial_confirmation',
    jsonb_build_array(clean_parent, clean_student, group_label)
  );

  UPDATE public.whatsapp_outbox
  SET trial_lead_id = new_id
  WHERE trial_lead_id IS NULL
    AND phone = clean_phone
    AND purpose = 'trial_confirmation'
    AND created_at >= timezone('utc', now()) - interval '2 minutes';

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_trial_after_class_followup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'after_class'
     AND OLD.status IS DISTINCT FROM 'after_class'
     AND NEW.followup_sent_at IS NULL
     AND COALESCE(NEW.parent_phone, '') <> ''
  THEN
    PERFORM public.queue_trial_whatsapp(
      NEW.parent_phone,
      public.build_trial_after_class_message(NEW.parent_name, NEW.student_full_name, NEW.group_id),
      (timezone('asia/jerusalem', now()))::DATE,
      'trial_after_class',
      jsonb_build_array(
        COALESCE(nullif(trim(NEW.parent_name), ''), 'הורה יקר'),
        COALESCE(nullif(trim(NEW.student_full_name), ''), 'התלמיד/ה'),
        public.trial_group_label(NEW.group_id)
      )
    );

    UPDATE public.trial_leads
    SET followup_sent_at = timezone('utc', now())
    WHERE id = NEW.id
      AND followup_sent_at IS NULL;

    UPDATE public.whatsapp_outbox
    SET trial_lead_id = NEW.id
    WHERE trial_lead_id IS NULL
      AND phone = NEW.parent_phone
      AND purpose = 'trial_after_class'
      AND created_at >= timezone('utc', now()) - interval '2 minutes';
  END IF;

  RETURN NEW;
END;
$$;

-- Staff / general followups that only insert scheduled_followups
CREATE OR REPLACE FUNCTION public.enqueue_outbox_from_scheduled_followup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.whatsapp_outbox o
    WHERE o.scheduled_followup_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM public.enqueue_whatsapp_outbox(
    NEW.phone,
    COALESCE(NEW.purpose, 'general'),
    NEW.message_text,
    COALESCE(NEW.template_params, '[]'::jsonb),
    NEW.id,
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_outbox_from_scheduled_followup ON public.scheduled_followups;
CREATE TRIGGER trg_enqueue_outbox_from_scheduled_followup
  AFTER INSERT ON public.scheduled_followups
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_outbox_from_scheduled_followup();

-- ---------------------------------------------------------------------------
-- Push outbox rows to send-whatsapp (does not send if Cloud is disabled)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_outbox_send()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_secret text := 'AragonWhatsApp2026!';
BEGIN
  IF NEW.status IS DISTINCT FROM 'queued' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://ohskpvihxwxtvsgrcbak.supabase.co/functions/v1/send-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'outbox_id', NEW.id
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'whatsapp outbox → send-whatsapp failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_outbox_send ON public.whatsapp_outbox;
CREATE TRIGGER trg_whatsapp_outbox_send
  AFTER INSERT ON public.whatsapp_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_whatsapp_outbox_send();

-- Website contact confirmation (call from site later; email can stay in Make)
CREATE OR REPLACE FUNCTION public.enqueue_website_contact_whatsapp(
  p_first_name TEXT,
  p_phone TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_phone TEXT := public.normalize_israeli_phone(p_phone);
  clean_name TEXT := COALESCE(nullif(trim(p_first_name), ''), 'שלום');
BEGIN
  IF clean_phone IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN public.enqueue_whatsapp_outbox(
    clean_phone,
    'website_contact',
    format('היי %s, קיבלנו את פנייתך מאתר אראגון. נחזור אליך בהקדם.', clean_name),
    jsonb_build_array(clean_name),
    NULL,
    NULL
  );
END;
$$;

ALTER FUNCTION public.enqueue_website_contact_whatsapp(TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enqueue_website_contact_whatsapp(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_website_contact_whatsapp(TEXT, TEXT) TO service_role;

-- Stop unofficial Green API / Make WhatsApp path for trial rows
DROP TRIGGER IF EXISTS trg_trial_followup_to_make ON public.scheduled_followups;

COMMENT ON TABLE public.whatsapp_outbox IS
  'Official Cloud API queue. status=queued until WHATSAPP_CLOUD_ENABLED / settings.enabled.';
