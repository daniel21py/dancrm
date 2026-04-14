// TypeScript types matching supabase/migrations/001_schema.sql

export type MemberRole = 'owner' | 'admin' | 'manager' | 'sales' | 'viewer'
export type CompanyStatus = 'prospect' | 'lead' | 'active' | 'inactive' | 'churned'
export type CompanyType = 'prospect' | 'cliente' | 'fornitore' | 'partner' | 'altro'
export type ContactRole = 'decisore' | 'operativo' | 'referente' | 'altro'
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task_done' | 'whatsapp' | 'linkedin' | 'visit' | 'other'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  website: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  province: string | null
  cap: string | null
  country: string
  piva: string | null
  codice_fiscale: string | null
  setup_completed: boolean
  plan: string
  created_at: string
  updated_at: string
}

export interface TenantMember {
  id: string
  tenant_id: string
  user_id: string
  role: MemberRole
  full_name: string | null
  avatar_url: string | null
  invited_at: string
  joined_at: string | null
  created_at: string
}

export interface PipelineStage {
  id: string
  tenant_id: string
  name: string
  color: string
  position: number
  is_won: boolean
  is_lost: boolean
  created_at: string
}

export interface Company {
  id: string
  tenant_id: string
  name: string
  type: CompanyType
  status: CompanyStatus
  website: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  province: string | null
  cap: string | null
  country: string
  piva: string | null
  codice_fiscale: string | null
  sector: string | null
  employee_count: number | null
  annual_revenue: number | null
  annual_shipments: number | null
  preferred_service: string | null
  service_area: string[] | null
  has_warehouse: boolean
  notes: string | null
  owner_id: string | null
  tms_client_id: string | null
  tms_synced_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  tenant_id: string
  company_id: string | null
  first_name: string
  last_name: string
  role: ContactRole
  job_title: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  linkedin_url: string | null
  notes: string | null
  is_primary: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  tenant_id: string
  title: string
  company_id: string | null
  stage_id: string | null
  value: number | null
  currency: string
  probability: number
  expected_close: string | null
  actual_close: string | null
  lost_reason: string | null
  notes: string | null
  owner_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  company?: Company
  stage?: PipelineStage
}

export interface Activity {
  id: string
  tenant_id: string
  type: ActivityType
  title: string | null
  body: string | null
  occurred_at: string
  duration_min: number | null
  company_id: string | null
  contact_id: string | null
  deal_id: string | null
  created_by: string | null
  created_at: string
}

export interface Task {
  id: string
  tenant_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  due_time: string | null
  company_id: string | null
  contact_id: string | null
  deal_id: string | null
  assigned_to: string | null
  created_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  tenant_id: string
  name: string
  color: string
  created_at: string
}
