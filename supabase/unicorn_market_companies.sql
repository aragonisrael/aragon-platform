-- בורסת יוניקורן: חברות לדוגמה שהאתר והאדמין חולקים.
-- הרצה חד-פעמית ב-Supabase. אחר כך השווי משתנה ממסך יוניקורן > חברות.

CREATE TABLE IF NOT EXISTS public.unicorn_market_companies (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  ticker text NOT NULL UNIQUE,
  blurb text NOT NULL DEFAULT '',
  valuation numeric NOT NULL DEFAULT 0,
  change_percent numeric NOT NULL DEFAULT 0,
  raised_amount numeric NOT NULL DEFAULT 0,
  sparkline jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_example boolean NOT NULL DEFAULT true,
  is_listed boolean NOT NULL DEFAULT true,
  accent text NOT NULL DEFAULT '#67e8f9',
  icon text NOT NULL DEFAULT '🦄',
  award_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unicorn_market_valuation
  ON public.unicorn_market_companies (valuation DESC);

CREATE OR REPLACE FUNCTION public.touch_unicorn_market_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unicorn_market_touch ON public.unicorn_market_companies;
CREATE TRIGGER trg_unicorn_market_touch
  BEFORE UPDATE ON public.unicorn_market_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_unicorn_market_updated_at();

INSERT INTO public.unicorn_market_companies
  (name, ticker, blurb, valuation, change_percent, raised_amount, sparkline, is_example, is_listed, accent, icon, award_title)
VALUES
  ('ננו-כנף','NNF','רחפן קטן שמאתר פחי מחזור מלאים ברחבי העיר',2480000,4.8,860000,'[104,109.77,111.46,108.03,101.7,96.55,95.8,99.78,105.79,109.97,110.02,106.74,103.42,103.57,108.43,115.99,122.27,123.96,120.58,114.81,110.68,110.88,115.05,120.07]'::jsonb,true,true,'#67e8f9','🛸','החברה החדשנית של השנה'),
  ('אורביט','ORB','תיק בית ספר שנטען מהשמש בדרך ללימודים',1860000,2.1,640000,'[104,109.42,110.77,106.99,100.31,94.81,93.71,97.35,103,106.84,106.54,102.91,99.24,99.05,103.56,110.77,116.71,118.05,114.32,108.2,103.72,103.58,107.39,112.07]'::jsonb,true,true,'#fbbf24','☀️','החברה היעילה של השנה'),
  ('גל-קוד','GLC','אפליקציה שמתרגמת שפת סימנים לטקסט בזמן אמת',1540000,-1.4,510000,'[104,108.64,109.2,104.64,97.18,90.89,89.01,91.87,96.74,99.8,98.72,94.3,89.85,88.88,92.61,99.03,104.19,104.75,100.24,93.33,88.07,87.14,90.18,94.07]'::jsonb,true,true,'#fda4af','🤟','החברה עם הפיץ'' החזק של השנה'),
  ('פיקסל-גן','PXG','חיישן לעציץ הכיתתי שאומר מתי להשקות',1210000,6.2,430000,'[104,109.68,111.29,107.77,101.36,96.11,95.28,99.17,105.09,109.19,109.15,105.78,102.37,102.44,107.22,114.69,120.88,122.49,119.02,113.16,108.94,109.06,113.13,118.07]'::jsonb,true,true,'#34d399','🌱','החברה המצטיינת פיננסית של השנה'),
  ('לומנה','LMN','מנורת שולחן שנדלקת לפי שיעורי הבית',980000,0.8,300000,'[104,109.16,110.24,106.2,99.27,93.5,92.14,95.52,100.92,104.49,103.94,100.04,96.11,95.66,99.91,106.86,112.54,113.62,109.63,103.25,98.5,98.1,101.65,106.07]'::jsonb,true,true,'#c4b5fd','💡',NULL),
  ('כחול-עיר','KHL','רובוט שממיין פסולת בחצר בית הספר',760000,-2.6,220000,'[104,108.47,108.85,104.12,96.49,90.02,87.97,90.65,95.35,98.23,96.98,92.39,87.76,86.62,90.17,96.42,101.41,101.79,97.11,90.03,84.59,83.49,86.35,90.07]'::jsonb,true,true,'#93c5fd','🏙️',NULL),
  ('טעם-טק','TTM','מציל אוכל שנשאר בצהרון ומחלק אותו נכון',540000,3.3,150000,'[104,109.38,110.68,106.86,100.14,94.59,93.45,97.04,102.65,106.45,106.11,102.43,98.72,98.49,102.95,110.12,116.01,117.31,113.54,107.38,102.85,102.66,106.44,111.07]'::jsonb,true,true,'#fb923c','🍎',NULL),
  ('שביל-שקט','SHQ','מסלול בטוח להולכי רגל ליד שערי בית הספר',410000,-0.6,90000,'[104,108.86,109.63,105.29,98.05,91.98,90.32,93.39,98.48,101.75,100.89,96.69,92.46,91.7,95.65,102.29,107.67,108.44,104.15,97.46,92.42,91.71,94.96,99.07]'::jsonb,true,true,'#a5b4fc','🚸',NULL)
ON CONFLICT (ticker) DO NOTHING;

ALTER TABLE public.unicorn_market_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unicorn_market_public_read" ON public.unicorn_market_companies;
CREATE POLICY "unicorn_market_public_read"
  ON public.unicorn_market_companies
  FOR SELECT
  TO anon, authenticated
  USING (is_listed = true);

DROP POLICY IF EXISTS "unicorn_market_reviewer_write" ON public.unicorn_market_companies;
CREATE POLICY "unicorn_market_reviewer_write"
  ON public.unicorn_market_companies
  FOR ALL
  TO authenticated
  USING (public.is_unicorn_reviewer() = true)
  WITH CHECK (public.is_unicorn_reviewer() = true);

GRANT SELECT ON public.unicorn_market_companies TO anon, authenticated;
GRANT UPDATE ON public.unicorn_market_companies TO authenticated;
GRANT ALL ON public.unicorn_market_companies TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.unicorn_market_companies_id_seq TO authenticated, service_role;
