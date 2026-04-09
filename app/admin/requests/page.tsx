import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Demandes sur mesure — Admin' }

const STATUS: Record<string, { label: string; className: string }> = {
  pending:     { label: 'En attente',  className: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'En cours',    className: 'bg-blue-100 text-blue-700' },
  delivered:   { label: 'Livré',       className: 'bg-emerald-100 text-emerald-700' },
}

export default async function AdminRequestsPage() {
  const supabase = createServiceClient()

  const { data: requests } = await supabase
    .from('custom_requests')
    .select('id, title, description, tools, budget, status, created_at, tenant_id, tenants(company_name, slug)')
    .order('created_at', { ascending: false })

  const counts = {
    pending:     requests?.filter(r => r.status === 'pending').length ?? 0,
    in_progress: requests?.filter(r => r.status === 'in_progress').length ?? 0,
    delivered:   requests?.filter(r => r.status === 'delivered').length ?? 0,
  }

  return (
    <div className="p-6 max-w-[900px]">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">Demandes sur mesure</h1>
          <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
            {requests?.length ?? 0} demande{(requests?.length ?? 0) !== 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex gap-2">
          {([['pending', 'En attente'], ['in_progress', 'En cours'], ['delivered', 'Livré']] as const).map(([key, label]) => (
            <div key={key} className="text-center card px-3 py-2">
              <p className="text-lg font-semibold text-[#0a0a0a]">{counts[key]}</p>
              <p className="text-[10px] text-[rgba(0,0,0,0.4)]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card divide-y divide-[rgba(0,0,0,0.05)]">
        {!requests?.length ? (
          <p className="p-6 text-sm text-[rgba(0,0,0,0.35)] text-center">Aucune demande pour l&apos;instant.</p>
        ) : (
          requests.map((req) => {
            const tenant = Array.isArray(req.tenants) ? req.tenants[0] : req.tenants
            const { label, className } = STATUS[req.status] ?? { label: req.status, className: 'bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.5)]' }

            return (
              <Link
                key={req.id}
                href={`/admin/requests/${req.id}`}
                className="flex items-start gap-4 px-4 py-3.5 hover:bg-[rgba(0,0,0,0.02)] transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-medium text-[#0a0a0a] truncate group-hover:underline underline-offset-2">
                      {req.title}
                    </p>
                  </div>
                  <p className="text-xs text-[rgba(0,0,0,0.35)]">
                    {(tenant as { company_name?: string } | null)?.company_name ?? '—'}
                    {' · '}
                    {formatDate(req.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${className}`}>
                  {label}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
