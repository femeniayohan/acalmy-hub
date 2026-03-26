import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { formatEur, estimateTimeSaved } from '@/lib/utils'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * GET /api/cron/monthly-report
 *
 * Déclenché automatiquement le 1er de chaque mois par Vercel Cron.
 * Envoie un rapport mensuel à chaque client actif.
 * Protégé par le header CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  // Vérification sécurité Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const monthName = lastMonthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // Récupère tous les tenants actifs avec au moins une automation
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, slug, company_name')

  if (!tenants?.length) {
    return NextResponse.json({ sent: 0 })
  }

  let sentCount = 0
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  for (const tenant of tenants) {
    try {
      // Stats du mois écoulé
      const [
        { data: executions },
        { data: automations },
        { data: user },
      ] = await Promise.all([
        supabase
          .from('executions')
          .select('id, status, duration_ms')
          .eq('tenant_id', tenant.id)
          .gte('ran_at', lastMonthStart.toISOString())
          .lte('ran_at', lastMonthEnd.toISOString()),
        supabase
          .from('automations')
          .select('id, name, status, monthly_runs')
          .eq('tenant_id', tenant.id)
          .eq('status', 'active'),
        supabase
          .from('users')
          .select('email, name')
          .eq('tenant_id', tenant.id)
          .eq('role', 'client')
          .limit(1)
          .single(),
      ])

      if (!user?.email || !executions?.length) continue

      const totalRuns = executions.length
      const successRuns = executions.filter(e => e.status === 'success').length
      const errorRuns = totalRuns - successRuns
      const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0
      const avgDuration = totalRuns > 0
        ? executions.reduce((acc, e) => acc + (e.duration_ms ?? 0), 0) / totalRuns
        : 0
      const { hours: timeSaved } = estimateTimeSaved(totalRuns, avgDuration)
      const activeCount = automations?.length ?? 0
      const clientName = user.name ?? user.email.split('@')[0]

      const automationRows = (automations ?? []).slice(0, 5).map(a => `
        <tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #0a0a0a;">${a.name}</td>
          <td style="padding: 8px 12px; font-size: 13px; color: rgba(0,0,0,0.5); text-align: right;">${a.monthly_runs} runs</td>
        </tr>
      `).join('')

      const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #0a0a0a;">

          <p style="font-size: 13px; font-weight: 600; letter-spacing: 0.05em; color: rgba(0,0,0,0.4); text-transform: uppercase; margin: 0 0 20px;">
            acalmy · rapport mensuel
          </p>

          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 6px; line-height: 1.3;">
            Votre mois de ${monthName}
          </h1>
          <p style="font-size: 14px; color: rgba(0,0,0,0.5); margin: 0 0 28px;">
            Bonjour ${clientName}, voici le résumé de vos automatisations.
          </p>

          <!-- KPIs -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="width: 25%; padding: 16px; background: #f5f4f0; border-radius: 8px; text-align: center; vertical-align: top;">
                <p style="font-size: 24px; font-weight: 700; margin: 0; color: #0a0a0a;">${totalRuns}</p>
                <p style="font-size: 11px; color: rgba(0,0,0,0.45); margin: 4px 0 0;">Exécutions</p>
              </td>
              <td style="width: 4px;"></td>
              <td style="width: 25%; padding: 16px; background: #f5f4f0; border-radius: 8px; text-align: center; vertical-align: top;">
                <p style="font-size: 24px; font-weight: 700; margin: 0; color: ${successRate >= 90 ? '#16a34a' : '#d97706'};">${successRate}%</p>
                <p style="font-size: 11px; color: rgba(0,0,0,0.45); margin: 4px 0 0;">Succès</p>
              </td>
              <td style="width: 4px;"></td>
              <td style="width: 25%; padding: 16px; background: #f5f4f0; border-radius: 8px; text-align: center; vertical-align: top;">
                <p style="font-size: 24px; font-weight: 700; margin: 0; color: #0a0a0a;">${timeSaved}h</p>
                <p style="font-size: 11px; color: rgba(0,0,0,0.45); margin: 4px 0 0;">Temps économisé</p>
              </td>
              <td style="width: 4px;"></td>
              <td style="width: 25%; padding: 16px; background: #f5f4f0; border-radius: 8px; text-align: center; vertical-align: top;">
                <p style="font-size: 24px; font-weight: 700; margin: 0; color: #0a0a0a;">${activeCount}</p>
                <p style="font-size: 11px; color: rgba(0,0,0,0.45); margin: 4px 0 0;">Actives</p>
              </td>
            </tr>
          </table>

          ${automationRows ? `
          <!-- Automatisations -->
          <div style="margin-bottom: 24px;">
            <p style="font-size: 12px; font-weight: 600; color: rgba(0,0,0,0.4); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;">
              Vos automatisations
            </p>
            <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; overflow: hidden;">
              ${automationRows}
            </table>
          </div>
          ` : ''}

          ${errorRuns > 0 ? `
          <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
            <p style="font-size: 13px; font-weight: 600; color: #713f12; margin: 0 0 4px;">
              ${errorRuns} erreur${errorRuns > 1 ? 's' : ''} ce mois
            </p>
            <p style="font-size: 12px; color: #92400e; margin: 0;">
              Notre équipe a été notifiée et a traité les incidents.
            </p>
          </div>
          ` : `
          <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
            <p style="font-size: 13px; font-weight: 600; color: #14532d; margin: 0;">
              ✓ Aucune erreur ce mois — tout fonctionne parfaitement.
            </p>
          </div>
          `}

          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.acalmy.com'}/${tenant.slug}/dashboard"
             style="display: inline-block; background: #0a0a0a; color: white; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 500; text-decoration: none; margin-bottom: 28px;">
            Voir mon tableau de bord →
          </a>

          <hr style="border: none; border-top: 1px solid rgba(0,0,0,0.06); margin: 0 0 20px;" />

          <p style="font-size: 11px; color: rgba(0,0,0,0.3); margin: 0; line-height: 1.6;">
            Ce rapport est envoyé automatiquement chaque 1er du mois par Acalmy.
            Des questions ? Répondez directement à cet email.
          </p>
        </div>
      `

      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: `Votre rapport ${monthName} — ${tenant.company_name}`,
        html,
      })

      sentCount++
    } catch (err) {
      console.error(`[Monthly report] Failed for tenant ${tenant.id}:`, err)
    }
  }

  console.log(`[Monthly report] Sent ${sentCount}/${tenants.length} reports`)
  return NextResponse.json({ sent: sentCount, total: tenants.length })
}
