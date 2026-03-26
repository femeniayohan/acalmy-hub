import type { Tenant } from '@/lib/supabase/types'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Resolves the tenant for an authenticated user from the users table.
 * Use this in API routes where middleware headers are not available (/api/*).
 */
export async function getTenantFromUser(
  clerkUserId: string
): Promise<{ tenantId: string; tenantSlug: string; tenantCompany: string } | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('users')
    .select('tenant_id, tenants(slug, company_name)')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!data?.tenant_id) return null

  const tenant = Array.isArray(data.tenants) ? data.tenants[0] : data.tenants
  return {
    tenantId: data.tenant_id,
    tenantSlug: (tenant as { slug: string } | null)?.slug ?? '',
    tenantCompany: (tenant as { company_name: string } | null)?.company_name ?? '',
  }
}

/**
 * Resolves a tenant slug to a Tenant record via Supabase REST API.
 * Used in middleware (Edge runtime) — avoids supabase-js for compatibility.
 * Service role key is used to bypass RLS on the tenants table.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[Tenant] Missing Supabase env vars')
    return null
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/tenants?slug=eq.${encodeURIComponent(slug)}&select=id,slug,company_name,plan,mrr,stripe_customer_id,created_at&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        // Edge middleware cache — revalidate every 60s
        next: { revalidate: 60 },
      }
    )

    if (!response.ok) {
      console.error(`[Tenant] Supabase error: ${response.status}`)
      return null
    }

    const tenants: Tenant[] = await response.json()
    return tenants[0] ?? null
  } catch (err) {
    console.error('[Tenant] Failed to resolve slug:', err)
    return null
  }
}

/**
 * Reads the tenant context injected by middleware into request headers.
 * Call from Server Components or API Routes after importing `headers` from next/headers.
 */
export function parseTenantFromHeaders(headersList: Headers | ReturnType<typeof import('next/headers')['headers']>): {
  tenantId: string
  tenantSlug: string
  tenantCompany: string
} | null {
  const tenantId = headersList.get('x-tenant-id')
  const tenantSlug = headersList.get('x-tenant-slug')
  const tenantCompany = headersList.get('x-tenant-company') ?? ''

  if (!tenantId || !tenantSlug) return null

  return { tenantId, tenantSlug, tenantCompany }
}
