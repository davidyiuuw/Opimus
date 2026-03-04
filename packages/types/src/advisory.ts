export type AdvisoryLevel =
  | '1_normal'
  | '2_increased_caution'
  | '3_reconsider'
  | '4_do_not_travel'

export const ADVISORY_LABELS: Record<AdvisoryLevel, string> = {
  '1_normal': 'Level 1 — Exercise Normal Precautions',
  '2_increased_caution': 'Level 2 — Exercise Increased Caution',
  '3_reconsider': 'Level 3 — Reconsider Travel',
  '4_do_not_travel': 'Level 4 — Do Not Travel',
}

export const ADVISORY_DESCRIPTIONS: Record<AdvisoryLevel, string> = {
  '1_normal': 'This destination is considered safe for typical travel. Follow normal safety practices.',
  '2_increased_caution': 'The U.S. State Department advises heightened awareness due to crime, civil unrest, or other risks. Research local conditions before your trip.',
  '3_reconsider': 'Serious risks such as crime, civil unrest, or health hazards are present. Reconsider whether travel is necessary.',
  '4_do_not_travel': 'The U.S. State Department advises against all travel to this destination due to extreme safety or security risks.',
}

export const ADVISORY_COLORS: Record<AdvisoryLevel, string> = {
  '1_normal': '#2E7D32',       // green
  '2_increased_caution': '#F57C00', // orange
  '3_reconsider': '#C62828',   // red
  '4_do_not_travel': '#4A148C', // dark purple
}

export interface TravelAdvisory {
  id: number
  country_id: number
  level: AdvisoryLevel
  summary: string | null
  source: string
  source_url: string | null
  last_synced_at: string
  updated_at: string
}
