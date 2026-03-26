import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantFromUser } from '@/lib/tenant'

export const runtime = 'nodejs'

// Rate limiting store (in-memory — use Redis/KV in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, maxRequests = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) return false

  entry.count++
  return true
}

/**
 * POST /api/credentials/store
 *
 * Stores client credentials in Supabase Vault (AES-256 encrypted at rest).
 * Only called after a successful Stripe checkout session.
 * The tenant context is resolved from the x-tenant-id header injected by middleware.
 *
 * Body: { templateId: string, credentials: Record<string, string> }
 * Returns: { automationId: string }
 */
export async function POST(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantCtx = await getTenantFromUser(userId)
  if (!tenantCtx) {
    return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 })
  }
  const { tenantId } = tenantCtx

  // Rate limit: max 10 credential stores per minute per tenant
  if (!checkRateLimit(`credentials:${tenantId}`, 10, 60_000)) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans une minute.' },
      { status: 429 }
    )
  }

  let body: { templateId: string; credentials: Record<string, string> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { templateId, credentials } = body

  if (!templateId || !credentials || typeof credentials !== 'object') {
    return NextResponse.json({ error: 'Missing templateId or credentials' }, { status: 400 })
  }

  // Sanitize credentials — only string values, no deeply nested objects
  const sanitized: Record<string, string> = {}
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      sanitized[key] = value.trim()
    }
  }

  const supabase = createServiceClient()

  // Find the automation for this tenant and template (created by Stripe webhook)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('automation_id')
    .eq('tenant_id', tenantId)
    .eq('template_id', templateId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!subscription?.automation_id) {
    return NextResponse.json(
      { error: 'Aucun abonnement actif trouvé pour ce template' },
      { status: 404 }
    )
  }

  const automationId = subscription.automation_id
  const secretName = `tenant_${tenantId}_automation_${automationId}`

  // Store in Supabase Vault via public wrapper (vault schema not exposed by PostgREST)
  const { error: vaultError } = await supabase.rpc('create_vault_secret', {
    p_secret: JSON.stringify(sanitized),
    p_name: secretName,
    p_description: `Credentials for automation ${automationId} (tenant ${tenantId})`,
  })

  if (vaultError) {
    console.error('[Credentials] Vault storage failed:', vaultError)
    return NextResponse.json(
      { error: 'Impossible de stocker les identifiants de façon sécurisée' },
      { status: 500 }
    )
  }

  // Mark automation as credentials_configured = true
  const { error: updateError } = await supabase
    .from('automations')
    .update({ credentials_configured: true })
    .eq('id', automationId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('[Credentials] Failed to update automation:', updateError)
  }

  return NextResponse.json({ automationId })
}
