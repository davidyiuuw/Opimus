export interface UserProfile {
  id: string // UUID matching auth.users
  display_name: string | null
  home_country: string // ISO 3166-1 alpha-2, default 'US'
  created_at: string
  updated_at: string
}

export interface UpdateProfilePayload {
  display_name?: string
  home_country?: string
}
