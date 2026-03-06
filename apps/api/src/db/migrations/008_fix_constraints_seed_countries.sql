-- Migration 008: drop old single-column unique constraint on travel_advisories
-- and seed the 25 countries missing from the initial DB population.

-- Fix 1: drop old travel_advisories_country_id_key (blocks multi-source upserts)
ALTER TABLE travel_advisories
  DROP CONSTRAINT IF EXISTS travel_advisories_country_id_key;

-- Fix 2: seed missing countries
INSERT INTO countries (code, name, region) VALUES
  ('VN', 'Vietnam',              'Southeast Asia'),
  ('KH', 'Cambodia',             'Southeast Asia'),
  ('MY', 'Malaysia',             'Southeast Asia'),
  ('SG', 'Singapore',            'Southeast Asia'),
  ('NP', 'Nepal',                'South Asia'),
  ('KR', 'South Korea',          'East Asia'),
  ('HK', 'Hong Kong',            'East Asia'),
  ('TZ', 'Tanzania',             'Africa'),
  ('ET', 'Ethiopia',             'Africa'),
  ('UG', 'Uganda',               'Africa'),
  ('CO', 'Colombia',             'Latin America'),
  ('AR', 'Argentina',            'Latin America'),
  ('EC', 'Ecuador',              'Latin America'),
  ('IT', 'Italy',                'Europe'),
  ('ES', 'Spain',                'Europe'),
  ('DE', 'Germany',              'Europe'),
  ('GR', 'Greece',               'Europe'),
  ('PT', 'Portugal',             'Europe'),
  ('AU', 'Australia',            'Oceania'),
  ('NZ', 'New Zealand',          'Oceania'),
  ('CA', 'Canada',               'North America'),
  ('AE', 'United Arab Emirates', 'Middle East'),
  ('TR', 'Turkey',               'Middle East'),
  ('IL', 'Israel',               'Middle East'),
  ('JO', 'Jordan',               'Middle East')
ON CONFLICT (code) DO NOTHING;
