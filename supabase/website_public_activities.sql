-- Public read access for the Aragon website activities search page.
-- Run in Supabase SQL Editor (Role: postgres) after reviewing policies.

-- ========== groups (active clubs only) ==========
GRANT SELECT ON public.groups TO anon;

DROP POLICY IF EXISTS "groups_public_active_select" ON public.groups;

CREATE POLICY "groups_public_active_select"
ON public.groups
FOR SELECT
TO anon
USING (is_active = true);

-- ========== camps (current and upcoming) ==========
GRANT SELECT ON public.camps TO anon;

DROP POLICY IF EXISTS "camps_public_upcoming_select" ON public.camps;

CREATE POLICY "camps_public_upcoming_select"
ON public.camps
FOR SELECT
TO anon
USING (end_date >= CURRENT_DATE);

-- Verify
SELECT tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('groups', 'camps')
ORDER BY tablename, policyname;
