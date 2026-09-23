-- Separate general followups from trial WhatsApp automations
-- Run once in Supabase SQL Editor as postgres

ALTER TABLE public.scheduled_followups
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.scheduled_followups
  DROP CONSTRAINT IF EXISTS scheduled_followups_purpose_check;

ALTER TABLE public.scheduled_followups
  ADD CONSTRAINT scheduled_followups_purpose_check
  CHECK (purpose IN ('general', 'trial_confirmation', 'trial_after_class'));

CREATE INDEX IF NOT EXISTS idx_scheduled_followups_purpose_status_send_at
ON public.scheduled_followups (purpose, status, send_at);

COMMENT ON COLUMN public.scheduled_followups.purpose IS
  'general = תוסף פולואפ ידני (Make יומי 10:00); trial_* = אוטומציות שיעור ניסיון (Make מיידי)';

-- Trial queue writes purpose explicitly
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

  INSERT INTO public.scheduled_followups (phone, send_at, message_text, status, purpose)
  VALUES (
    p_phone,
    COALESCE(p_send_at, (timezone('asia/jerusalem', now()))::DATE),
    p_message,
    'pending',
    clean_purpose
  );
END;
$$;

ALTER FUNCTION public.queue_trial_whatsapp(TEXT, TEXT, DATE, TEXT) OWNER TO postgres;

-- Keep old 3-arg signature working (defaults to trial_confirmation)
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
  PERFORM public.queue_trial_whatsapp(p_phone, p_message, p_send_at, 'trial_confirmation');
END;
$$;

-- After-class followup must tag purpose correctly
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
      'trial_after_class'
    );

    UPDATE public.trial_leads
    SET followup_sent_at = timezone('utc', now())
    WHERE id = NEW.id
      AND followup_sent_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Registration confirmation already calls queue_trial_whatsapp without purpose
-- → 3-arg wrapper → trial_confirmation. Explicitly update register path for clarity:
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

  PERFORM public.queue_trial_whatsapp(
    clean_phone,
    public.build_trial_confirmation_message(clean_parent, clean_student, p_group_id),
    (timezone('asia/jerusalem', now()))::DATE,
    'trial_confirmation'
  );

  RETURN new_id;
END;
$$;

-- Mark any already-queued trial-looking rows (optional safety): leave general as-is.
-- Old pending rows from before this change stay purpose=general (default) —
-- if any trial messages were queued today without purpose, re-tag by text heuristic:
UPDATE public.scheduled_followups
SET purpose = 'trial_confirmation'
WHERE purpose = 'general'
  AND status = 'pending'
  AND (
    message_text ILIKE '%שיעור התנסות%'
    OR message_text ILIKE '%שיעור ניסיון%'
  )
  AND message_text ILIKE '%איזה כיף%';

UPDATE public.scheduled_followups
SET purpose = 'trial_after_class'
WHERE purpose = 'general'
  AND status = 'pending'
  AND message_text ILIKE '%איך היה%'
  AND (
    message_text ILIKE '%שיעור ניסיון%'
    OR message_text ILIKE '%שיעור התנסות%'
  );
