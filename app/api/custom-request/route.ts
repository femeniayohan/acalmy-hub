import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Resend } from 'resend'
import { getTenantFromUser } from '@/lib/tenant'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantCtx = await getTenantFromUser(userId)
  const tenantCompany = tenantCtx?.tenantCompany ?? 'Inconnu'
  const tenantSlug = tenantCtx?.tenantSlug ?? ''
  const tenantId = tenantCtx?.tenantId ?? null

  const { description, tools, budget, slug } = await request.json()

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description requise' }, { status: 400 })
  }

  // Limit content lengths to prevent abuse
  if (description.length > 5000) {
    return NextResponse.json({ error: 'Description trop longue (max 5000 caractères)' }, { status: 400 })
  }
  if (tools && tools.length > 500) {
    return NextResponse.json({ error: 'Champ outils trop long (max 500 caractères)' }, { status: 400 })
  }

  const VALID_BUDGETS = new Set(['lt500', '500_1500', '1500_3000', 'gt3000', 'unknown', null, undefined, ''])
  if (!VALID_BUDGETS.has(budget)) {
    return NextResponse.json({ error: 'Budget invalide' }, { status: 400 })
  }

  const budgetLabels: Record<string, string> = {
    lt500: 'Moins de 500€',
    '500_1500': '500€ – 1 500€',
    '1500_3000': '1 500€ – 3 000€',
    gt3000: 'Plus de 3 000€',
    unknown: 'Non défini',
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@acalmy.com',
    to: process.env.RESEND_CONTACT_EMAIL ?? 'contact@acalmy.com',
    subject: `[Sur mesure] Nouvelle demande — ${tenantCompany}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; padding: 24px;">
        <h2 style="margin: 0 0 16px; font-size: 18px;">Nouvelle demande sur mesure</h2>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 12px; background: #f5f4f0; font-weight: 600; width: 140px; border-radius: 6px 0 0 6px; font-size: 13px;">Client</td>
            <td style="padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); font-size: 13px;">${tenantCompany} (${tenantSlug})</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f4f0; font-weight: 600; font-size: 13px;">Budget</td>
            <td style="padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); font-size: 13px;">${budgetLabels[budget] ?? 'Non spécifié'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f4f0; font-weight: 600; font-size: 13px;">Outils</td>
            <td style="padding: 8px 12px; border: 1px solid rgba(0,0,0,0.08); font-size: 13px;">${tools || 'Non spécifié'}</td>
          </tr>
        </table>

        <div style="background: #f5f4f0; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 8px; font-weight: 600; font-size: 13px;">Besoin décrit par le client :</p>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${description}</p>
        </div>

        <p style="margin: 20px 0 0; font-size: 12px; color: rgba(0,0,0,0.4);">
          Envoyé depuis app.acalmy.com/${tenantSlug}/custom
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('[Custom request] Resend error:', error)
    return NextResponse.json({ error: 'Impossible d\'envoyer l\'email' }, { status: 500 })
  }

  // Persist in DB (silently — email already sent)
  if (tenantId) {
    const supabase = createServiceClient()
    const title = description.trim().slice(0, 80) + (description.length > 80 ? '…' : '')
    await supabase.from('custom_requests').insert({
      tenant_id: tenantId,
      title,
      description: description.trim(),
      tools: tools?.trim() || null,
      budget: budget || null,
      status: 'pending',
    })
  }

  return NextResponse.json({ success: true })
}
