-- שלב 1A: הוספת עמודה בלבד (בלי Foreign Key)
-- הרץ קודם רק את זה

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
  ON public.users(auth_user_id);
