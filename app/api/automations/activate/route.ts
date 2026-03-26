import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { activateWorkflow, deployTemplateWorkflow, createCredential, type N8nInstance } from '@/lib/n8n'
import { getTenantFromUser } from '@/lib/tenant'

export const runtime = 'nodejs'

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

  let body: { automationId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { automationId } = body
  if (!automationId) {
    return NextResponse.json({ error: 'Missing automationId' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch automation — verify it belongs to this tenant
  const { data: automation } = await supabase
    .from('automations')
    .select('id, name, n8n_workflow_id, credentials_configured, status')
    .eq('id', automationId)
    .eq('tenant_id', tenantId)
    .single()

  if (!automation) {
    return NextResponse.json({ error: 'Automatisation introuvable' }, { status: 404 })
  }

  if (!automation.credentials_configured) {
    return NextResponse.json(
      { error: 'Les identifiants ne sont pas encore configurés' },
      { status: 400 }
    )
  }

  if (automation.status === 'active') {
    return NextResponse.json({ success: true, alreadyActive: true })
  }

  // ── Retrieve credentials from Vault ───────────────────────────────────────
  const secretName = `tenant_${tenantId}_automation_${automationId}`
  const { data: secretValue, error: vaultError } = await supabase
    .rpc('get_vault_secret', { p_name: secretName })

  if (vaultError || !secretValue) {
    console.error('[Activate] Vault read failed:', vaultError)
    return NextResponse.json(
      { error: 'Impossible de récupérer les identifiants' },
      { status: 500 }
    )
  }

  let credentials: Record<string, string>
  try {
    credentials = JSON.parse(secretValue)
  } catch {
    return NextResponse.json({ error: 'Identifiants malformés' }, { status: 500 })
  }

  // ── Get tenant's n8n instance ──────────────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('n8n_url, n8n_api_key, slug')
    .eq('id', tenantId)
    .single()

  // If no n8n instance provisioned yet, mark as pending and return success
  // Acalmy team will provision the instance from the admin panel
  if (!tenant?.n8n_url || !tenant?.n8n_api_key) {
    await supabase
      .from('automations')
      .update({ status: 'pending' })
      .eq('id', automationId)
      .eq('tenant_id', tenantId)

    return NextResponse.json({ success: true, pending: true })
  }

  const n8nInstance: N8nInstance = {
    baseUrl: tenant.n8n_url,
    apiKey: tenant.n8n_api_key,
  }

  // ── Deploy or activate n8n workflow ───────────────────────────────────────
  try {
    let workflowId = automation.n8n_workflow_id

    if (!workflowId) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('template_id, marketplace_templates(n8n_template_id)')
        .eq('automation_id', automationId)
        .single()

      const rawTemplate = sub?.marketplace_templates
      const template: { n8n_template_id: string | null } | null = Array.isArray(rawTemplate)
        ? (rawTemplate[0] as { n8n_template_id: string | null } | undefined) ?? null
        : (rawTemplate as unknown as { n8n_template_id: string | null } | null)

      if (template?.n8n_template_id) {
        const deployed = await deployTemplateWorkflow(
          n8nInstance,
          template.n8n_template_id,
          tenant.slug
        )
        workflowId = deployed.workflowId
      }
    }

    if (workflowId) {
      // Credential injection is template-specific — handled per-template in production
      console.log(`[Activate] Credentials received for workflow ${workflowId}:`, Object.keys(credentials))

      await activateWorkflow(n8nInstance, workflowId)

      await supabase
        .from('automations')
        .update({
          status: 'active',
          n8n_workflow_id: workflowId,
          activated_at: new Date().toISOString(),
        })
        .eq('id', automationId)
        .eq('tenant_id', tenantId)
    } else {
      console.warn('[Activate] No n8n_template_id configured for automation:', automationId)
      await supabase
        .from('automations')
        .update({ status: 'pending' })
        .eq('id', automationId)
        .eq('tenant_id', tenantId)
    }
  } catch (n8nError) {
    console.error('[Activate] n8n activation failed:', n8nError)

    await supabase
      .from('automations')
      .update({ status: 'error' })
      .eq('id', automationId)
      .eq('tenant_id', tenantId)

    return NextResponse.json(
      { error: 'Activation échouée. Notre équipe a été notifiée.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
