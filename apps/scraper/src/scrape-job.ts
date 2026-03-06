/**
 * Core scrape loop — shared by run-once.ts (seed script) and index.ts (cron daemon).
 * Processes all 40 countries sequentially with a polite delay between each.
 */

import { config } from './config'
import { logger } from './utils/logger'
import { delay } from './utils/delay'
import { TOP_40_COUNTRIES } from './countries'
import {
  resolveCountryId,
  resolveVaccineId,
  upsertVaccineRecommendation,
  deleteVaccineRecommendation,
  upsertTravelAdvisory,
} from './db'
import { scrapeCdcCountry } from './scrapers/cdc'
import { scrapeStateDeptCountry } from './scrapers/state-dept'

export interface ScrapeJobResult {
  totalVaccines: number
  totalAdvisories: number
  skipped: number
  errors: number
  durationMs: number
}

export async function runScrapeJob(): Promise<ScrapeJobResult> {
  const startedAt = Date.now()
  const now = new Date().toISOString()
  let totalVaccines = 0
  let totalAdvisories = 0
  let skipped = 0
  let errors = 0

  logger.info(`Starting scrape job — ${TOP_40_COUNTRIES.length} countries`)

  for (let i = 0; i < TOP_40_COUNTRIES.length; i++) {
    const country = TOP_40_COUNTRIES[i]
    logger.info(`[${i + 1}/${TOP_40_COUNTRIES.length}] ${country.name}`)

    const countryId = resolveCountryId(country.code)
    if (!countryId) {
      logger.warn('Country not found in DB — skipping', { code: country.code, name: country.name })
      skipped++
      continue
    }

    // ── CDC vaccine recommendations ─────────────────────────────────────────

    try {
      const cdcResults = await scrapeCdcCountry(country.cdcSlug)
      logger.info(`  CDC: ${cdcResults.length} vaccines scraped`, { country: country.name })

      for (const rec of cdcResults) {
        const vaccineId = resolveVaccineId(rec.canonicalDiseaseName)
        if (!vaccineId) {
          logger.warn('  Vaccine not in DB — skipping', {
            country: country.name,
            canonical: rec.canonicalDiseaseName,
            raw: rec.vaccineName,
          })
          skipped++
          continue
        }

        // CDC explicitly says not recommended — remove any stale record and skip
        if (rec.level === 'not_recommended') {
          await deleteVaccineRecommendation(countryId, vaccineId, 'cdc')
          logger.debug('  CDC: removed not_recommended record', {
            country: country.name,
            canonical: rec.canonicalDiseaseName,
          })
          continue
        }

        await upsertVaccineRecommendation({
          country_id: countryId,
          vaccine_id: vaccineId,
          level: rec.level,
          notes: rec.notes,
          source: 'cdc',
          source_url: rec.sourceUrl,
          last_synced_at: now,
        })
        totalVaccines++
      }
    } catch (err) {
      logger.error('  CDC scrape error', { country: country.name, error: String(err) })
      errors++
    }

    // Brief delay between the two requests for the same country
    await delay(Math.round(config.fetchDelayMs / 2))

    // ── State Dept travel advisory ──────────────────────────────────────────

    try {
      const advisory = await scrapeStateDeptCountry(country.stateDeptSlug)
      if (advisory) {
        await upsertTravelAdvisory({
          country_id: countryId,
          level: advisory.level,
          summary: advisory.summary,
          source: 'state_dept',
          source_url: advisory.sourceUrl,
          last_synced_at: now,
          updated_at: advisory.updatedAt,
        })
        totalAdvisories++
        logger.info(`  State Dept: ${advisory.level}`, { country: country.name })
      } else {
        logger.warn('  State Dept: no advisory returned', { country: country.name })
      }
    } catch (err) {
      logger.error('  State Dept scrape error', { country: country.name, error: String(err) })
      errors++
    }

    // Polite delay before moving to next country (skip on last iteration)
    if (i < TOP_40_COUNTRIES.length - 1) {
      await delay(config.fetchDelayMs)
    }
  }

  const durationMs = Date.now() - startedAt

  const result: ScrapeJobResult = { totalVaccines, totalAdvisories, skipped, errors, durationMs }
  logger.info('Scrape job complete', result as unknown as Record<string, unknown>)

  return result
}
