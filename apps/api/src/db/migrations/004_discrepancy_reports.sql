-- Migration 004: discrepancy_reports
-- Stores user-submitted flags when vaccine recommendation data
-- appears inconsistent across sources (CDC vs country gov vs WHO).
-- Admin reviews via Supabase dashboard (Table Editor → discrepancy_reports).

CREATE TABLE IF NOT EXISTS discrepancy_reports (
  id          SERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  country_id  INT  NOT NULL REFERENCES countries(id),
  vaccine_id  INT  NOT NULL REFERENCES vaccines(id),
  notes       TEXT,                           -- optional user comment
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | reviewed | resolved
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE discrepancy_reports ENABLE ROW LEVEL SECURITY;

-- Users can submit reports
CREATE POLICY "discrepancy_reports: insert own"
  ON discrepancy_reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can see their own reports
CREATE POLICY "discrepancy_reports: select own"
  ON discrepancy_reports FOR SELECT
  USING (user_id = auth.uid());
