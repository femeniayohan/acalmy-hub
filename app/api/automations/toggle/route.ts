import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { activateWorkflow, deactivateWorkflow, type N8nInstance } from '@/lib/n8n'
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

  const { automationId, action } = await request.json()

  if (!automationId || !['pause', 'resume'].includes(action)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: automation } = await supabase
    .from('automations')
    .select('id, n8n_workflow_id, status')
    .eq('id', automationId)
    .eq('tenant_id', tenantId)
    .single()

  if (!automation) {
    return NextResponse.json({ error: 'Automatisation introuvable' }, { status: 404 })
  }

  const newStatus = action === 'pause' ? 'paused' : 'active'

  try {
    // Only call n8n if the tenant has an instance and the automation has a workflow ID
    if (automation.n8n_workflow_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('n8n_url, n8n_api_key')
        .eq('id', tenantId)
        .single()

      if (tenant?.n8n_url && tenant?.n8n_api_key) {
        const n8nInstance: N8nInstance = {
          baseUrl: tenant.n8n_url,
          apiKey: tenant.n8n_api_key,
        }

        if (action === 'pause') {
          await deactivateWorkflow(n8nInstance, automation.n8n_workflow_id)
        } else {
          await activateWorkflow(n8nInstance, automation.n8n_workflow_id)
        }
      }
    }

    await supabase
      .from('automations')
      .update({ status: newStatus })
      .eq('id', automationId)
      .eq('tenant_id', tenantId)

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err) {
    console.error('[Toggle] n8n error:', err)
    return NextResponse.json({ error: 'Opération échouée' }, { status: 500 })
  }
}
