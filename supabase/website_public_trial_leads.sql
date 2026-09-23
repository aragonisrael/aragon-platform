-- Website self-registration for trial lessons (שיעור ניסיון)
-- Run once in Supabase SQL Editor (Role: postgres)

-- Allow "website" as a source channel
ALTER TABLE public.trial_leads
  DROP CONSTRAINT IF EXISTS trial_leads_source_channel_check;

ALTER TABLE public.trial_leads
  ADD CONSTRAINT trial_leads_source_channel_check
  CHECK (source_channel IN ('whatsapp', 'phone', 'website'));

-- History logging must run as definer so website inserts don't fail on RLS
CREATE OR REPLACE FUNCTION public.log_trial_lead_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.trial_lead_status_history (
      trial_lead_id,
      event_type,
      previous_status,
      next_status,
      previous_attended_trial,
      next_attended_trial,
      changed_by,
      note
    ) VALUES (
      NEW.id,
      'created',
      NULL,
      NEW.status,
      NULL,
      NEW.attended_trial,
      NEW.created_by,
      'trial lead created'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.attended_trial IS DISTINCT FROM OLD.attended_trial THEN
      INSERT INTO public.trial_lead_status_history (
        trial_lead_id,
        event_type,
        previous_status,
        next_status,
        previous_attended_trial,
        next_attended_trial,
        changed_by,
        note
      ) VALUES (
        NEW.id,
        CASE
          WHEN NEW.attended_trial IS DISTINCT FROM OLD.attended_trial THEN 'attendance_marked'
          ELSE 'status_changed'
        END,
        OLD.status,
        NEW.status,
        OLD.attended_trial,
        NEW.attended_trial,
        COALESCE(NEW.updated_by, NEW.attended_marked_by),
        NULL
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.log_trial_lead_changes() OWNER TO postgres;

-- Public RPC used by the website (safer than granting table INSERT to anon)
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
DECLARE
  new_id BIGINT;
  clean_student TEXT := trim(COALESCE(p_student_full_name, ''));
  clean_grade TEXT := trim(COALESCE(p_student_grade, ''));
  clean_parent TEXT := trim(COALESCE(p_parent_name, ''));
  clean_phone TEXT := trim(COALESCE(p_parent_phone, ''));
BEGIN
  IF clean_student = '' OR clean_grade = '' OR clean_parent = '' OR clean_phone = '' THEN
    RAISE EXCEPTION 'missing required fields';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND g.is_active = true
  ) THEN
    RAISE EXCEPTION 'group not available';
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
    created_by,
    updated_by
  ) VALUES (
    clean_student,
    clean_grade,
    clean_parent,
    clean_phone,
    p_group_id,
    COALESCE(p_needs_pickup, false),
    'website',
    'before_class',
    false,
    'website',
    'website'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

ALTER FUNCTION public.create_website_trial_lead(
  BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.create_website_trial_lead(
  BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_website_trial_lead(
  BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO anon, authenticated, service_role;

-- Verify
SELECT proname
FROM pg_proc
WHERE proname = 'create_website_trial_lead';
