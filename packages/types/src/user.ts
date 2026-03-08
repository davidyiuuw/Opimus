export interface UserProfile {
  id: string // UUID matching auth.users
  display_name: string | null
  home_country: string // ISO 3166-1 alpha-2, default 'US'
  detail_level: 'essential' | 'full' | null
  risk_tolerance: 'all' | 'required_only' | null
  created_at: string
  updated_at: string
}

export interface UpdateProfilePayload {
  display_name?: string
  home_country?: string
  detail_level?: 'essential' | 'full'
  risk_tolerance?: 'all' | 'required_only'
}
