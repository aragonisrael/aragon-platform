-- צירוף אחריות בפרופיל הנהלה — הרץ ב-Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS responsibility_coverage_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS responsibility_coverage_department text;
