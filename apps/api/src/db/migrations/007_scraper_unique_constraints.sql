-- Migration 007: unique constraints for idempotent scraper upserts
-- Required so apps/scraper can use ON CONFLICT upsert without duplicating rows.
-- The scraper uses source = 'cdc' | 'state_dept' | 'who' to distinguish data origins.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vaccine_recommendations_country_vaccine_source_key'
  ) THEN
    ALTER TABLE vaccine_recommendations
      ADD CONSTRAINT vaccine_recommendations_country_vaccine_source_key
      UNIQUE (country_id, vaccine_id, source);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'travel_advisories_country_source_key'
  ) THEN
    ALTER TABLE travel_advisories
      ADD CONSTRAINT travel_advisories_country_source_key
      UNIQUE (country_id, source);
  END IF;
END $$;
