-- מוסיף מקור "partners" (תגית: משתפי פעולה) לטופס הדרושים.
-- הרצה חד-פעמית ב-Supabase SQL Editor.

ALTER TABLE public.recruitment_candidates
  DROP CONSTRAINT IF EXISTS recruitment_candidates_source_check;

ALTER TABLE public.recruitment_candidates
  ADD CONSTRAINT recruitment_candidates_source_check
  CHECK (source IN ('manual', 'website', 'facebook', 'partners'));

CREATE OR REPLACE FUNCTION public.submit_recruitment_application(
  p_campaign_slug text,
  p_full_name text,
  p_phone text,
  p_age integer DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_computer_knowledge text DEFAULT NULL,
  p_teaching_experience text DEFAULT NULL,
  p_hourly_rate numeric DEFAULT NULL,
  p_source text DEFAULT 'website'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campaign_row public.recruitment_campaigns%ROWTYPE;
  new_id bigint;
  clean_name text := left(trim(COALESCE(p_full_name, '')), 120);
  clean_phone text := left(trim(COALESCE(p_phone, '')), 30);
  phone_digits text := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  clean_city text := NULLIF(left(trim(COALESCE(p_city, '')), 80), '');
  clean_computer text := NULLIF(left(trim(COALESCE(p_computer_knowledge, '')), 2000), '');
  clean_experience text := NULLIF(left(trim(COALESCE(p_teaching_experience, '')), 2000), '');
  clean_source text := lower(trim(COALESCE(p_source, '')));
  clean_age integer := p_age;
  clean_rate numeric := p_hourly_rate;
BEGIN
  IF clean_name = '' THEN
    RAISE EXCEPTION 'missing name';
  END IF;

  IF length(phone_digits) < 9 THEN
    RAISE EXCEPTION 'invalid phone';
  END IF;

  IF clean_source NOT IN ('website', 'facebook', 'partners') THEN
    RAISE EXCEPTION 'invalid source';
  END IF;

  SELECT * INTO campaign_row
  FROM public.recruitment_campaigns c
  WHERE c.slug = trim(COALESCE(p_campaign_slug, ''))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign not found';
  END IF;

  IF campaign_row.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'campaign closed';
  END IF;

  IF clean_age IS NOT NULL AND (clean_age < 14 OR clean_age > 80) THEN
    clean_age := NULL;
  END IF;

  IF clean_rate IS NOT NULL AND (clean_rate < 0 OR clean_rate > 10000) THEN
    clean_rate := NULL;
  END IF;

  INSERT INTO public.recruitment_candidates (
    campaign_id,
    full_name,
    age,
    city,
    phone,
    computer_knowledge,
    teaching_experience,
    hourly_rate,
    status,
    source
  ) VALUES (
    campaign_row.id,
    clean_name,
    clean_age,
    clean_city,
    clean_phone,
    clean_computer,
    clean_experience,
    clean_rate,
    'not_contacted',
    clean_source
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
