import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ArrowLeft, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import { MessageThread } from '@/components/custom/MessageThread'
import { SlotBookingForm } from '@/components/custom/SlotBookingForm'
import { EditRequestForm } from '@/components/custom/EditRequestForm'

export const metadata: Metadata = { title: 'Demande sur mesure' }

const STATUS: Record<string, { label: string; className: string }> = {
  pending:     { label: 'En attente',  className: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'En cours',    className: 'bg-blue-100 text-blue-700' },
  delivered:   { label: 'Livré',       className: 'bg-emerald-100 text-emerald-700' },
}

export default async function CustomRequestDetailPage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  auth().protect()

  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  if (!tenantId) notFound()

  const supabase = createServiceClient()

  const [{ data: req }, { data: messages }] = await Promise.all([
    supabase
      .from('custom_requests')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single(),

    supabase
      .from('custom_request_messages')
      .select('id, content, author_role, author_name, created_at')
      .eq('request_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  if (!req) notFound()

  const { label, className } = STATUS[req.status] ?? { label: req.status, className: 'bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.5)]' }

  const BUDGET_LABELS: Record<string, string> = {
    lt500: 'Moins de 500€', '500_1500': '500€ – 1 500€',
    '1500_3000': '1 500€ – 3 000€', gt3000: 'Plus de 3 000€', unknown: 'Non défini',
  }

  const callRequested = (req as { call_requested?: boolean }).call_requested ?? false
  const proposedSlot  = (req as { proposed_slot?: string | null }).proposed_slot ?? null
  const slotStatus    = (req as { slot_status?: string | null }).slot_status ?? null

  return (
    <div className="p-4 sm:p-6 max-w-[680px]">
      <Link
        href={`/${params.slug}/custom`}
        className="inline-flex items-center gap-1.5 text-sm text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors mb-5"
      >
        <ArrowLeft size={14} />
        Mes demandes
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0 pr-3">
          <h1 className="text-xl font-semibold text-[#0a0a0a] truncate">{req.title}</h1>
          <p className="text-sm text-[rgba(0,0,0,0.4)] mt-0.5">
            {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${className}`}>{label}</span>
      </div>

      {/* Section call — visible si call demandé ou créneau existant */}
      {(callRequested || proposedSlot) && (
        <div className={`bento-card p-5 mb-4 ${callRequested && !proposedSlot ? 'border-amber-300/60 bg-amber-50/30' : ''}`}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={15} className={callRequested && !proposedSlot ? 'text-amber-600' : 'text-[rgba(0,0,0,0.4)]'} />
            <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${callRequested && !proposedSlot ? 'text-amber-700' : 'text-[rgba(0,0,0,0.35)]'}`}>
              {slotStatus === 'confirmed' ? 'Call confirmé' : 'Prise de rendez-vous'}
            </p>
          </div>
          <SlotBookingForm
            requestId={req.id}
            callRequested={callRequested}
            currentSlot={proposedSlot}
            slotStatus={slotStatus}
          />
        </div>
      )}

      {/* Modifier la demande */}
      <div className="bento-card p-5 mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(0,0,0,0.35)] mb-4">Votre demande</p>
        <EditRequestForm
          requestId={req.id}
          description={req.description}
          tools={req.tools ?? ''}
          budget={req.budget ?? ''}
        />
      </div>

      {/* Fil de discussion */}
      <div className="bento-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(0,0,0,0.35)] mb-4">Discussion</p>
        <MessageThread
          messages={messages ?? []}
          postUrl={`/api/custom-request/${req.id}/messages`}
          currentRole="client"
        />
      </div>
    </div>
  )
}
