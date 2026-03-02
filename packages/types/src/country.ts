export interface Country {
  id: number
  code: string // ISO 3166-1 alpha-2, e.g. 'JP', 'BR'
  name: string
  region: string | null
  created_at: string
}

export interface CountrySearchResult {
  id: number
  code: string
  name: string
  region: string | null
}
