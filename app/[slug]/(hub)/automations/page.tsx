import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { AutomationCard } from '@/components/automations/AutomationCard'
import type { Automation } from '@/lib/supabase/types'
import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata: Metadata = { title: 'Mes automatisations' }

export default async function AutomationsPage({ params }: { params: { slug: string } }) {
  auth().protect()

  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) notFound()

  const supabase = createServiceClient()

  const { data: automations, error } = await supabase
    .from('automations')
    .select('*, subscriptions(template_id)')
    .eq('tenant_id', tenantId)
    .order('status', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Automations] Supabase error:', error)
  }

  const list: Automation[] = automations ?? []

  type AutomationWithSub = Automation & { subscriptions?: { template_id: string }[] }

  const active = list.filter(a => a.status === 'active')
  const toConfigure = list.filter(a => a.status === 'pending' && !a.credentials_configured)
  const activating = list.filter(a => a.status === 'pending' && a.credentials_configured)
  const paused = list.filter(a => a.status === 'paused')
  const errors = list.filter(a => a.status === 'error')

  const groups = [
    { key: 'active', label: 'Actives', items: active },
    { key: 'configure', label: 'À configurer', items: toConfigure },
    { key: 'activating', label: 'En cours d\'activation', items: activating },
    { key: 'paused', label: 'En pause', items: paused },
    { key: 'error', label: 'En erreur', items: errors },
  ].filter(g => g.items.length > 0)

  return (
    <div className="px-10 py-12 max-w-[800px] animate-fade-in">
      <div className="mb-8">
        <p className="section-label mb-3">Automatisations</p>
        <h1 className="page-title">Mes automatisations</h1>
        <p className="text-sm font-light mt-2" style={{ color: '#a1a1aa' }}>
          {list.length > 0
            ? `${list.length} automatisation${list.length > 1 ? 's' : ''} · ${active.length} active${active.length > 1 ? 's' : ''}`
            : 'Aucune automatisation configurée'}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="card p-8 text-center">
          <Zap size={20} strokeWidth={1.5} className="mx-auto mb-4" style={{ color: '#d4d4d8' }} />
          <p className="text-sm font-medium mb-1" style={{ color: '#27272a' }}>Aucune automatisation</p>
          <p className="text-sm font-light mb-6" style={{ color: '#a1a1aa' }}>
            Découvrez nos templates prêts à l'emploi ou soumettez une demande sur mesure.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href={`/${params.slug}/marketplace`} className="btn-primary">
              Voir le marketplace
            </Link>
            <Link href={`/${params.slug}/custom`} className="btn-secondary">
              Sur mesure
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <section key={group.key}>
              <p className="section-label mb-4">
                {group.label} · {group.items.length}
              </p>
              <div className="space-y-px">
                {group.items.map((automation) => (
                  <AutomationCard
                    key={automation.id}
                    automation={automation}
                    slug={params.slug}
                    templateId={(automation as AutomationWithSub).subscriptions?.[0]?.template_id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
