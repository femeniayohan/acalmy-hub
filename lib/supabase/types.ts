// ─── Domain types ────────────────────────────────────────────────────────────

export type TenantPlan = 'infrastructure' | 'starter'

export interface Tenant {
  id: string
  slug: string
  company_name: string
  plan: TenantPlan
  mrr: number
  stripe_customer_id: string | null
  created_at: string
}

export interface User {
  id: string
  tenant_id: string
  clerk_user_id: string
  email: string
  name: string | null
  role: 'client' | 'admin'
  created_at: string
}

export type AutomationStatus = 'active' | 'paused' | 'error' | 'pending'
export type AutomationCategory = 'crm' | 'marketing' | 'reporting' | 'ia'

export interface Automation {
  id: string
  tenant_id: string
  name: string
  description: string | null
  category: AutomationCategory
  n8n_workflow_id: string | null
  status: AutomationStatus
  credentials_configured: boolean
  config: Record<string, unknown> | null
  activated_at: string | null
  monthly_runs: number
  last_run_at: string | null
  last_run_status: 'success' | 'error' | null
  created_at: string
}

export type ExecutionStatus = 'success' | 'error'

export interface Execution {
  id: string
  automation_id: string
  tenant_id: string
  status: ExecutionStatus
  ran_at: string
  duration_ms: number | null
  error_message: string | null
  created_at: string
  // Joined
  automation?: Pick<Automation, 'id' | 'name' | 'category'>
}

export interface ConfigSchemaField {
  key: string
  label: string
  hint: string
  type: 'text' | 'password' | 'url' | 'email'
  required: boolean
  placeholder?: string
}

export interface ConfigSchema {
  fields: ConfigSchemaField[]
}

export interface MarketplaceTemplate {
  id: string
  name: string
  description: string
  category: AutomationCategory
  price_monthly: number
  stripe_price_id: string | null
  config_schema: ConfigSchema
  n8n_template_id: string | null
  is_active: boolean
  icon_name: string
  created_at: string
}

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due'

export interface Subscription {
  id: string
  tenant_id: string
  template_id: string
  automation_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  started_at: string
  canceled_at: string | null
  created_at: string
  // Joined
  template?: Pick<MarketplaceTemplate, 'id' | 'name' | 'price_monthly' | 'icon_name'>
}

// ─── Metric helpers ───────────────────────────────────────────────────────────

export interface DailyRunPoint {
  day: string
  run_count: number
}

export interface MonthlyStats {
  month: string
  run_count: number
  success_count: number
  error_count: number
}

export interface DashboardMetrics {
  totalRunsThisMonth: number
  successRate: number
  errorCount: number
  timeSavedMinutes: number
  activeAutomations: number
  dailyRuns: DailyRunPoint[]
  recentExecutions: Execution[]
}
