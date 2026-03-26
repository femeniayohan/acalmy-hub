import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-acalmy-secret')
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: {
    tenant_id: string
    automation_id: string
    status: 'success' | 'error'
    duration_ms?: number
    error_message?: string
  }

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { tenant_id, automation_id, status, duration_ms, error_message } = payload

  if (!tenant_id || !automation_id || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (status !== 'success' && status !== 'error') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Insert execution record
  const { error: execError } = await supabase.from('executions').insert({
    tenant_id,
    automation_id,
    status,
    duration_ms: duration_ms ?? null,
    error_message: error_message ?? null,
    ran_at: new Date().toISOString(),
  })

  if (execError) {
    console.error('[n8n webhook] Failed to insert execution:', execError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  // Update automation's last_run fields and monthly_runs counter
  const { error: autoError } = await supabase.rpc('increment_automation_runs', {
    p_automation_id: automation_id,
    p_tenant_id: tenant_id,
    p_status: status,
  })

  if (autoError) {
    console.warn('[n8n webhook] Failed to increment runs counter:', autoError)
  }

  // ── Alerte erreur par email ──────────────────────────────────────────────
  if (status === 'error') {
    try {
      // Récupère infos automation + tenant + email client
      const [{ data: automation }, { data: tenantUser }] = await Promise.all([
        supabase
          .from('automations')
          .select('name, category')
          .eq('id', automation_id)
          .single(),
        supabase
          .from('users')
          .select('email, name')
          .eq('tenant_id', tenant_id)
          .eq('role', 'client')
          .limit(1)
          .single(),
      ])

      const { data: tenant } = await supabase
        .from('tenants')
        .select('company_name, slug')
        .eq('id', tenant_id)
        .single()

      const autoName = automation?.name ?? 'Automatisation inconnue'
      const clientEmail = tenantUser?.email
      const clientName = tenantUser?.name ?? 'Client'
      const companyName = tenant?.company_name ?? 'Client'
      const slug = tenant?.slug ?? ''
      const adminEmail = process.env.RESEND_CONTACT_EMAIL ?? 'yohan@acalmy.com'
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
      const errorMsg = error_message ?? 'Erreur inconnue'

      const clientHtml = `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; padding: 24px; color: #0a0a0a;">
          <p style="font-size: 15px; font-weight: 600; margin: 0 0 8px;">Une automatisation a rencontré une erreur</p>
          <p style="font-size: 14px; color: rgba(0,0,0,0.5); margin: 0 0 20px; line-height: 1.6;">
            Bonjour ${clientName}, votre automatisation <strong>${autoName}</strong> a échoué lors de sa dernière exécution.
            Notre équipe a été notifiée et va examiner le problème.
          </p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="font-size: 12px; font-weight: 600; color: #991b1b; margin: 0 0 4px;">Détail de l'erreur</p>
            <p style="font-size: 13px; color: #7f1d1d; margin: 0; font-family: monospace;">${errorMsg}</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.acalmy.com'}/${slug}/automations"
             style="display: inline-block; background: #0a0a0a; color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; text-decoration: none;">
            Voir mes automatisations
          </a>
          <p style="font-size: 12px; color: rgba(0,0,0,0.35); margin: 20px 0 0;">
            Vous recevez cet email car vous utilisez Acalmy Hub.
          </p>
        </div>
      `

      const adminHtml = `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; padding: 24px; color: #0a0a0a;">
          <p style="font-size: 13px; font-weight: 600; color: #dc2626; margin: 0 0 12px;">🔴 Alerte erreur automatisation</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 6px 10px; background: #f5f4f0; font-size: 12px; font-weight: 600; width: 120px;">Client</td>
              <td style="padding: 6px 10px; border: 1px solid rgba(0,0,0,0.08); font-size: 13px;">${companyName} (${slug})</td>
            </tr>
            <tr>
              <td style="padding: 6px 10px; background: #f5f4f0; font-size: 12px; font-weight: 600;">Automatisation</td>
              <td style="padding: 6px 10px; border: 1px solid rgba(0,0,0,0.08); font-size: 13px;">${autoName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 10px; background: #f5f4f0; font-size: 12px; font-weight: 600;">Erreur</td>
              <td style="padding: 6px 10px; border: 1px solid rgba(0,0,0,0.08); font-size: 13px; font-family: monospace; color: #dc2626;">${errorMsg}</td>
            </tr>
          </table>
          <a href="${process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.acalmy.com'}/clients/${tenant_id}"
             style="display: inline-block; background: #0a0a0a; color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; text-decoration: none;">
            Voir le client →
          </a>
        </div>
      `

      const emailPromises = [
        // Email admin (toujours)
        resend.emails.send({
          from: fromEmail,
          to: adminEmail,
          subject: `[Erreur] ${autoName} — ${companyName}`,
          html: adminHtml,
        }),
      ]

      // Email client (si email disponible)
      if (clientEmail) {
        emailPromises.push(
          resend.emails.send({
            from: fromEmail,
            to: clientEmail,
            subject: `Votre automatisation "${autoName}" a rencontré une erreur`,
            html: clientHtml,
          })
        )
      }

      await Promise.allSettled(emailPromises)
    } catch (emailErr) {
      // Non-critique — log mais ne fait pas échouer le webhook
      console.warn('[n8n webhook] Failed to send error alert email:', emailErr)
    }
  }

  return NextResponse.json({ received: true })
}
