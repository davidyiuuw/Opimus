-- Add role-based access control to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'org_admin', 'org_member'));

-- Scraper proposals: staged changes from CDC awaiting admin review
CREATE TABLE scraper_proposals (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id          INT  NOT NULL REFERENCES countries(id),
  vaccine_id          INT  NOT NULL REFERENCES vaccines(id),
  source              TEXT NOT NULL,
  -- Snapshot of current live values (NULL = this is a brand-new entry)
  current_level       TEXT,
  current_notes       TEXT,
  current_source_url  TEXT,
  -- What the scraper found
  proposed_level      TEXT NOT NULL,
  proposed_notes      TEXT,
  proposed_source_url TEXT,
  is_new_entry        BOOLEAN NOT NULL DEFAULT FALSE,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Only one pending proposal per (country, vaccine, source) at a time
CREATE UNIQUE INDEX scraper_proposals_pending_unique
  ON scraper_proposals (country_id, vaccine_id, source)
  WHERE status = 'pending';

ALTER TABLE scraper_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read proposals"
  ON scraper_proposals FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update proposals"
  ON scraper_proposals FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
