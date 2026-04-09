'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CalendarClock, PhoneCall, CheckCircle, XCircle } from 'lucide-react'

interface Props {
  requestId: string
  callRequested: boolean
  proposedSlot: string | null
  slotStatus: string | null
}

export function AdminCallControls({ requestId, callRequested, proposedSlot, slotStatus }: Props) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)
  const router = useRouter()

  async function patch(body: Record<string, unknown>) {
    setFeedback(null)
    startTransition(async () => {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setFeedback(d.error ?? 'Erreur')
      } else {
        router.refresh()
      }
    })
  }

  // Pas encore de call demandé
  if (!callRequested) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => patch({ call_requested: true })}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-sm font-medium bg-[#1a1208] text-white hover:bg-[#2d1f0e] transition-colors disabled:opacity-50"
        >
          {isPending
            ? <Loader2 size={13} className="animate-spin" />
            : <PhoneCall size={13} />}
          Demander un call
        </button>
        <p className="text-xs text-[rgba(0,0,0,0.35)]">Le client sera notifié pour choisir un créneau</p>
      </div>
    )
  }

  // Call demandé, en attente du créneau client
  if (callRequested && !proposedSlot) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-700">
          <CalendarClock size={14} />
          <span className="font-medium">En attente du créneau client</span>
        </div>
        <button
          onClick={() => patch({ call_requested: false })}
          disabled={isPending}
          className="text-xs text-[rgba(0,0,0,0.35)] underline underline-offset-2 hover:no-underline"
        >
          Annuler
        </button>
      </div>
    )
  }

  // Créneau proposé par le client
  if (proposedSlot && slotStatus === 'pending') {
    const slotDate = new Date(proposedSlot).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    })
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 p-3 rounded-[10px] bg-blue-50 border border-blue-200">
          <CalendarClock size={14} className="text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800">
            <span className="font-medium">Créneau proposé : </span>{slotDate}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => patch({ slot_status: 'confirmed' })}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={13} />}
            Confirmer
          </button>
          <button
            onClick={() => patch({ slot_status: 'declined' })}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium border border-[rgba(0,0,0,0.12)] text-[rgba(0,0,0,0.6)] hover:bg-[rgba(0,0,0,0.04)] transition-colors disabled:opacity-50"
          >
            <XCircle size={13} />
            Décliner
          </button>
        </div>
        {feedback && <p className="text-xs text-[#dc2626]">{feedback}</p>}
      </div>
    )
  }

  // Confirmé
  if (slotStatus === 'confirmed' && proposedSlot) {
    const slotDate = new Date(proposedSlot).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    })
    return (
      <div className="flex items-center gap-2 p-3 rounded-[10px] bg-emerald-50 border border-emerald-200">
        <CheckCircle size={14} className="text-emerald-600 shrink-0" />
        <p className="text-sm text-emerald-800">
          <span className="font-medium">Call confirmé : </span>{slotDate}
        </p>
      </div>
    )
  }

  // Décliné
  if (slotStatus === 'declined') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.08)]">
        <XCircle size={14} className="text-[rgba(0,0,0,0.35)] shrink-0" />
        <p className="text-sm text-[rgba(0,0,0,0.5)]">Créneau décliné — en attente d&apos;une nouvelle proposition</p>
      </div>
    )
  }

  return null
}
