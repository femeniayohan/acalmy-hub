import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatusDot } from '@/components/ui/StatusDot'
import { ExecutionFeed } from '@/components/automations/ExecutionFeed'
import { AutomationActions } from '@/components/automations/AutomationActions'
import { formatDate, formatDuration, translateCategory } from '@/lib/utils'
import { ArrowLeft, Settings } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: { slug: string; id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: 'Détail automatisation' }
}

export default async function AutomationDetailPage({ params }: Props) {
  auth().protect()

  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) notFound()

  const supabase = createServiceClient()

  const [{ data: automation }, { data: executions }] = await Promise.all([
    supabase
      .from('automations')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', tenantId) // RLS by tenant
      .single(),

    supabase
      .from('executions')
      .select('id, status, ran_at, duration_ms, error_message')
      .eq('automation_id', params.id)
      .eq('tenant_id', tenantId)
      .order('ran_at', { ascending: false })
      .limit(20),
  ])

  if (!automation) notFound()

  // ── Metrics ────────────────────────────────────────────────────────────────
  const totalRuns = executions?.length ?? 0
  const successRuns = executions?.filter(e => e.status === 'success').length ?? 0
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0
  const avgDuration = totalRuns > 0
    ? Math.round((executions?.reduce((s, e) => s + (e.duration_ms ?? 0), 0) ?? 0) / totalRuns)
    : 0

  return (
    <div className="p-6 max-w-[760px]">
      {/* Back */}
      <Link
        href={`/${params.slug}/automations`}
        className="inline-flex items-center gap-1.5 text-sm text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors mb-5"
      >
        <ArrowLeft size={14} />
        Mes automatisations
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusDot status={automation.status} pulse />
            <h1 className="text-xl font-semibold text-[#0a0a0a]">{automation.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={automation.status} />
            <span className="text-xs text-[rgba(0,0,0,0.35)]">
              {translateCategory(automation.category)}
            </span>
            {automation.activated_at && (
              <span className="text-xs text-[rgba(0,0,0,0.35)]">
                · Activée le {formatDate(automation.activated_at)}
              </span>
            )}
          </div>
        </div>

        <AutomationActions
          automationId={automation.id}
          tenantId={tenantId}
          currentStatus={automation.status}
          n8nWorkflowId={automation.n8n_workflow_id}
        />
      </div>

      {automation.description && (
        <p className="text-sm text-[rgba(0,0,0,0.5)] mb-6 leading-relaxed">
          {automation.description}
        </p>
      )}

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-semibold text-[#0a0a0a]">
            {automation.monthly_runs.toLocaleString('fr-FR')}
          </p>
          <p className="text-xs text-[rgba(0,0,0,0.4)] mt-1">Runs ce mois</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-semibold text-[#0a0a0a]">{successRate}%</p>
          <p className="text-xs text-[rgba(0,0,0,0.4)] mt-1">Taux de succès</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-semibold text-[#0a0a0a]">
            {avgDuration > 0 ? formatDuration(avgDuration) : '—'}
          </p>
          <p className="text-xs text-[rgba(0,0,0,0.4)] mt-1">Durée moyenne</p>
        </div>
      </div>

      {/* Configuration status */}
      {!automation.credentials_configured && automation.status === 'pending' && (
        <div className="card border-[rgba(217,119,6,0.3)] bg-[#fffbeb] p-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#92400e]">Configuration requise</p>
            <p className="text-xs text-[#a16207] mt-0.5">
              Pour activer cette automatisation, configurez les connexions nécessaires.
            </p>
          </div>
          <button className="btn-primary shrink-0 gap-1.5 text-xs px-3 py-1.5">
            <Settings size={13} />
            Configurer
          </button>
        </div>
      )}

      {/* Execution history */}
      <div className="card">
        <div className="p-4 border-b border-[rgba(0,0,0,0.06)]">
          <h2 className="text-sm font-semibold text-[#0a0a0a]">
            Historique des exécutions
          </h2>
        </div>
        <ExecutionFeed executions={executions ?? []} />
      </div>
    </div>
  )
}
