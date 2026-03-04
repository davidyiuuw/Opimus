-- Migration 005: checklist_items
-- Stores vaccines a user wants to get for a specific destination trip.
-- Grouped by country on the Checklist tab so users can hand it to a pharmacy.

CREATE TABLE IF NOT EXISTS checklist_items (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_id  INT  NOT NULL REFERENCES countries(id),
  vaccine_id  INT  NOT NULL REFERENCES vaccines(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, country_id, vaccine_id)
);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_items: own rows"
  ON checklist_items
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
