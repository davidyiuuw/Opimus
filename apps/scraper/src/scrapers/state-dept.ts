import * as cheerio from 'cheerio'
import { logger } from '../utils/logger'
import type { AdvisoryLevel } from '@opimus/types'

const STATE_DEPT_BASE =
  'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories'

export interface ScrapedAdvisory {
  level: AdvisoryLevel
  summary: string | null
  updatedAt: string   // ISO datetime string
  sourceUrl: string
}

export async function scrapeStateDeptCountry(slug: string): Promise<ScrapedAdvisory | null> {
  const url = `${STATE_DEPT_BASE}/${slug}-travel-advisory.html`
  const html = await fetchHtml(url)
  if (!html) return null

  const $ = cheerio.load(html)

  // Advisory level lives in an <h2> like:
  //   "Thailand - Level 2: Exercise Increased Caution"
  //   "Kenya - Level 2: Exercise Increased Caution"
  let level: AdvisoryLevel | null = null

  $('h1, h2, h3').each((_i, el) => {
    const text = $(el).text()
    const parsed = parseAdvisoryLevel(text)
    if (parsed) {
      level = parsed
      return false // break .each()
    }
  })

  // Fallback: some pages embed the level in a <span> or badge element
  if (!level) {
    $('[class*="level"], [class*="advisory"], [class*="alert"]').each((_i, el) => {
      const text = $(el).text()
      const parsed = parseAdvisoryLevel(text)
      if (parsed) {
        level = parsed
        return false
      }
    })
  }

  // Fallback: pages with regional sub-advisories (e.g. Israel) use <p><b> text
  if (!level) {
    $('p, b, strong').each((_i, el) => {
      const text = $(el).text()
      const parsed = parseAdvisoryLevel(text)
      if (parsed) {
        level = parsed
        return false
      }
    })
  }

  if (!level) {
    logger.warn('State Dept: could not parse advisory level', { slug, url })
    return null
  }

  const updatedAt = parseUpdatedDate($) ?? new Date().toISOString()
  const summary = parseSummary($)

  return { level, summary, updatedAt, sourceUrl: url }
}

// ─── Level parser ─────────────────────────────────────────────────────────────

function parseAdvisoryLevel(text: string): AdvisoryLevel | null {
  const lower = text.toLowerCase()

  // Standard format: "Level 2: Exercise Increased Caution"
  const match = lower.match(/level\s+(\d)/)
  if (match) {
    const n = parseInt(match[1], 10)
    const map: Record<number, AdvisoryLevel> = {
      1: '1_normal',
      2: '2_increased_caution',
      3: '3_reconsider',
      4: '4_do_not_travel',
    }
    return map[n] ?? null
  }

  // Text-based format used on pages with regional sub-advisories (e.g. Israel)
  if (lower.includes('do not travel')) return '4_do_not_travel'
  if (lower.includes('reconsider travel')) return '3_reconsider'
  if (lower.includes('exercise increased caution')) return '2_increased_caution'
  if (lower.includes('exercise normal precautions')) return '1_normal'

  return null
}

// ─── Date parser ─────────────────────────────────────────────────────────────

function parseUpdatedDate($: cheerio.CheerioAPI): string | null {
  let result: string | null = null

  $('p, span, div, li').each((_i, el) => {
    const text = $(el).text()
    if (!/last update|reissued|updated|issued/i.test(text)) return

    // Match "October 25, 2024" or "2024-10-25" or "Oct 25, 2024"
    const dateMatch = text.match(/(\w+ \d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/i)
    if (dateMatch) {
      const parsed = new Date(dateMatch[1])
      if (!isNaN(parsed.getTime())) {
        result = parsed.toISOString()
        return false // break
      }
    }
  })

  return result
}

// ─── Summary parser ──────────────────────────────────────────────────────────

function parseSummary($: cheerio.CheerioAPI): string | null {
  const candidates: string[] = []

  // Try known State Dept content selectors first, then fall back to generic <p>
  const selectors = [
    '.tsg-rwd-main-copy-body p',
    '.country-content p',
    'article p',
    'main p',
    '.content p',
  ]

  for (const sel of selectors) {
    $(sel).each((_i, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ')
      // Skip boilerplate/nav paragraphs
      if (text.length > 50 && !/cookie|javascript|skip to|©/i.test(text)) {
        candidates.push(text)
      }
    })
    if (candidates.length > 0) break
  }

  if (candidates.length === 0) return null
  return candidates[0].substring(0, 1000)
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
      logger.warn('State Dept: non-200 response', { url, status: resp.status })
      return null
    }
    return resp.text()
  } catch (err) {
    logger.error('State Dept: fetch failed', { url, error: String(err) })
    return null
  }
}
