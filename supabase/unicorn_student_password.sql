-- תלמיד יוניקורן משנה את הסיסמה שלו בלי חשבון Auth.
-- הרצה חד-פעמית ב-SQL Editor.

CREATE OR REPLACE FUNCTION public.change_unicorn_student_password(
  p_username text,
  p_old text,
  p_new text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_new IS NULL OR length(btrim(p_new)) < 8 THEN
    RAISE EXCEPTION 'הסיסמה החדשה חייבת להכיל לפחות 8 תווים';
  END IF;

  UPDATE public.users
  SET password = btrim(p_new)
  WHERE username = btrim(p_username)
    AND password = p_old
    AND role = 'unicorn_student';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'הסיסמה הנוכחית לא נכונה';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.change_unicorn_student_password(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_unicorn_student_password(text, text, text) TO anon, authenticated;
