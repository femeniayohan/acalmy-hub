import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { StatusDot } from '@/components/ui/StatusDot'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatEur, formatDate, formatRelativeTime } from '@/lib/utils'
import { N8nProvisioningForm } from '@/components/admin/N8nProvisioningForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: 'Détail client — Admin' }
}

export default async function AdminClientDetailPage({ params }: Props) {
  const supabase = createServiceClient()

  const [{ data: tenant }, { data: automations }, { data: executions }] = await Promise.all([
    supabase
      .from('tenants')
      .select('*')
      .eq('id', params.id)
      .single(),

    supabase
      .from('automations')
      .select('*')
      .eq('tenant_id', params.id)
      .order('status'),

    supabase
      .from('executions')
      .select('id, status, ran_at, duration_ms, error_message, automation_id')
      .eq('tenant_id', params.id)
      .order('ran_at', { ascending: false })
      .limit(30),
  ])

  if (!tenant) notFound()

  const activeCount = automations?.filter(a => a.status === 'active').length ?? 0
  const totalRuns = executions?.length ?? 0
  const successRate = totalRuns > 0
    ? Math.round((executions?.filter(e => e.status === 'success').length ?? 0) / totalRuns * 100)
    : 0

  return (
    <div className="p-6 max-w-[900px]">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors mb-5"
      >
        <ArrowLeft size={14} />
        Clients
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">{tenant.company_name}</h1>
          <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
            {tenant.slug} · {tenant.plan} · Client depuis {formatDate(tenant.created_at)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-[#0a0a0a]">{formatEur(tenant.mrr)}</p>
          <p className="text-xs text-[rgba(0,0,0,0.4)]">MRR</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Automatisations actives', value: activeCount },
          { label: 'Exécutions (30 jours)', value: totalRuns },
          { label: 'Taux de succès', value: `${successRate}%` },
        ].map(stat => (
          <div key={stat.label} className="card p-4 text-center">
            <p className="text-2xl font-semibold text-[#0a0a0a]">{stat.value}</p>
            <p className="text-xs text-[rgba(0,0,0,0.4)] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* n8n provisioning */}
      <N8nProvisioningForm
        tenantId={tenant.id}
        currentUrl={(tenant as { n8n_url?: string | null }).n8n_url ?? null}
        hasApiKey={!!(tenant as { n8n_api_key?: string | null }).n8n_api_key}
      />

      {/* Automations */}
      <div className="card mb-4">
        <div className="p-4 border-b border-[rgba(0,0,0,0.06)]">
          <h2 className="text-sm font-semibold text-[#0a0a0a]">Automatisations</h2>
        </div>
        {!automations?.length ? (
          <p className="p-4 text-sm text-[rgba(0,0,0,0.35)]">Aucune automatisation.</p>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            {automations.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <StatusDot status={a.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#0a0a0a] truncate">{a.name}</p>
                  <p className="text-xs text-[rgba(0,0,0,0.35)]">
                    {a.monthly_runs} runs ce mois
                    {a.last_run_at ? ` · ${formatRelativeTime(a.last_run_at)}` : ''}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent executions */}
      <div className="card">
        <div className="p-4 border-b border-[rgba(0,0,0,0.06)]">
          <h2 className="text-sm font-semibold text-[#0a0a0a]">Exécutions récentes</h2>
        </div>
        {!executions?.length ? (
          <p className="p-4 text-sm text-[rgba(0,0,0,0.35)]">Aucune exécution.</p>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            {executions.slice(0, 15).map(exec => (
              <div key={exec.id} className="flex items-center gap-3 px-4 py-2.5">
                <StatusDot status={exec.status === 'success' ? 'active' : 'error'} />
                <p className="flex-1 text-xs text-[rgba(0,0,0,0.5)]">
                  {formatDate(exec.ran_at, { day: 'numeric', month: 'short' })} · {new Date(exec.ran_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  {exec.error_message && (
                    <span className="text-[#dc2626] ml-2">{exec.error_message.slice(0, 80)}</span>
                  )}
                </p>
                <StatusBadge status={exec.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
