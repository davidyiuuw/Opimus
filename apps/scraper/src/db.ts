import { createClient } from '@supabase/supabase-js'
import { config } from './config'
import { logger } from './utils/logger'
import type { RecommendationLevel, AdvisoryLevel } from '@opimus/types'

// ─── Supabase client (service role — write access, no RLS restrictions) ─────

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  { auth: { persistSession: false } },
)

// ─── ID resolution caches ────────────────────────────────────────────────────
// Loaded once at startup — eliminates per-row DB roundtrips during the scrape loop

const countryIdCache = new Map<string, number>()  // ISO alpha-2 (uppercase) → countries.id
const vaccineIdCache = new Map<string, number>()  // disease name (lowercase) → vaccines.id

export async function loadCountryIds(): Promise<void> {
  const { data, error } = await supabase
    .from('countries')
    .select('id, code')

  if (error) throw new Error(`Failed to load countries: ${error.message}`)

  countryIdCache.clear()
  for (const row of data ?? []) {
    countryIdCache.set(row.code.toUpperCase(), row.id)
  }
  logger.info(`Loaded ${countryIdCache.size} countries into cache`)
}

export async function loadVaccineIds(): Promise<void> {
  // Join vaccines → diseases to match on disease name (CDC uses disease names, not brand names)
  const { data, error } = await supabase
    .from('vaccines')
    .select('id, diseases(name)')

  if (error) throw new Error(`Failed to load vaccines: ${error.message}`)

  vaccineIdCache.clear()
  for (const row of data ?? []) {
    const disease = Array.isArray((row as any).diseases)
      ? (row as any).diseases[0]
      : (row as any).diseases
    if (disease?.name) {
      const key = (disease.name as string).toLowerCase().trim()
      if (!vaccineIdCache.has(key)) {
        // First match wins — consistent behaviour across runs
        vaccineIdCache.set(key, row.id)
      }
    }
  }
  logger.info(`Loaded ${vaccineIdCache.size} vaccines into cache`)
}

export function resolveCountryId(isoCode: string): number | null {
  return countryIdCache.get(isoCode.toUpperCase()) ?? null
}

export function resolveVaccineId(diseaseName: string): number | null {
  return vaccineIdCache.get(diseaseName.toLowerCase().trim()) ?? null
}

// ─── Upsert helpers ───────────────────────────────────────────────────────────

export interface VaccineRecommendationRow {
  country_id: number
  vaccine_id: number
  level: RecommendationLevel
  notes: string | null
  source: string
  source_url: string | null
  last_synced_at: string
}

export async function deleteVaccineRecommendation(
  country_id: number,
  vaccine_id: number,
  source: string,
): Promise<void> {
  const { error } = await supabase
    .from('vaccine_recommendations')
    .delete()
    .match({ country_id, vaccine_id, source })

  if (error) {
    logger.error('deleteVaccineRecommendation failed', { country_id, vaccine_id, source, error: error.message })
    throw error
  }
}

export async function upsertVaccineRecommendation(row: VaccineRecommendationRow): Promise<void> {
  const { error } = await supabase
    .from('vaccine_recommendations')
    .upsert(row, {
      onConflict: 'country_id,vaccine_id,source',
      ignoreDuplicates: false,  // always overwrite level/notes/last_synced_at
    })

  if (error) {
    logger.error('upsertVaccineRecommendation failed', {
      country_id: row.country_id,
      vaccine_id: row.vaccine_id,
      source: row.source,
      error: error.message,
    })
    throw error
  }
}

export interface TravelAdvisoryRow {
  country_id: number
  level: AdvisoryLevel
  summary: string | null
  source: string
  source_url: string | null
  last_synced_at: string
  updated_at: string
}

export async function upsertTravelAdvisory(row: TravelAdvisoryRow): Promise<void> {
  const { error } = await supabase
    .from('travel_advisories')
    .upsert(row, {
      onConflict: 'country_id,source',
      ignoreDuplicates: false,
    })

  if (error) {
    logger.error('upsertTravelAdvisory failed', {
      country_id: row.country_id,
      source: row.source,
      error: error.message,
    })
    throw error
  }
}
