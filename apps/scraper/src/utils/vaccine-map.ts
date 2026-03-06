/**
 * Maps raw CDC vaccine/disease label substrings → canonical disease names.
 * Values must match exactly what is stored in the `diseases.name` column in Supabase.
 *
 * Matching strategy: lowercase the CDC label, scan keys as substrings.
 * First match wins. Unknown labels log a warning and are skipped — a human
 * should decide how to map any new CDC name, not an algorithm.
 */
export const CDC_VACCINE_NAME_MAP: Record<string, string> = {
  // Hepatitis
  'hepatitis a':            'Hepatitis A',
  'hep a':                  'Hepatitis A',
  'hepatitis b':            'Hepatitis B',
  'hep b':                  'Hepatitis B',

  // Vector-borne / tropical
  'yellow fever':           'Yellow Fever',
  'japanese encephalitis':  'Japanese Encephalitis',
  'tick-borne encephalitis': 'TBE',
  'tbe':                    'TBE',
  'dengue':                 'Dengue',
  'chikungunya':            'Chikungunya',

  // Enteric
  'typhoid':                'Typhoid',
  'cholera':                'Cholera',

  // Respiratory / other travel
  'rabies':                 'Rabies',
  'meningococcal':          'Meningococcal',
  'meningitis':             'Meningococcal',

  // Routine
  'influenza':              'Influenza',
  ' flu ':                  'Influenza',   // space-padded to avoid matching 'flu' in 'influenza'
  'covid-19':               'COVID-19',
  'covid':                  'COVID-19',
  'measles':                'MMR',
  'mmr':                    'MMR',
  'polio':                  'Polio',
  'tetanus':                'Tdap',
  'tdap':                   'Tdap',
  'varicella':              'Varicella',
  'chickenpox':             'Varicella',
  'shingles':               'Shingles',
  'zoster':                 'Shingles',
  'pneumococcal':           'Pneumococcal',
  'monkeypox':              'Mpox',
  'mpox':                   'Mpox',
}

/**
 * Diseases mentioned on CDC pages that have no vaccine.
 * The scraper logs a debug message and skips these rather than warning.
 */
export const NON_VACCINE_DISEASES = new Set([
  'malaria',
  'zika',
  "traveler's diarrhea",
  'travelers diarrhea',
  'altitude sickness',
  'jet lag',
  'sun protection',
  'insect protection',
  'routine vaccines',  // CDC header row grouping routine vaccines — not a single vaccine entry
])

/**
 * Normalize a raw CDC vaccine/disease label to a canonical disease name.
 * Returns null if unrecognised — caller should log a warning and skip.
 */
export function normalizeCdcVaccineName(raw: string): string | null {
  const lower = raw.toLowerCase().trim()

  // Skip known non-vaccine entries silently
  for (const skip of NON_VACCINE_DISEASES) {
    if (lower.includes(skip)) return null
  }

  // Direct lookup first
  if (CDC_VACCINE_NAME_MAP[lower]) return CDC_VACCINE_NAME_MAP[lower]

  // Substring scan
  for (const [key, value] of Object.entries(CDC_VACCINE_NAME_MAP)) {
    if (lower.includes(key.trim())) return value
  }

  return null
}
