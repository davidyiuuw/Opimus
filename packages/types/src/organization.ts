export type OrgType = 'hospital' | 'school' | 'nursing_home' | 'employer' | 'government' | 'other'
export type MemberStatus = 'invited' | 'active' | 'inactive'

export interface Organization {
  id: string // UUID
  name: string
  org_type: OrgType
  invite_code: string
  admin_user_id: string
  created_at: string
}

export interface OrganizationRequirement {
  id: number
  org_id: string
  vaccine_id: number
  level: 'required' | 'recommended'
  notes: string | null
}

export interface OrganizationMember {
  id: number
  org_id: string
  user_id: string
  status: MemberStatus
  joined_at: string | null
}
