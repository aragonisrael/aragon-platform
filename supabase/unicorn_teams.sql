-- נבחרות יוניקורן: חברה אמיתית + תלמידים שמשויכים אליה.
-- הרצה חד-פעמית אחרי unicorn_market_companies.sql

ALTER TABLE public.unicorn_market_companies
  ADD COLUMN IF NOT EXISTS school text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS age_group text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.unicorn_team_members (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id bigint NOT NULL REFERENCES public.unicorn_market_companies(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unicorn_team_role_check CHECK (team_role IN ('ceo', 'cto', 'cmo', 'cfo', 'founder')),
  CONSTRAINT unicorn_team_member_unique UNIQUE (company_id, user_id),
  CONSTRAINT unicorn_team_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_unicorn_team_company
  ON public.unicorn_team_members (company_id);

ALTER TABLE public.unicorn_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unicorn_team_public_read" ON public.unicorn_team_members;
CREATE POLICY "unicorn_team_public_read"
  ON public.unicorn_team_members
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "unicorn_team_reviewer_write" ON public.unicorn_team_members;
CREATE POLICY "unicorn_team_reviewer_write"
  ON public.unicorn_team_members
  FOR ALL
  TO authenticated
  USING (public.is_unicorn_reviewer() = true)
  WITH CHECK (public.is_unicorn_reviewer() = true);

GRANT SELECT ON public.unicorn_team_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.unicorn_team_members TO authenticated;
GRANT ALL ON public.unicorn_team_members TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.unicorn_team_members_id_seq TO authenticated, service_role;

DROP POLICY IF EXISTS "users_unicorn_insert_students" ON public.users;
CREATE POLICY "users_unicorn_insert_students"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_unicorn_reviewer() = true
    AND role = 'unicorn_student'
  );

DROP POLICY IF EXISTS "users_unicorn_update_students" ON public.users;
CREATE POLICY "users_unicorn_update_students"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    public.is_unicorn_reviewer() = true
    AND role = 'unicorn_student'
  )
  WITH CHECK (
    public.is_unicorn_reviewer() = true
    AND role = 'unicorn_student'
  );

DROP POLICY IF EXISTS "users_unicorn_delete_students" ON public.users;
CREATE POLICY "users_unicorn_delete_students"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    public.is_unicorn_reviewer() = true
    AND role = 'unicorn_student'
  );
