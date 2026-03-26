import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { formatEur, formatRelativeTime } from '@/lib/utils'
import { StatusDot } from '@/components/ui/StatusDot'
import Link from 'next/link'
import { Users, Zap, TrendingUp, AlertCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Vue d\'ensemble — Admin' }

export default async function AdminOverviewPage() {
  const supabase = createServiceClient()

  const [
    { data: tenants },
    { data: recentExecs },
    { data: errorAutomations },
  ] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, slug, company_name, plan, mrr, created_at')
      .order('created_at', { ascending: false }),

    supabase
      .from('executions')
      .select('id, status, ran_at, tenant_id, automations(name)')
      .order('ran_at', { ascending: false })
      .limit(8),

    supabase
      .from('automations')
      .select('id, name, tenant_id, tenants(company_name, slug)')
      .eq('status', 'error'),
  ])

  const totalMrr = tenants?.reduce((sum, t) => sum + (t.mrr ?? 0), 0) ?? 0
  const clientCount = tenants?.length ?? 0

  const stats = [
    {
      label: 'MRR total',
      value: formatEur(totalMrr),
      icon: TrendingUp,
      color: 'text-[#16a34a]',
      bg: 'bg-[#dcfce7]',
    },
    {
      label: 'Clients actifs',
      value: clientCount,
      icon: Users,
      color: 'text-[#2563eb]',
      bg: 'bg-[#dbeafe]',
    },
    {
      label: 'Automatisations en erreur',
      value: errorAutomations?.length ?? 0,
      icon: AlertCircle,
      color: 'text-[#dc2626]',
      bg: 'bg-[#fee2e2]',
    },
  ]

  return (
    <div className="p-6 max-w-[960px]">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">Vue d&apos;ensemble</h1>
        <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
          Activité globale de la plateforme Acalmy Hub
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className="card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 ${stat.bg}`}>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#0a0a0a]">{stat.value}</p>
              <p className="text-xs text-[rgba(0,0,0,0.4)]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Clients récents */}
        <div className="card">
          <div className="p-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0a0a0a]">Clients récents</h2>
            <Link href="/admin/clients" className="text-xs text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors">
              Tout voir →
            </Link>
          </div>
          {!tenants?.length ? (
            <p className="p-4 text-sm text-[rgba(0,0,0,0.35)]">Aucun client.</p>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.04)]">
              {tenants.slice(0, 5).map(tenant => (
                <Link
                  key={tenant.id}
                  href={`/admin/clients/${tenant.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#fafaf9] transition-colors"
                >
                  <div>
                    <p className="text-[13px] font-medium text-[#0a0a0a]">{tenant.company_name}</p>
                    <p className="text-xs text-[rgba(0,0,0,0.35)]">{tenant.slug}</p>
                  </div>
                  <p className="text-sm font-medium text-[#0a0a0a]">{formatEur(tenant.mrr ?? 0)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Exécutions récentes */}
        <div className="card">
          <div className="p-4 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0a0a0a]">Exécutions récentes</h2>
            <Link href="/admin/executions" className="text-xs text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors">
              Tout voir →
            </Link>
          </div>
          {!recentExecs?.length ? (
            <p className="p-4 text-sm text-[rgba(0,0,0,0.35)]">Aucune exécution.</p>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.04)]">
              {recentExecs.map(exec => {
                const auto = Array.isArray(exec.automations) ? exec.automations[0] : exec.automations as { name: string } | null
                return (
                  <div key={exec.id} className="flex items-center gap-3 px-4 py-2.5">
                    <StatusDot status={exec.status === 'success' ? 'active' : 'error'} />
                    <p className="flex-1 text-[13px] text-[#0a0a0a] truncate">
                      {auto?.name ?? '—'}
                    </p>
                    <p className="text-xs text-[rgba(0,0,0,0.35)] shrink-0">
                      {formatRelativeTime(exec.ran_at)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Erreurs à traiter */}
      {(errorAutomations?.length ?? 0) > 0 && (
        <div className="card mt-4">
          <div className="p-4 border-b border-[rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-semibold text-[#0a0a0a] flex items-center gap-2">
              <AlertCircle size={14} className="text-[#dc2626]" />
              Automatisations en erreur
            </h2>
          </div>
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            {errorAutomations?.map(auto => {
              const tenant = Array.isArray(auto.tenants) ? auto.tenants[0] : auto.tenants as { company_name: string; slug: string } | null
              return (
                <div key={auto.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-[#0a0a0a]">{auto.name}</p>
                    <p className="text-xs text-[rgba(0,0,0,0.35)]">{tenant?.company_name ?? '—'}</p>
                  </div>
                  <Link
                    href={`/admin/clients/${auto.tenant_id}`}
                    className="text-xs text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors"
                  >
                    Voir →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
