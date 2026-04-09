import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { RequestStatusForm } from '@/components/admin/RequestStatusForm'
import { MessageThread } from '@/components/custom/MessageThread'
import { AdminCallControls } from '@/components/admin/AdminCallControls'

interface Props { params: { id: string } }

export const metadata: Metadata = { title: 'Demande — Admin' }

const BUDGET_LABELS: Record<string, string> = {
  lt500: 'Moins de 500€', '500_1500': '500€ – 1 500€',
  '1500_3000': '1 500€ – 3 000€', gt3000: 'Plus de 3 000€', unknown: 'Non défini',
}

export default async function AdminRequestDetailPage({ params }: Props) {
  const supabase = createServiceClient()

  const [{ data: req }, { data: messages }] = await Promise.all([
    supabase
      .from('custom_requests')
      .select('*, tenants(company_name, slug)')
      .eq('id', params.id)
      .single(),

    supabase
      .from('custom_request_messages')
      .select('id, content, author_role, author_name, created_at')
      .eq('request_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  if (!req) notFound()

  const tenant = Array.isArray(req.tenants) ? req.tenants[0] : req.tenants
  const callRequested = (req as { call_requested?: boolean }).call_requested ?? false
  const proposedSlot  = (req as { proposed_slot?: string | null }).proposed_slot ?? null
  const slotStatus    = (req as { slot_status?: string | null }).slot_status ?? null

  return (
    <div className="p-6 max-w-[700px]">
      <Link
        href="/admin/requests"
        className="inline-flex items-center gap-1.5 text-sm text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors mb-5"
      >
        <ArrowLeft size={14} />
        Demandes
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#0a0a0a]">{req.title}</h1>
          <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
            {(tenant as { company_name?: string } | null)?.company_name ?? '—'}
            {' · '}
            {formatDate(req.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Statut */}
      <div className="card p-5 mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(0,0,0,0.35)] mb-3">Statut</p>
        <RequestStatusForm requestId={req.id} currentStatus={req.status} />
      </div>

      {/* Contrôles call */}
      <div className="card p-5 mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(0,0,0,0.35)] mb-3">Call</p>
        <AdminCallControls
          requestId={req.id}
          callRequested={callRequested}
          proposedSlot={proposedSlot}
          slotStatus={slotStatus}
        />
      </div>

      {/* Description */}
      <div className="card p-5 mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(0,0,0,0.35)] mb-3">Besoin décrit</p>
        <p className="text-sm text-[#0a0a0a] leading-relaxed whitespace-pre-wrap">{req.description}</p>
      </div>

      {/* Détails */}
      <div className="card p-5 mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(0,0,0,0.35)] mb-3">Détails</p>
        <dl className="space-y-2.5">
          <div className="flex gap-3">
            <dt className="text-xs font-medium text-[rgba(0,0,0,0.4)] w-24 shrink-0">Outils</dt>
            <dd className="text-sm text-[#0a0a0a]">{req.tools || '—'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-xs font-medium text-[rgba(0,0,0,0.4)] w-24 shrink-0">Budget</dt>
            <dd className="text-sm text-[#0a0a0a]">{BUDGET_LABELS[req.budget] ?? req.budget ?? '—'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-xs font-medium text-[rgba(0,0,0,0.4)] w-24 shrink-0">Client</dt>
            <dd className="text-sm text-[#0a0a0a]">
              <Link href={`/admin/clients/${req.tenant_id}`} className="underline underline-offset-2 hover:no-underline">
                {(tenant as { company_name?: string } | null)?.company_name ?? '—'}
              </Link>
            </dd>
          </div>
        </dl>
      </div>

      {/* Discussion */}
      <div className="card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(0,0,0,0.35)] mb-4">Discussion</p>
        <MessageThread
          messages={messages ?? []}
          postUrl={`/api/admin/requests/${req.id}/messages`}
          currentRole="admin"
        />
      </div>
    </div>
  )
}
