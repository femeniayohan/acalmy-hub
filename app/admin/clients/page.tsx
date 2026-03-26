import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { formatEur, formatDate, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import { Users, ChevronRight, Circle } from 'lucide-react'

export const metadata: Metadata = { title: 'Clients — Admin' }

export default async function AdminClientsPage() {
  const supabase = createServiceClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select(`
      id, slug, company_name, plan, mrr, created_at,
      automations(count),
      executions(count)
    `)
    .order('mrr', { ascending: false })

  // Get last activity per tenant
  const tenantIds = tenants?.map(t => t.id) ?? []
  const { data: lastExecs } = tenantIds.length > 0
    ? await supabase
        .from('executions')
        .select('tenant_id, ran_at')
        .in('tenant_id', tenantIds)
        .order('ran_at', { ascending: false })
    : { data: [] }

  const lastActivity = (lastExecs ?? []).reduce<Record<string, string>>((acc, e) => {
    if (!acc[e.tenant_id]) acc[e.tenant_id] = e.ran_at
    return acc
  }, {})

  const totalMrr = tenants?.reduce((sum, t) => sum + (t.mrr ?? 0), 0) ?? 0

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">Clients</h1>
          <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
            {tenants?.length ?? 0} client{(tenants?.length ?? 0) > 1 ? 's' : ''} ·{' '}
            MRR total {formatEur(totalMrr)}
          </p>
        </div>
      </div>

      {!tenants?.length ? (
        <div className="card p-10 text-center">
          <Users size={24} className="mx-auto mb-2 text-[rgba(0,0,0,0.2)]" />
          <p className="text-sm text-[rgba(0,0,0,0.4)]">Aucun client encore.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)]">
                {['Client', 'Plan', 'MRR', 'Automatisations', 'Dernière activité', ''].map(h => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.04)]">
              {tenants.map(tenant => {
                const autoCount = Array.isArray(tenant.automations)
                  ? tenant.automations.length
                  : (tenant.automations as { count: number } | null)?.count ?? 0

                return (
                  <tr key={tenant.id} className="hover:bg-[#fafaf9] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-[#0a0a0a]">
                        {tenant.company_name}
                      </p>
                      <p className="text-xs text-[rgba(0,0,0,0.35)]">
                        {tenant.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-[9999px] bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.5)]">
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-[#0a0a0a]">
                      {formatEur(tenant.mrr ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[rgba(0,0,0,0.5)]">
                      {autoCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-[rgba(0,0,0,0.4)]">
                      {lastActivity[tenant.id]
                        ? formatRelativeTime(lastActivity[tenant.id])
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/clients/${tenant.id}`}
                        className="inline-flex items-center gap-1 text-xs text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors"
                      >
                        Voir <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
