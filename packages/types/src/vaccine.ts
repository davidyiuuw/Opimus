export type RecommendationLevel = 'required' | 'recommended' | 'routine' | 'not_recommended'

export interface Disease {
  id: number
  slug: string
  name: string
  description: string | null
}

export interface Vaccine {
  id: number
  disease_id: number
  disease?: Disease
  name: string
  manufacturer: string | null
  doses: number
  notes: string | null
}

export interface VaccineRecommendation {
  id: number
  country_id: number
  vaccine_id: number
  vaccine?: Vaccine
  level: RecommendationLevel
  notes: string | null
  source: string
  source_url: string | null
  last_synced_at: string
}

export interface GroupedRecommendations {
  required: VaccineRecommendation[]
  recommended: VaccineRecommendation[]
  routine: VaccineRecommendation[]
}

export type DocumentType =
  | 'vaccination_card'
  | 'doctors_note'
  | 'pharmacy_record'
  | 'state_registry'
  | 'other'

export interface VaccineDocument {
  id: number
  user_vaccine_id: number
  doc_type: DocumentType
  file_url: string
  file_name: string
  uploaded_at: string
}

export interface UserVaccine {
  id: number
  user_id: string
  vaccine_id: number
  vaccine?: Vaccine
  administered_at: string | null
  notes: string | null
  created_at: string
  documents?: VaccineDocument[]
}
