import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusDot } from '@/components/ui/StatusDot'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Sparkline } from '@/components/ui/Sparkline'
import {
  formatRelativeTime,
  formatTime,
  estimateTimeSaved,
  firstName,
} from '@/lib/utils'
import type { Automation, Execution, DailyRunPoint } from '@/lib/supabase/types'
import { ActivityFeed } from '@/components/ui/ActivityFeed'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Tableau de bord' }

export default async function DashboardPage({ params }: { params: { slug: string } }) {
  auth().protect()

  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) notFound()

  const clerkUser = await currentUser()
  const supabase = createServiceClient()

  // ── Fetch in parallel ──────────────────────────────────────────────────────
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: automations },
    { data: executionsThisMonth },
    { data: executionsLastMonth },
    { data: recentExecutions },
    { data: dailyRunsRaw },
  ] = await Promise.all([
    supabase
      .from('automations')
      .select('id, name, category, status, monthly_runs, last_run_at, last_run_status, credentials_configured')
      .eq('tenant_id', tenantId)
      .order('status', { ascending: false }),

    supabase
      .from('executions')
      .select('id, status, duration_ms')
      .eq('tenant_id', tenantId)
      .gte('ran_at', startOfMonth),

    supabase
      .from('executions')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .gte('ran_at', startOfLastMonth)
      .lte('ran_at', endOfLastMonth),

    supabase
      .from('executions')
      .select('id, status, ran_at, duration_ms, error_message, automation_id, automations(id, name, category)')
      .eq('tenant_id', tenantId)
      .order('ran_at', { ascending: false })
      .limit(6),

    supabase
      .from('executions')
      .select('ran_at')
      .eq('tenant_id', tenantId)
      .gte('ran_at', thirtyDaysAgo)
      .order('ran_at', { ascending: true }),
  ])

  // ── Metrics ────────────────────────────────────────────────────────────────
  const totalRunsThisMonth = executionsThisMonth?.length ?? 0
  const totalRunsLastMonth = executionsLastMonth?.length ?? 0
  const successRunsThisMonth = executionsThisMonth?.filter(e => e.status === 'success').length ?? 0
  const errorCount = totalRunsThisMonth - successRunsThisMonth
  const successRate = totalRunsThisMonth > 0
    ? Math.round((successRunsThisMonth / totalRunsThisMonth) * 100)
    : 0

  const avgDurationMs = totalRunsThisMonth > 0
    ? (executionsThisMonth?.reduce((acc, e) => acc + (e.duration_ms ?? 0), 0) ?? 0) / totalRunsThisMonth
    : 0
  const { hours: timeSavedHours } = estimateTimeSaved(totalRunsThisMonth, avgDurationMs)

  const runTrend = totalRunsLastMonth > 0
    ? Math.round(((totalRunsThisMonth - totalRunsLastMonth) / totalRunsLastMonth) * 100)
    : 0

  // ── Sparkline: daily buckets for last 30 days ─────────────────────────────
  const dailyBuckets: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    dailyBuckets[d.toISOString().slice(0, 10)] = 0
  }
  dailyRunsRaw?.forEach((e) => {
    const day = new Date(e.ran_at).toISOString().slice(0, 10)
    if (day in dailyBuckets) dailyBuckets[day]++
  })
  const sparklineData = Object.values(dailyBuckets)

  const activeAutomations = automations?.filter(a => a.status === 'active') ?? []

  const userFirstName = firstName(
    clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ''}`
      : clerkUser?.emailAddresses[0]?.emailAddress ?? null
  )

  const pendingConfig = automations?.filter(a => a.status === 'pending' && !a.credentials_configured) ?? []

  return (
    <div className="p-4 sm:p-6 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">
          Bonjour{userFirstName ? `, ${userFirstName}` : ''} 👋
        </h1>
        <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
          Voici un résumé de vos automatisations ce mois-ci.
        </p>
      </div>

      {/* Bannière config en attente */}
      {pendingConfig.length > 0 && (
        <div className="mb-5 flex items-center justify-between gap-3 bg-[#fef9c3] border border-[#fde047] rounded-[10px] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚙️</span>
            <p className="text-sm font-medium text-[#713f12]">
              {pendingConfig.length === 1
                ? `${pendingConfig[0].name} attend votre configuration`
                : `${pendingConfig.length} automatisations attendent votre configuration`}
            </p>
          </div>
          <Link
            href={`/${params.slug}/automations`}
            className="shrink-0 text-xs font-medium text-[#713f12] underline underline-offset-2 hover:no-underline"
          >
            Configurer →
          </Link>
        </div>
      )}

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Metric — Exécutions */}
        <MetricCard
          label="Exécutions ce mois"
          value={totalRunsThisMonth.toLocaleString('fr-FR')}
          subtext={`vs ${totalRunsLastMonth.toLocaleString('fr-FR')} le mois dernier`}
          trend={totalRunsLastMonth > 0 ? { value: runTrend } : undefined}
        >
          <Sparkline
            data={sparklineData}
            width={180}
            height={36}
            color="#16a34a"
            fillColor="#16a34a"
          />
        </MetricCard>

        {/* Metric — Taux de succès */}
        <MetricCard
          label="Taux de succès"
          value={`${successRate}%`}
          subtext={errorCount > 0 ? `${errorCount} erreur${errorCount > 1 ? 's' : ''} ce mois` : 'Aucune erreur'}
        />

        {/* Metric — Temps économisé */}
        <MetricCard
          label="Temps économisé (est.)"
          value={`${timeSavedHours}h`}
          subtext="Estimation mensuelle basée sur vos automatisations"
        />

        {/* Active automations — 2/3 width */}
        <div className="card p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0a0a0a]">
              Automatisations actives
            </h2>
            <Link
              href={`/${params.slug}/automations`}
              className="text-xs text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors"
            >
              Tout voir →
            </Link>
          </div>

          {activeAutomations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[rgba(0,0,0,0.35)]">
                Aucune automatisation active pour le moment.
              </p>
              <Link
                href={`/${params.slug}/marketplace`}
                className="inline-block mt-3 text-sm font-medium text-[#0a0a0a] underline underline-offset-2"
              >
                Découvrir le marketplace
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {activeAutomations.slice(0, 5).map((automation) => (
                <li key={automation.id}>
                  <Link
                    href={`/${params.slug}/automations/${automation.id}`}
                    className="flex items-center gap-3 p-3 rounded-[8px] hover:bg-[#f5f4f0] transition-colors group"
                  >
                    <StatusDot status={automation.status} pulse />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0a0a0a] truncate">
                        {automation.name}
                      </p>
                      {automation.last_run_at && (
                        <p className="text-xs text-[rgba(0,0,0,0.4)] mt-0.5">
                          Dernière exécution {formatRelativeTime(automation.last_run_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[rgba(0,0,0,0.4)]">
                        {automation.monthly_runs} runs
                      </span>
                      <StatusBadge status={automation.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Activité récente */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[#0a0a0a] mb-4">
            Activité récente
          </h2>
          <ActivityFeed
            automations={(automations ?? []).map(a => ({
              id: a.id,
              name: a.name,
              status: a.status,
              activated_at: (a as unknown as { activated_at: string | null }).activated_at ?? null,
              created_at: (a as unknown as { created_at: string }).created_at,
            }))}
            executions={(recentExecutions ?? []).map(exec => ({
              id: exec.id,
              status: exec.status,
              ran_at: exec.ran_at,
              error_message: exec.error_message,
              automation: Array.isArray(exec.automations)
                ? exec.automations[0] ?? null
                : (exec.automations as { name: string } | null),
            }))}
          />
        </div>
      </div>
    </div>
  )
}
