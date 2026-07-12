-- ניקוי policies ישנות/פתוחות ממודול לוגיסטיקה
-- הרץ עם Role = postgres
-- משאיר רק את ה-policies של staff (לוגיסטיקה+אדמין)

-- trips
DROP POLICY IF EXISTS "Allow anon access to trips" ON public.trips;
DROP POLICY IF EXISTS "Allow public access to trips" ON public.trips;

-- equipment_transfers
DROP POLICY IF EXISTS "Allow anon access to transfers" ON public.equipment_transfers;
DROP POLICY IF EXISTS "Allow public access to transfers" ON public.equipment_transfers;

-- logistics_field_tasks
DROP POLICY IF EXISTS "logistics_field_tasks_public_insert" ON public.logistics_field_tasks;
DROP POLICY IF EXISTS "logistics_field_tasks_public_read" ON public.logistics_field_tasks;
DROP POLICY IF EXISTS "logistics_field_tasks_public_update" ON public.logistics_field_tasks;
DROP POLICY IF EXISTS "logistics_field_tasks_public_delete" ON public.logistics_field_tasks;

-- וידוא ש-anon חסום
REVOKE ALL ON public.network_procurement FROM anon;
REVOKE ALL ON public.procurement_budget FROM anon;
REVOKE ALL ON public.logistics_field_tasks FROM anon;
REVOKE ALL ON public.trips FROM anon;
REVOKE ALL ON public.equipment_transfers FROM anon;

-- בדיקה: אמור להישאר רק *_staff
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
