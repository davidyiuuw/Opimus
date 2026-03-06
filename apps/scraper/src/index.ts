/**
 * Cron scheduler daemon — run with: pnpm dev (development) or pnpm start (production)
 *
 * Runs an immediate scrape on startup (so the first deployment seeds data
 * without waiting for the cron trigger), then schedules daily runs via node-cron.
 */

import './config'  // validates env, exits early if invalid
import cron from 'node-cron'
import { config } from './config'
import { logger } from './utils/logger'
import { loadCountryIds, loadVaccineIds } from './db'
import { runScrapeJob } from './scrape-job'

async function main(): Promise<void> {
  logger.info('Opimus Scraper daemon starting', { cronSchedule: config.cronSchedule })

  // Pre-load ID caches
  await loadCountryIds()
  await loadVaccineIds()

  // Run immediately on startup
  logger.info('Running initial scrape on startup...')
  await runScrapeJob()

  // Schedule recurring runs
  cron.schedule(
    config.cronSchedule,
    async () => {
      logger.info('Cron triggered — starting scheduled scrape')
      // Reload caches to pick up any new countries/vaccines added to DB since last run
      await loadCountryIds()
      await loadVaccineIds()
      const result = await runScrapeJob()
      if (result.errors > 0) {
        logger.warn(`Scheduled scrape finished with ${result.errors} error(s)`)
      }
    },
    { timezone: 'UTC' },
  )

  logger.info(`Cron daemon running — next trigger: ${config.cronSchedule} (UTC)`)
}

main().catch((err) => {
  logger.error('Fatal error in scraper daemon', { error: String(err) })
  process.exit(1)
})
