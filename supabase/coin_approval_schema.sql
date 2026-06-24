-- תקרת צבירת מטבעות מאושרת + תור אישורי מענקים
ALTER TABLE users ADD COLUMN IF NOT EXISTS coin_earn_cap INTEGER DEFAULT 10;

CREATE TABLE IF NOT EXISTS coin_grant_requests (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  student_username TEXT NOT NULL,
  student_full_name TEXT NOT NULL,
  group_name TEXT,
  instructor_username TEXT,
  instructor_name TEXT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason_type TEXT NOT NULL DEFAULT 'standard',
  reason_label TEXT,
  reason_emoji TEXT,
  balance_before INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL,
  threshold_crossed INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_grant_requests_status ON coin_grant_requests(status);
CREATE INDEX IF NOT EXISTS idx_coin_grant_requests_student ON coin_grant_requests(student_id, status);
