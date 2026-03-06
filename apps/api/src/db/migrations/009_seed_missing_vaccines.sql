-- Migration 009: seed diseases and vaccines that the scraper was producing but skipping.
-- All inserts are idempotent — safe to re-run.

-- ── Diseases ──────────────────────────────────────────────────────────────────
-- ON CONFLICT (slug) DO NOTHING handles any diseases already present.

INSERT INTO diseases (slug, name) VALUES
  ('covid-19',      'COVID-19'),
  ('chikungunya',   'Chikungunya'),
  ('mmr',           'MMR'),
  ('meningococcal', 'Meningococcal'),
  ('mpox',          'Mpox'),
  ('polio',         'Polio'),
  ('tbe',           'TBE')
ON CONFLICT (slug) DO NOTHING;

-- ── Vaccines ─────────────────────────────────────────────────────────────────
-- Look up disease by slug (not name) so it works even if an existing disease
-- row has a slightly different name.
-- booster_interval_days: NULL = single dose / long-term protection.

INSERT INTO vaccines (disease_id, name, doses, booster_interval_days)
SELECT d.id, 'COVID-19 Vaccine', 2, 365
FROM diseases d WHERE d.slug = 'covid-19'
  AND NOT EXISTS (SELECT 1 FROM vaccines WHERE disease_id = d.id);

INSERT INTO vaccines (disease_id, name, doses, booster_interval_days)
SELECT d.id, 'Chikungunya Vaccine (Ixchiq)', 1, NULL
FROM diseases d WHERE d.slug = 'chikungunya'
  AND NOT EXISTS (SELECT 1 FROM vaccines WHERE disease_id = d.id);

INSERT INTO vaccines (disease_id, name, doses, booster_interval_days)
SELECT d.id, 'MMR Vaccine', 2, NULL
FROM diseases d WHERE d.slug = 'mmr'
  AND NOT EXISTS (SELECT 1 FROM vaccines WHERE disease_id = d.id);

INSERT INTO vaccines (disease_id, name, doses, booster_interval_days)
SELECT d.id, 'Meningococcal Vaccine (MenACWY)', 1, 1825
FROM diseases d WHERE d.slug = 'meningococcal'
  AND NOT EXISTS (SELECT 1 FROM vaccines WHERE disease_id = d.id);

INSERT INTO vaccines (disease_id, name, doses, booster_interval_days)
SELECT d.id, 'Mpox Vaccine (JYNNEOS)', 2, NULL
FROM diseases d WHERE d.slug = 'mpox'
  AND NOT EXISTS (SELECT 1 FROM vaccines WHERE disease_id = d.id);

INSERT INTO vaccines (disease_id, name, doses, booster_interval_days)
SELECT d.id, 'Polio Vaccine (IPV)', 4, NULL
FROM diseases d WHERE d.slug = 'polio'
  AND NOT EXISTS (SELECT 1 FROM vaccines WHERE disease_id = d.id);

INSERT INTO vaccines (disease_id, name, doses, booster_interval_days)
SELECT d.id, 'TBE Vaccine', 3, 1095
FROM diseases d WHERE d.slug = 'tbe'
  AND NOT EXISTS (SELECT 1 FROM vaccines WHERE disease_id = d.id);
