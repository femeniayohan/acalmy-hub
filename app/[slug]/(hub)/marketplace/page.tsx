import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { MarketplaceClient } from '@/components/marketplace/MarketplaceClient'
import { TrackMarketplaceVisit } from '@/components/TrackVisit'
import Link from 'next/link'
import type { MarketplaceTemplate, Subscription } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Marketplace' }

interface PurchasedAutomation {
  id: string
  name: string
  status: string
  template_id: string | null
}

const STATUS_LABELS: Record<string, { label: string; dotClass: string }> = {
  active: { label: 'Active', dotClass: 'bg-emerald-500' },
  paused: { label: 'Pausée', dotClass: 'bg-amber-400' },
  error: { label: 'Erreur', dotClass: 'bg-red-500' },
  pending: { label: 'En attente', dotClass: 'bg-[rgba(0,0,0,0.2)]' },
}

export default async function MarketplacePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { template?: string; session_id?: string }
}) {
  auth().protect()

  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) notFound()

  const supabase = createServiceClient()

  const [{ data: templates }, { data: subscriptions }] = await Promise.all([
    supabase
      .from('marketplace_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

    supabase
      .from('subscriptions')
      .select('id, template_id, status, automation_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
  ])

  const subscribedTemplateIds = new Set(
    (subscriptions ?? []).map(s => s.template_id)
  )

  // Fetch purchased automations (linked to a template)
  let purchased: PurchasedAutomation[] | null = null
  try {
    const { data } = await supabase
      .from('automations')
      .select('id, name, status, template_id')
      .eq('tenant_id', tenantId)
      .not('template_id', 'is', null)
      .limit(5)
    purchased = data as PurchasedAutomation[] | null
  } catch {
    // Fail silently
  }

  const hasPurchased = purchased && purchased.length > 0

  return (
    <div className="p-4 sm:p-6">
      <TrackMarketplaceVisit />
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">Marketplace</h1>
        <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
          Ajoutez de nouvelles automatisations à votre espace en quelques minutes.
        </p>
      </div>

      {hasPurchased && (
        <div className="bento-card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(0,0,0,0.35)]">
              Mes automatisations actives
            </p>
            <Link
              href={`/${params.slug}/automations`}
              className="text-xs text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors"
            >
              Tout voir →
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-[rgba(0,0,0,0.05)]">
            {purchased!.map((auto) => {
              const { label, dotClass } = STATUS_LABELS[auto.status] ?? { label: auto.status, dotClass: 'bg-[rgba(0,0,0,0.2)]' }
              return (
                <Link
                  key={auto.id}
                  href={`/${params.slug}/automations/${auto.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                    <p className="text-sm font-medium text-[#0a0a0a] truncate group-hover:underline">
                      {auto.name}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[rgba(0,0,0,0.4)]">{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <MarketplaceClient
        templates={templates ?? []}
        subscribedTemplateIds={Array.from(subscribedTemplateIds)}
        tenantId={tenantId}
        slug={params.slug}
        postCheckoutTemplateId={searchParams.template}
      />
    </div>
  )
}
