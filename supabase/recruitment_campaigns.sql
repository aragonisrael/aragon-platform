-- דרושים: קמפייני גיוס + מועמדים
-- הרצה חד-פעמית ב-Supabase SQL Editor (Role: postgres)
--
-- קליטה ציבורית (אתר / פייסבוק) עוברת רק דרך:
--   get_public_recruitment_campaign(slug)
--   submit_recruitment_application(...)
-- האדמין קורא וכותב לטבלאות ישירות (RLS: admin / management).

CREATE TABLE IF NOT EXISTS public.recruitment_campaigns (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  instructors_needed INTEGER NOT NULL DEFAULT 0 CHECK (instructors_needed >= 0),
  assistants_needed INTEGER NOT NULL DEFAULT 0 CHECK (assistants_needed >= 0),
  managers_needed INTEGER NOT NULL DEFAULT 0 CHECK (managers_needed >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recruitment_candidates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES public.recruitment_campaigns(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INTEGER,
  city TEXT,
  phone TEXT,
  computer_knowledge TEXT,
  teaching_experience TEXT,
  hourly_rate NUMERIC(8,2),
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'not_contacted',
  role TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_candidates_status_check CHECK (
    status IN ('not_contacted', 'accepted', 'waiting', 'not_relevant')
  ),
  CONSTRAINT recruitment_candidates_role_check CHECK (
    role IS NULL OR role IN ('assistant', 'instructor', 'pro_instructor', 'manager', 'logistics')
  ),
  CONSTRAINT recruitment_candidates_source_check CHECK (
    source IN ('manual', 'website', 'facebook', 'partners')
  )
);

CREATE INDEX IF NOT EXISTS recruitment_candidates_campaign_idx
  ON public.recruitment_candidates (campaign_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_recruitment_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recruitment_campaigns_touch ON public.recruitment_campaigns;
CREATE TRIGGER trg_recruitment_campaigns_touch
BEFORE UPDATE ON public.recruitment_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.touch_recruitment_row();

DROP TRIGGER IF EXISTS trg_recruitment_candidates_touch ON public.recruitment_candidates;
CREATE TRIGGER trg_recruitment_candidates_touch
BEFORE UPDATE ON public.recruitment_candidates
FOR EACH ROW
EXECUTE FUNCTION public.touch_recruitment_row();

ALTER TABLE public.recruitment_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recruitment_campaigns_admin_all" ON public.recruitment_campaigns;
DROP POLICY IF EXISTS "recruitment_candidates_admin_all" ON public.recruitment_candidates;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_candidates TO authenticated;
REVOKE ALL ON public.recruitment_campaigns FROM anon;
REVOKE ALL ON public.recruitment_candidates FROM anon;

GRANT USAGE, SELECT ON SEQUENCE public.recruitment_campaigns_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.recruitment_candidates_id_seq TO authenticated;

CREATE POLICY "recruitment_campaigns_admin_all"
ON public.recruitment_campaigns
FOR ALL TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

CREATE POLICY "recruitment_candidates_admin_all"
ON public.recruitment_candidates
FOR ALL TO authenticated
USING (public.is_staff_management() = true)
WITH CHECK (public.is_staff_management() = true);

INSERT INTO public.recruitment_campaigns (name, slug)
VALUES ('קמפיין גיוס - קייטנת חנוכה 2026', 'hanukkah-camp-2026')
ON CONFLICT (slug) DO NOTHING;

-- שם + האם פתוח. בלי יעדים ובלי מועמדים.
CREATE OR REPLACE FUNCTION public.get_public_recruitment_campaign(p_slug text)
RETURNS TABLE (name text, slug text, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.name, c.slug, c.is_active
  FROM public.recruitment_campaigns c
  WHERE c.slug = trim(COALESCE(p_slug, ''))
  LIMIT 1;
$$;

ALTER FUNCTION public.get_public_recruitment_campaign(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_recruitment_campaign(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_recruitment_campaign(text) TO anon, authenticated, service_role;

-- צינור אחד לאתר, לפייסבוק ולמשתפי פעולה. source: website | facebook | partners
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

ALTER FUNCTION public.submit_recruitment_application(
  text, text, text, integer, text, text, text, numeric, text
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.submit_recruitment_application(
  text, text, text, integer, text, text, text, numeric, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_recruitment_application(
  text, text, text, integer, text, text, text, numeric, text
) TO anon, authenticated, service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_candidates;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
