ALTER TABLE users
  ADD COLUMN IF NOT EXISTS detail_level TEXT
    CHECK (detail_level IN ('essential', 'full')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS risk_tolerance TEXT
    CHECK (risk_tolerance IN ('all', 'required_only')) DEFAULT NULL;
