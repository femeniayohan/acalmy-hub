import { headers, cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { MetricCard } from '@/components/ui/MetricCard'
import {
  formatRelativeTime,
  estimateTimeSaved,
  firstName,
} from '@/lib/utils'
import { ActivityFeed } from '@/components/ui/ActivityFeed'
import Link from 'next/link'
import { Check, Zap } from 'lucide-react'

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

  const activeAutomations = automations?.filter(a => a.status === 'active') ?? []

  const userFirstName = firstName(
    clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ''}`
      : clerkUser?.emailAddresses[0]?.emailAddress ?? null
  )

  const pendingConfig = automations?.filter(a => a.status === 'pending' && !a.credentials_configured) ?? []

  const visitedMarketplace = cookies().get('visited_marketplace')?.value === '1'

  const formattedDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="px-10 py-12 max-w-[1400px] animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <p className="section-label mb-3">Tableau de bord</p>
          <h1 className="page-title">{`Bonjour, ${userFirstName}.`}</h1>
        </div>
        <div className="text-right hidden sm:block">
          <p className="capitalize" style={{ fontSize: '12px', fontWeight: 300, color: '#a1a1aa', letterSpacing: '0.05em' }}>
            {formattedDate}
          </p>
          <p className="mt-1" style={{ fontSize: '12px', fontWeight: 300, color: '#a1a1aa' }}>
            {activeAutomations.length} actives
          </p>
        </div>
      </div>

      {/* Bannière config en attente */}
      {pendingConfig.length > 0 && (
        <div className="flex items-center gap-4 px-6 py-4 mb-10" style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,0,0,0.01)', borderLeft: '2px solid #a8a29e' }}>
          <p className="text-sm font-light flex-1" style={{ color: '#27272a' }}>
            {pendingConfig.length === 1
              ? `${pendingConfig[0].name} attend votre configuration`
              : `${pendingConfig.length} automatisations attendent votre configuration`}
          </p>
          <Link href={`/${params.slug}/automations`}
            className="text-xs font-medium uppercase tracking-widest transition-colors"
            style={{ color: '#a1a1aa' }}>
            Configurer →
          </Link>
        </div>
      )}

      {/* Onboarding checklist */}
      {totalRunsThisMonth === 0 && (
        <div className="card p-8 mb-10">
          <p className="section-label mb-6">Démarrage</p>
          <div className="flex flex-col gap-4">
            {[
              { done: true, label: 'Créer votre espace' },
              { done: activeAutomations.length > 0, label: 'Activer une automatisation', href: `/${params.slug}/automations` },
              { done: visitedMarketplace, label: 'Explorer le marketplace', href: `/${params.slug}/marketplace` },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ border: step.done ? 'none' : '1px solid #d4d4d8', background: step.done ? '#a8a29e' : 'transparent' }}
                >
                  {step.done && <Check size={8} strokeWidth={2} color="#ffffff" />}
                </div>
                {step.href && !step.done ? (
                  <Link href={step.href} className="text-sm font-light transition-colors" style={{ color: '#71717a' }}>
                    {step.label}
                  </Link>
                ) : (
                  <span className="text-sm font-light" style={{ color: step.done ? '#a1a1aa' : '#71717a' }}>
                    {step.label}
                  </span>
                )}
              </div>
            ))}
          </div>
          {/* Progress line */}
          <div className="mt-6 h-px w-full" style={{ background: '#eeeeee' }}>
            <div
              className="h-px transition-all"
              style={{ background: '#a8a29e', width: `${([true, activeAutomations.length > 0, visitedMarketplace].filter(Boolean).length / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <div className="stagger-1 animate-fade-in">
          <MetricCard label="Exécutions ce mois" value={totalRunsThisMonth.toLocaleString('fr-FR')}
            subtext={`vs ${totalRunsLastMonth.toLocaleString('fr-FR')} le mois dernier`} />
        </div>
        <div className="stagger-2 animate-fade-in">
          <MetricCard label="Taux de succès" value={`${successRate}%`}
            subtext={errorCount > 0 ? `${errorCount} erreur${errorCount > 1 ? 's' : ''}` : 'Aucune erreur'} />
        </div>
        <div className="stagger-3 animate-fade-in">
          <MetricCard label="Temps économisé" value={`${timeSavedHours}h`}
            subtext="Estimation basée sur vos automatisations" />
        </div>
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Activité récente */}
        <div className="card p-8 lg:row-span-2">
          <p className="section-label mb-6">Activité récente</p>
          <ActivityFeed
            automations={(automations ?? []).map(a => ({
              id: a.id, name: a.name, status: a.status,
              activated_at: (a as unknown as { activated_at: string | null }).activated_at ?? null,
              created_at: (a as unknown as { created_at: string }).created_at,
            }))}
            executions={(recentExecutions ?? []).map(exec => ({
              id: exec.id, status: exec.status, ran_at: exec.ran_at, error_message: exec.error_message,
              automation: Array.isArray(exec.automations) ? exec.automations[0] ?? null : (exec.automations as { name: string } | null),
            }))}
          />
        </div>

        {/* Automatisations actives */}
        <div className="card p-8 lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <p className="section-label">Automatisations actives</p>
            <Link href={`/${params.slug}/automations`}
              className="text-xs font-light transition-colors uppercase tracking-widest"
              style={{ color: '#a1a1aa' }}>
              Tout voir
            </Link>
          </div>

          {activeAutomations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Zap size={20} strokeWidth={1.5} style={{ color: '#d4d4d8' }} />
              <div className="text-center">
                <p className="text-sm font-light" style={{ color: '#a1a1aa' }}>Aucune automatisation active</p>
                <Link href={`/${params.slug}/marketplace`}
                  className="text-xs font-light uppercase tracking-widest mt-1 block transition-colors"
                  style={{ color: '#a1a1aa' }}>
                  Découvrir le marketplace
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-px">
              {activeAutomations.slice(0, 5).map((automation) => (
                <li key={automation.id}>
                  <Link href={`/${params.slug}/automations/${automation.id}`}
                    className="flex items-center gap-4 py-3 group transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#27272a' }}>
                        {automation.name}
                      </p>
                      {automation.last_run_at && (
                        <p className="text-xs font-light mt-0.5 uppercase tracking-widest" style={{ color: '#a1a1aa' }}>
                          {formatRelativeTime(automation.last_run_at)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-light uppercase tracking-widest shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#a1a1aa' }}>
                      {automation.monthly_runs} runs
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
