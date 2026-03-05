-- Migration 006: vaccine booster interval
-- Stores how often a vaccine needs to be readministered (e.g. 730 days = every 2 years).
-- NULL means a single dose provides long-term or lifelong protection.

ALTER TABLE vaccines
  ADD COLUMN IF NOT EXISTS booster_interval_days INT DEFAULT NULL;

COMMENT ON COLUMN vaccines.booster_interval_days IS
  'How often revaccination is recommended, in days. NULL = single dose / lifelong protection.';
