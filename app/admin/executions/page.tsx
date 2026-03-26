import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { StatusDot } from '@/components/ui/StatusDot'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, formatTime, formatDuration } from '@/lib/utils'

export const metadata: Metadata = { title: 'Exécutions — Admin' }

export default async function AdminExecutionsPage({
  searchParams,
}: {
  searchParams: { status?: string; tenant?: string }
}) {
  const supabase = createServiceClient()

  let query = supabase
    .from('executions')
    .select(`
      id, status, ran_at, duration_ms, error_message, tenant_id,
      tenants(company_name, slug),
      automations(name)
    `)
    .order('ran_at', { ascending: false })
    .limit(100)

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }
  if (searchParams.tenant) {
    query = query.eq('tenant_id', searchParams.tenant)
  }

  const { data: executions } = await query

  const totalCount = executions?.length ?? 0
  const errorCount = executions?.filter(e => e.status === 'error').length ?? 0

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#0a0a0a]">Exécutions</h1>
        <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
          {totalCount} exécutions · {errorCount} erreur{errorCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <a
          href="/admin/executions"
          className={`px-3 py-1.5 text-xs font-medium rounded-[9999px] transition-colors ${
            !searchParams.status
              ? 'bg-[#0a0a0a] text-white'
              : 'bg-white border border-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.5)] hover:text-[#0a0a0a]'
          }`}
        >
          Toutes
        </a>
        <a
          href="/admin/executions?status=error"
          className={`px-3 py-1.5 text-xs font-medium rounded-[9999px] transition-colors ${
            searchParams.status === 'error'
              ? 'bg-[#0a0a0a] text-white'
              : 'bg-white border border-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.5)] hover:text-[#0a0a0a]'
          }`}
        >
          Erreurs uniquement
        </a>
      </div>

      <div className="card overflow-hidden">
        {!executions?.length ? (
          <p className="p-8 text-center text-sm text-[rgba(0,0,0,0.35)]">
            Aucune exécution.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)]">
                {['Statut', 'Client', 'Automatisation', 'Date', 'Durée', 'Erreur'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(0,0,0,0.04)]">
              {executions.map(exec => {
                const tenant = Array.isArray(exec.tenants) ? exec.tenants[0] : exec.tenants
                const automation = Array.isArray(exec.automations) ? exec.automations[0] : exec.automations

                return (
                  <tr key={exec.id} className="hover:bg-[#fafaf9]">
                    <td className="px-4 py-3">
                      <StatusBadge status={exec.status} />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#0a0a0a]">
                      {(tenant as { company_name: string } | null)?.company_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[rgba(0,0,0,0.6)]">
                      {(automation as { name: string } | null)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[rgba(0,0,0,0.4)]">
                      {formatDate(exec.ran_at, { day: 'numeric', month: 'short' })}
                      {' · '}{formatTime(exec.ran_at)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[rgba(0,0,0,0.4)]">
                      {exec.duration_ms != null ? formatDuration(exec.duration_ms) : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {exec.error_message ? (
                        <p className="text-xs text-[#dc2626] truncate" title={exec.error_message}>
                          {exec.error_message}
                        </p>
                      ) : (
                        <span className="text-xs text-[rgba(0,0,0,0.2)]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
