export interface CountryEntry {
  code: string           // ISO 3166-1 alpha-2 — must match countries.code in Supabase
  name: string           // human-readable label for logs
  cdcSlug: string        // https://wwwnc.cdc.gov/travel/destinations/traveler/none/[cdcSlug]
  stateDeptSlug: string  // https://travel.state.gov/.../[stateDeptSlug]-travel-advisory.html
}

export const TOP_40_COUNTRIES: CountryEntry[] = [
  // ── Southeast Asia ────────────────────────────────────────────────────────
  { code: 'TH', name: 'Thailand',     cdcSlug: 'thailand',              stateDeptSlug: 'thailand' },
  { code: 'VN', name: 'Vietnam',      cdcSlug: 'vietnam',               stateDeptSlug: 'vietnam' },
  { code: 'ID', name: 'Indonesia',    cdcSlug: 'indonesia',             stateDeptSlug: 'indonesia' },
  { code: 'PH', name: 'Philippines',  cdcSlug: 'philippines',           stateDeptSlug: 'philippines' },
  { code: 'KH', name: 'Cambodia',     cdcSlug: 'cambodia',              stateDeptSlug: 'cambodia' },
  { code: 'MY', name: 'Malaysia',     cdcSlug: 'malaysia',              stateDeptSlug: 'malaysia' },
  { code: 'SG', name: 'Singapore',    cdcSlug: 'singapore',             stateDeptSlug: 'singapore' },

  // ── South Asia ────────────────────────────────────────────────────────────
  { code: 'IN', name: 'India',        cdcSlug: 'india',                 stateDeptSlug: 'india' },
  { code: 'NP', name: 'Nepal',        cdcSlug: 'nepal',                 stateDeptSlug: 'nepal' },

  // ── East Asia ─────────────────────────────────────────────────────────────
  { code: 'JP', name: 'Japan',        cdcSlug: 'japan',                 stateDeptSlug: 'japan' },
  { code: 'KR', name: 'South Korea',  cdcSlug: 'south-korea',           stateDeptSlug: 'south-korea' },
  { code: 'HK', name: 'Hong Kong',    cdcSlug: 'hong-kong-sar',         stateDeptSlug: 'hong-kong' },

  // ── Africa ────────────────────────────────────────────────────────────────
  { code: 'KE', name: 'Kenya',        cdcSlug: 'kenya',                 stateDeptSlug: 'kenya' },
  { code: 'TZ', name: 'Tanzania',     cdcSlug: 'tanzania',              stateDeptSlug: 'tanzania' },
  { code: 'ZA', name: 'South Africa', cdcSlug: 'south-africa',          stateDeptSlug: 'south-africa' },
  { code: 'MA', name: 'Morocco',      cdcSlug: 'morocco',               stateDeptSlug: 'morocco' },
  { code: 'EG', name: 'Egypt',        cdcSlug: 'egypt',                 stateDeptSlug: 'egypt' },
  { code: 'GH', name: 'Ghana',        cdcSlug: 'ghana',                 stateDeptSlug: 'ghana' },
  { code: 'ET', name: 'Ethiopia',     cdcSlug: 'ethiopia',              stateDeptSlug: 'ethiopia' },
  { code: 'UG', name: 'Uganda',       cdcSlug: 'uganda',                stateDeptSlug: 'uganda' },

  // ── Latin America ─────────────────────────────────────────────────────────
  { code: 'PE', name: 'Peru',         cdcSlug: 'peru',                  stateDeptSlug: 'peru' },
  { code: 'CO', name: 'Colombia',     cdcSlug: 'colombia',              stateDeptSlug: 'colombia' },
  { code: 'CR', name: 'Costa Rica',   cdcSlug: 'costa-rica',            stateDeptSlug: 'costa-rica' },
  { code: 'BR', name: 'Brazil',       cdcSlug: 'brazil',                stateDeptSlug: 'brazil' },
  { code: 'MX', name: 'Mexico',       cdcSlug: 'mexico',                stateDeptSlug: 'mexico' },
  { code: 'AR', name: 'Argentina',    cdcSlug: 'argentina',             stateDeptSlug: 'argentina' },
  { code: 'EC', name: 'Ecuador',      cdcSlug: 'ecuador',               stateDeptSlug: 'ecuador' },

  // ── Europe ────────────────────────────────────────────────────────────────
  { code: 'FR', name: 'France',       cdcSlug: 'france',                stateDeptSlug: 'france' },
  { code: 'IT', name: 'Italy',        cdcSlug: 'italy',                 stateDeptSlug: 'italy' },
  { code: 'ES', name: 'Spain',        cdcSlug: 'spain',                 stateDeptSlug: 'spain' },
  { code: 'DE', name: 'Germany',      cdcSlug: 'germany',               stateDeptSlug: 'germany' },
  { code: 'GR', name: 'Greece',       cdcSlug: 'greece',                stateDeptSlug: 'greece' },
  { code: 'PT', name: 'Portugal',     cdcSlug: 'portugal',              stateDeptSlug: 'portugal' },

  // ── Oceania ───────────────────────────────────────────────────────────────
  { code: 'AU', name: 'Australia',    cdcSlug: 'australia',             stateDeptSlug: 'australia' },
  { code: 'NZ', name: 'New Zealand',  cdcSlug: 'new-zealand',           stateDeptSlug: 'new-zealand' },

  // ── North America ─────────────────────────────────────────────────────────
  { code: 'CA', name: 'Canada',       cdcSlug: 'canada',                stateDeptSlug: 'canada' },

  // ── Middle East ───────────────────────────────────────────────────────────
  { code: 'AE', name: 'UAE',          cdcSlug: 'united-arab-emirates',  stateDeptSlug: 'united-arab-emirates' },
  { code: 'TR', name: 'Turkey',       cdcSlug: 'turkey',                stateDeptSlug: 'turkey' },
  { code: 'IL', name: 'Israel',       cdcSlug: 'israel',                stateDeptSlug: 'israel-west-bank-and-gaza' },
  { code: 'JO', name: 'Jordan',       cdcSlug: 'jordan',                stateDeptSlug: 'jordan' },
]
