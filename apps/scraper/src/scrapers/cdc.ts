import * as cheerio from 'cheerio'
import { normalizeCdcVaccineName, NON_VACCINE_DISEASES } from '../utils/vaccine-map'
import { logger } from '../utils/logger'
import type { RecommendationLevel } from '@opimus/types'

const CDC_BASE_URL = 'https://wwwnc.cdc.gov/travel/destinations/traveler/none'

export interface ScrapedVaccineRecommendation {
  vaccineName: string           // raw CDC label (for debugging)
  canonicalDiseaseName: string  // after normalizeCdcVaccineName()
  level: RecommendationLevel
  notes: string | null
  sourceUrl: string
}

export async function scrapeCdcCountry(slug: string): Promise<ScrapedVaccineRecommendation[]> {
  const url = `${CDC_BASE_URL}/${slug}`
  const html = await fetchHtml(url)
  if (!html) return []

  const $ = cheerio.load(html)
  const results: ScrapedVaccineRecommendation[] = []
  const seen = new Set<string>()

  function addResult(rec: ScrapedVaccineRecommendation): void {
    const key = rec.canonicalDiseaseName.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    results.push(rec)
  }

  // CDC pages use tables with id="dest-vm-a" (and class="disease") where each row has:
  //   td.clinician-disease  — disease/vaccine name (often wrapped in <a>)
  //   td.clinician-recomendations — recommendation text (note: CDC typo "recomendations")
  $('table#dest-vm-a tbody tr, table.disease tbody tr').each((_i, tr) => {
    // Skip header rows
    if ($(tr).find('th').length > 0) return

    const cells = $(tr).find('td')
    if (cells.length < 2) return

    const diseaseCell = $(tr).find('td.clinician-disease')
    const recCell = $(tr).find('td.clinician-recomendations')

    // Require at least the disease cell to be present with the expected class
    if (!diseaseCell.length) return

    // Prefer the link text inside the disease cell; fall back to full cell text
    const rawName = (diseaseCell.find('a').first().text().trim() || diseaseCell.text().trim())
    const recText = recCell.text()

    if (!rawName) return

    const lower = rawName.toLowerCase()
    if (isNonVaccine(lower)) {
      logger.debug('CDC: skipping non-vaccine', { rawName })
      return
    }

    const canonical = normalizeCdcVaccineName(rawName)
    if (!canonical) {
      logger.warn('CDC: unrecognised vaccine name — add to vaccine-map.ts', { rawName, url })
      return
    }

    const level = inferLevel(recText)
    const notes = cleanNotes(recText)

    addResult({ vaccineName: rawName, canonicalDiseaseName: canonical, level, notes, sourceUrl: url })
  })

  if (results.length === 0) {
    logger.warn('CDC: no vaccines found', { slug, url })
  }

  return results
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNonVaccine(lower: string): boolean {
  for (const skip of NON_VACCINE_DISEASES) {
    if (lower.includes(skip)) return true
  }
  return false
}

function inferLevel(text: string): RecommendationLevel {
  const lower = text.toLowerCase()

  // Entry/country requirement — but only when not explicitly negated ("not required")
  if (!lower.includes('not required')) {
    if (lower.includes('required by the country') || lower.includes('entry requirement') ||
        lower.includes('proof of vaccination required') || lower.includes('certificate of vaccination')) {
      return 'required'
    }
  }

  if (lower.includes('routine') || lower.includes('up-to-date') || lower.includes('up to date') ||
      lower.includes('all people should')) {
    return 'routine'
  }

  // Check negation before positive match to avoid "not recommended" → 'recommended'
  if (lower.includes('not recommended')) return 'not_recommended'

  if (lower.includes('recommended for most') || lower.includes('recommended for all') ||
      lower.includes('recommended for unvaccinated') || lower.includes('recommended')) {
    return 'recommended'
  }

  return 'recommended'  // safe default — better to over-recommend than under-recommend
}

function cleanNotes(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null
  return trimmed.length > 500 ? trimmed.substring(0, 500) + '…' : trimmed
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Opimus/1.0 Travel Health Aggregator (contact: admin@opimus.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    if (!resp.ok) {
      logger.warn('CDC: non-200 response', { url, status: resp.status })
      return null
    }
    return resp.text()
  } catch (err) {
    logger.error('CDC: fetch failed', { url, error: String(err) })
    return null
  }
}
