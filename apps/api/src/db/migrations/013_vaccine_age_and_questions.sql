-- Add minimum age requirement to vaccines
ALTER TABLE vaccines ADD COLUMN IF NOT EXISTS min_age_years INT DEFAULT NULL;

-- Contextual questions attached to a specific country + vaccine pair
CREATE TABLE vaccine_questions (
  id            SERIAL PRIMARY KEY,
  country_id    INT  NOT NULL REFERENCES countries(id),
  vaccine_id    INT  NOT NULL REFERENCES vaccines(id),
  question_text TEXT NOT NULL,
  yes_level     TEXT NOT NULL,  -- display level when user answers Yes (e.g. 'highly_recommended')
  no_level      TEXT NOT NULL,  -- display level when user answers No (e.g. 'optional')
  yes_reasoning TEXT NOT NULL,  -- shown below the badge when user answers Yes
  UNIQUE (country_id, vaccine_id)
);

ALTER TABLE vaccine_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vaccine questions"
  ON vaccine_questions FOR SELECT USING (true);
