-- Update trial WhatsApp message copy
-- Run once in Supabase SQL Editor as postgres

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
