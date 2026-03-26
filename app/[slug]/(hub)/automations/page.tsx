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
    <div className="p-4 sm:p-6 max-w-[800px]">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">Mes automatisations</h1>
        <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
          {list.length > 0
            ? `${list.length} automatisation${list.length > 1 ? 's' : ''} · ${active.length} active${active.length > 1 ? 's' : ''}`
            : 'Aucune automatisation configurée'}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-10 h-10 rounded-full bg-[#f5f4f0] flex items-center justify-center mx-auto mb-3">
            <Zap size={18} className="text-[rgba(0,0,0,0.3)]" />
          </div>
          <p className="text-sm font-medium text-[#0a0a0a] mb-1">Aucune automatisation</p>
          <p className="text-sm text-[rgba(0,0,0,0.4)] mb-4">
            Découvrez nos templates prêts à l'emploi ou soumettez une demande sur mesure.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Link href={`/${params.slug}/marketplace`} className="btn-primary">
              Voir le marketplace
            </Link>
            <Link href={`/${params.slug}/custom`} className="btn-secondary">
              Sur mesure
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <section key={group.key}>
              <h2 className="text-xs font-medium text-[rgba(0,0,0,0.35)] uppercase tracking-wider mb-3">
                {group.label} · {group.items.length}
              </h2>
              <div className="space-y-2">
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
