CREATE TABLE checklist_shares (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id   INT  NOT NULL REFERENCES countries(id),
  country_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  entry_date   DATE,
  vaccines     JSONB NOT NULL,  -- [{vaccine_id: INT, vaccine_name: TEXT}]
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checklist_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read shares"
  ON checklist_shares FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create shares"
  ON checklist_shares FOR INSERT
  WITH CHECK (auth.uid() = created_by);
