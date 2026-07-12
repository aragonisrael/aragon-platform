-- RLS לטבלאות לוגיסטיקה (שלב א׳ — בלי לשבור מדריך)
-- הרץ עם Role = postgres
-- רק אחרי שווידאנו שהתחברות לוגיסטיקה עובדת ב-Vercel
--
-- מאובטח עכשיו (לוגיסטיקה + אדמין בלבד):
--   network_procurement, procurement_budget, logistics_field_tasks,
--   trips, equipment_transfers
--
-- נשאר לשלב מדריך (משותף עם instructor):
--   instructor_gear, faults, camps, camp_compounds

ALTER TABLE public.network_procurement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_field_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_procurement_staff" ON public.network_procurement;
DROP POLICY IF EXISTS "logistics_budget_staff" ON public.procurement_budget;
DROP POLICY IF EXISTS "logistics_field_tasks_staff" ON public.logistics_field_tasks;
DROP POLICY IF EXISTS "logistics_trips_staff" ON public.trips;
DROP POLICY IF EXISTS "logistics_transfers_staff" ON public.equipment_transfers;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_procurement TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_budget TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistics_field_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_transfers TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

REVOKE ALL ON public.network_procurement FROM anon;
REVOKE ALL ON public.procurement_budget FROM anon;
REVOKE ALL ON public.logistics_field_tasks FROM anon;
REVOKE ALL ON public.trips FROM anon;
REVOKE ALL ON public.equipment_transfers FROM anon;

CREATE POLICY "logistics_procurement_staff"
ON public.network_procurement
FOR ALL TO authenticated
USING (public.is_staff_logistics() = true)
WITH CHECK (public.is_staff_logistics() = true);

CREATE POLICY "logistics_budget_staff"
ON public.procurement_budget
FOR ALL TO authenticated
USING (public.is_staff_logistics() = true)
WITH CHECK (public.is_staff_logistics() = true);

CREATE POLICY "logistics_field_tasks_staff"
ON public.logistics_field_tasks
FOR ALL TO authenticated
USING (public.is_staff_logistics() = true)
WITH CHECK (public.is_staff_logistics() = true);

CREATE POLICY "logistics_trips_staff"
ON public.trips
FOR ALL TO authenticated
USING (public.is_staff_logistics() = true)
WITH CHECK (public.is_staff_logistics() = true);

CREATE POLICY "logistics_transfers_staff"
ON public.equipment_transfers
FOR ALL TO authenticated
USING (public.is_staff_logistics() = true)
WITH CHECK (public.is_staff_logistics() = true);

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'network_procurement',
    'procurement_budget',
    'logistics_field_tasks',
    'trips',
    'equipment_transfers'
  )
ORDER BY tablename, policyname;
