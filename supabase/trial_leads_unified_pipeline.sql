-- Unified trial-lead pipeline (שיעורי ניסיון)
-- Run once in Supabase SQL Editor as postgres

-- ---------------------------------------------------------------------------
-- 1) Phone normalization
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_israeli_phone(raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT := regexp_replace(COALESCE(raw, ''), '\D', '', 'g');
BEGIN
  IF digits IS NULL OR digits = '' THEN
    RETURN NULL;
  END IF;

  IF left(digits, 3) = '972' AND length(digits) >= 11 THEN
    RETURN digits;
  END IF;

  IF left(digits, 1) = '0' AND length(digits) >= 9 THEN
    RETURN '972' || substring(digits FROM 2);
  END IF;

  IF left(digits, 1) = '5' AND length(digits) = 9 THEN
    RETURN '972' || digits;
  END IF;

  RETURN NULL;
END;
$$;

ALTER FUNCTION public.normalize_israeli_phone(TEXT) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.normalize_israeli_phone(TEXT) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) One active lead per phone + group
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS trial_leads_active_phone_group_uidx
ON public.trial_leads (parent_phone, group_id)
WHERE parent_phone IS NOT NULL
  AND parent_phone <> ''
  AND status NOT IN ('registered', 'not_interested');

-- ---------------------------------------------------------------------------
-- 3) Group label helper for WhatsApp copy
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trial_group_label(p_group_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g RECORD;
  day_names TEXT[] := ARRAY['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  day_label TEXT;
  time_label TEXT;
  parts TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT name, city, venue, day, start_min
  INTO g
  FROM public.groups
  WHERE id = p_group_id;

  IF NOT FOUND THEN
    RETURN 'החוג';
  END IF;

  IF g.day IS NOT NULL AND g.day >= 0 AND g.day <= 6 THEN
    day_label := 'יום ' || day_names[g.day + 1];
  END IF;

  IF g.start_min IS NOT NULL THEN
    time_label := lpad((g.start_min / 60)::TEXT, 2, '0') || ':' || lpad((g.start_min % 60)::TEXT, 2, '0');
  END IF;

  IF COALESCE(g.name, '') <> '' THEN parts := array_append(parts, g.name); END IF;
  IF COALESCE(g.venue, '') <> '' THEN parts := array_append(parts, g.venue); END IF;
  IF COALESCE(g.city, '') <> '' THEN parts := array_append(parts, g.city); END IF;
  IF day_label IS NOT NULL THEN parts := array_append(parts, day_label); END IF;
  IF time_label IS NOT NULL THEN parts := array_append(parts, time_label); END IF;

  IF array_length(parts, 1) IS NULL THEN
    RETURN 'החוג';
  END IF;

  RETURN array_to_string(parts, ' · ');
END;
$$;

ALTER FUNCTION public.trial_group_label(BIGINT) OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- 4) Queue WhatsApp messages into scheduled_followups
-- ---------------------------------------------------------------------------
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
  IF p_phone IS NULL OR p_phone = '' OR p_message IS NULL OR trim(p_message) = '' THEN
    RETURN;
  END IF;

  IF to_regclass('public.scheduled_followups') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.scheduled_followups (phone, send_at, message_text, status, purpose)
  VALUES (p_phone, COALESCE(p_send_at, (timezone('asia/jerusalem', now()))::DATE), p_message, 'pending', 'trial_confirmation');
END;
$$;

ALTER FUNCTION public.queue_trial_whatsapp(TEXT, TEXT, DATE) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.build_trial_confirmation_message(
  p_parent_name TEXT,
  p_student_name TEXT,
  p_group_id BIGINT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_label TEXT := public.trial_group_label(p_group_id);
  parent_part TEXT := CASE
    WHEN COALESCE(trim(p_parent_name), '') <> '' THEN ' ' || trim(p_parent_name)
    ELSE ''
  END;
  student_name TEXT := COALESCE(nullif(trim(p_student_name), ''), 'התלמיד/ה');
BEGIN
  RETURN format(
    E'איזה כיף%s!\nרשמנו את %s לשיעור התנסות בחוג %s.\nיוצרים עבור %s את המקפצה לעולם הטכנולוגי והיזמי.\n\nנתראה! :)',
    parent_part,
    student_name,
    group_label,
    student_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.build_trial_after_class_message(
  p_parent_name TEXT,
  p_student_name TEXT,
  p_group_id BIGINT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_label TEXT := public.trial_group_label(p_group_id);
  parent_name TEXT := COALESCE(nullif(trim(p_parent_name), ''), 'הורה יקר');
  student_name TEXT := COALESCE(nullif(trim(p_student_name), ''), 'התלמיד/ה');
BEGIN
  RETURN format(
    E'היי %s, איזה כיף היה לראות את %s בשיעור ההתנסות בחוג %s! 💻\nשיעור הניסיון הוא רק הטעימה הראשונה — בהמשך מחכה עולם טכנולוגי שלם, עשיר ומלא ביצירה!\n⚡ לתשומת ליבך: הקבוצה מוגבלת ל-10 משתתפים בלבד כדי להבטיח יחס אישי. זה בדיוק הזמן לשריין מקום עבור %s!',
    parent_name,
    student_name,
    group_label,
    student_name
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Central register RPC (all channels)
-- ---------------------------------------------------------------------------
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
    public.build_trial_confirmation_message(clean_parent, clean_student, p_group_id)
  );

  RETURN new_id;
END;
$$;

ALTER FUNCTION public.register_trial_lead(
  BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.register_trial_lead(
  BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_trial_lead(
  BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
) TO anon, authenticated, service_role;

-- Keep website RPC as thin wrapper for backward compatibility
CREATE OR REPLACE FUNCTION public.create_website_trial_lead(
  p_group_id BIGINT,
  p_student_full_name TEXT,
  p_student_grade TEXT,
  p_parent_name TEXT,
  p_parent_phone TEXT,
  p_needs_pickup BOOLEAN DEFAULT false
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.register_trial_lead(
    p_group_id,
    p_student_full_name,
    p_student_grade,
    p_parent_name,
    p_parent_phone,
    p_needs_pickup,
    'website',
    'website'
  );
END;
$$;

ALTER FUNCTION public.create_website_trial_lead(
  BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) OWNER TO postgres;

-- ---------------------------------------------------------------------------
-- 6) Sync attendance <-> status + instructor guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_and_guard_trial_leads()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  app_username TEXT;
BEGIN
  -- Bidirectional sync: check <-> after_class / before_class only
  IF NEW.attended_trial IS DISTINCT FROM OLD.attended_trial
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    IF NEW.attended_trial THEN
      NEW.status := 'after_class';
    ELSE
      NEW.status := 'before_class';
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.attended_trial IS NOT DISTINCT FROM OLD.attended_trial THEN
    IF NEW.status = 'after_class' THEN
      NEW.attended_trial := true;
    ELSIF NEW.status = 'before_class' THEN
      NEW.attended_trial := false;
    END IF;
    -- thinking / registered / not_interested: do not touch attendance
  END IF;

  IF NEW.attended_trial IS DISTINCT FROM OLD.attended_trial THEN
    SELECT i.username INTO app_username
    FROM public.current_app_user_identity() i;
    NEW.attended_marked_at := timezone('utc', now());
    NEW.attended_marked_by := COALESCE(app_username, NEW.updated_by, NEW.attended_marked_by);
  END IF;

  IF public.is_staff_management() THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_staff_instructor() THEN
    RAISE EXCEPTION 'Not allowed to update trial lead';
  END IF;

  IF NOT public.can_access_trial_group(OLD.group_id) THEN
    RAISE EXCEPTION 'Instructor cannot update this group trial lead';
  END IF;

  -- Instructors may only change attendance (status may change via sync above).
  -- Delivery timestamps may be set by automation triggers in the same transaction.
  IF NEW.parent_name IS DISTINCT FROM OLD.parent_name
    OR NEW.parent_phone IS DISTINCT FROM OLD.parent_phone
    OR NEW.student_full_name IS DISTINCT FROM OLD.student_full_name
    OR NEW.student_grade IS DISTINCT FROM OLD.student_grade
    OR NEW.needs_pickup_from_after_school IS DISTINCT FROM OLD.needs_pickup_from_after_school
    OR NEW.group_id IS DISTINCT FROM OLD.group_id
    OR NEW.trial_date IS DISTINCT FROM OLD.trial_date
    OR NEW.source_channel IS DISTINCT FROM OLD.source_channel
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.last_delivery_status IS DISTINCT FROM OLD.last_delivery_status
    OR NEW.last_delivery_error IS DISTINCT FROM OLD.last_delivery_error
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION 'Instructors can only update attendance fields';
  END IF;

  -- Status change allowed only as the sync of attendance
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (NEW.attended_trial = true AND NEW.status = 'after_class')
      OR (NEW.attended_trial = false AND NEW.status = 'before_class')
    ) THEN
      RAISE EXCEPTION 'Instructors can only update attendance fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trial_leads_instructor_guard ON public.trial_leads;
DROP TRIGGER IF EXISTS trg_trial_leads_sync_and_guard ON public.trial_leads;
CREATE TRIGGER trg_trial_leads_sync_and_guard
BEFORE UPDATE ON public.trial_leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_and_guard_trial_leads();

-- ---------------------------------------------------------------------------
-- 7) After-class WhatsApp automation (once)
-- ---------------------------------------------------------------------------
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
      public.build_trial_after_class_message(NEW.parent_name, NEW.student_full_name, NEW.group_id)
    );

    UPDATE public.trial_leads
    SET followup_sent_at = timezone('utc', now())
    WHERE id = NEW.id
      AND followup_sent_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trial_leads_after_class_followup ON public.trial_leads;
CREATE TRIGGER trg_trial_leads_after_class_followup
AFTER UPDATE OF status ON public.trial_leads
FOR EACH ROW
EXECUTE FUNCTION public.queue_trial_after_class_followup();

-- Ensure website source is allowed
ALTER TABLE public.trial_leads
  DROP CONSTRAINT IF EXISTS trial_leads_source_channel_check;

ALTER TABLE public.trial_leads
  ADD CONSTRAINT trial_leads_source_channel_check
    CHECK (source_channel IN ('whatsapp', 'phone', 'website'));
