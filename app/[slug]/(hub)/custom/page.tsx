import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { NewRequestToggle } from '@/components/custom/NewRequestToggle'
import Link from 'next/link'
import { CalendarClock, MessageSquare } from 'lucide-react'

export const metadata: Metadata = { title: 'Demande sur mesure' }

const STATUS: Record<string, { label: string }> = {
  pending:     { label: 'En attente' },
  in_progress: { label: 'En cours' },
  delivered:   { label: 'Livré' },
}

export default async function CustomPage({ params }: { params: { slug: string } }) {
  auth().protect()

  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  let requests: {
    id: string; title: string; status: string; created_at: string;
    call_requested?: boolean; proposed_slot?: string | null; slot_status?: string | null
  }[] = []

  let messageCounts: Record<string, number> = {}

  if (tenantId) {
    try {
      const supabase = createServiceClient()
      const { data } = await supabase
        .from('custom_requests')
        .select('id, title, status, created_at, call_requested, proposed_slot, slot_status')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      requests = (data ?? []) as typeof requests

      // Count messages per request
      if (requests.length > 0) {
        const { data: msgs } = await supabase
          .from('custom_request_messages')
          .select('request_id')
          .in('request_id', requests.map(r => r.id))

        messageCounts = (msgs ?? []).reduce((acc, m) => {
          acc[m.request_id] = (acc[m.request_id] ?? 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    } catch {
      // Fail silently if tables don't exist yet
    }
  }

  return (
    <div className="px-10 py-12 max-w-[680px] animate-fade-in">
      <div className="mb-8">
        <p className="section-label mb-3">Sur mesure</p>
        <h1 className="page-title">Demandes sur mesure</h1>
        <p className="text-sm font-light mt-2" style={{ color: '#a1a1aa' }}>
          Décrivez votre besoin et notre équipe vous recontacte sous 24h.
        </p>
      </div>

      {/* Demandes existantes */}
      {requests.length > 0 && (
        <div className="card mb-6" style={{ borderTop: '1px solid #eeeeee' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #eeeeee' }}>
            <p className="section-label">Mes demandes</p>
          </div>
          {requests.map(req => {
            const { label } = STATUS[req.status] ?? { label: req.status }
            const msgCount = messageCounts[req.id] ?? 0
            const callPending = req.call_requested && !req.proposed_slot

            return (
              <Link
                key={req.id}
                href={`/${params.slug}/custom/${req.id}`}
                className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-[#fafaf8] group"
                style={{ borderBottom: '1px solid #eeeeee' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#27272a' }}>
                    {req.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs font-light" style={{ color: '#a1a1aa' }}>
                      {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                    {msgCount > 0 && (
                      <span className="flex items-center gap-1 text-xs font-light" style={{ color: '#a1a1aa' }}>
                        <MessageSquare size={10} strokeWidth={1.5} />
                        {msgCount}
                      </span>
                    )}
                    {callPending && (
                      <span className="flex items-center gap-1 text-xs font-light" style={{ color: '#a1a1aa' }}>
                        <CalendarClock size={10} strokeWidth={1.5} />
                        Call demandé
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a1a1aa' }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Nouvelle demande — cachée derrière un + si demandes existantes */}
      <NewRequestToggle slug={params.slug} hasExisting={requests.length > 0} />
    </div>
  )
}
