import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { MarketplaceClient } from '@/components/marketplace/MarketplaceClient'
import type { MarketplaceTemplate, Subscription } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'Marketplace' }

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

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">Marketplace</h1>
        <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
          Ajoutez de nouvelles automatisations à votre espace en quelques minutes.
        </p>
      </div>

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
