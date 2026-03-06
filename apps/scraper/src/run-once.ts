/**
 * One-shot seed script — run with: pnpm run-once
 *
 * Scrapes all 40 countries and upserts results into Supabase.
 * Exits with code 1 if any country encountered an error so CI pipelines
 * can detect failures. Safe to re-run — all upserts are idempotent.
 *
 * Before running:
 *   1. Copy .env.example → .env and fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   2. Apply migration 007 to your Supabase instance
 *   3. Ensure the vaccines and diseases tables are seeded
 */

import './config'  // validates env, exits early if invalid
import { logger } from './utils/logger'
import { loadCountryIds, loadVaccineIds } from './db'
import { runScrapeJob } from './scrape-job'

async function main(): Promise<void> {
  logger.info('=== Opimus Scraper: run-once ===')

  await loadCountryIds()
  await loadVaccineIds()

  const result = await runScrapeJob()

  if (result.errors > 0) {
    logger.warn(`Finished with ${result.errors} error(s). Review logs above.`)
    process.exit(1)
  }

  logger.info('=== run-once complete — all done! ===')
  process.exit(0)
}

main().catch((err) => {
  logger.error('Fatal error', { error: String(err) })
  process.exit(1)
})
