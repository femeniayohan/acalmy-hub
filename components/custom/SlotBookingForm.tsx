'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CalendarClock, CheckCircle } from 'lucide-react'

interface Props {
  requestId: string
  callRequested: boolean
  currentSlot: string | null
  slotStatus: string | null
}

export function SlotBookingForm({ requestId, callRequested, currentSlot, slotStatus }: Props) {
  const [slot, setSlot] = useState(currentSlot ? currentSlot.slice(0, 16) : '')
  const [showModify, setShowModify] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!slot) return
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/custom-request/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposed_slot: new Date(slot).toISOString() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Erreur lors de l\'envoi')
        return
      }
      setSaved(true)
      setShowModify(false)
      router.refresh()
    })
  }

  // Call confirmé
  if (slotStatus === 'confirmed' && currentSlot) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-[10px] bg-emerald-50 border border-emerald-200">
        <CheckCircle size={15} className="text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Call confirmé</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            {new Date(currentSlot).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    )
  }

  // Créneau en attente de confirmation admin
  if (currentSlot && slotStatus === 'pending' && !showModify) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 p-3 rounded-[10px] bg-amber-50 border border-amber-200">
          <CalendarClock size={15} className="text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">Créneau proposé — en attente de confirmation</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {new Date(currentSlot).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowModify(true); setSlot('') }}
          className="text-xs text-[rgba(0,0,0,0.4)] underline underline-offset-2 hover:no-underline self-start"
        >
          Modifier le créneau
        </button>
      </div>
    )
  }

  // Créneau décliné OU pas encore de slot
  if (!callRequested && !currentSlot) return null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {slotStatus === 'declined' && (
        <p className="text-sm text-[rgba(0,0,0,0.5)] italic">
          Ce créneau n&apos;était pas disponible. Proposez-en un autre.
        </p>
      )}
      {!currentSlot && callRequested && (
        <p className="text-sm text-[rgba(0,0,0,0.6)]">
          L&apos;équipe Acalmy souhaite vous appeler pour en savoir plus. Choisissez un créneau qui vous convient.
        </p>
      )}
      <div className="flex gap-2 items-center">
        <input
          type="datetime-local"
          value={slot}
          onChange={e => setSlot(e.target.value)}
          required
          min={new Date().toISOString().slice(0, 16)}
          className="input-base flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={isPending || !slot}
          className="btn-primary shrink-0"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : 'Envoyer →'}
        </button>
      </div>
      {saved && <p className="text-xs text-emerald-600 font-medium">Créneau envoyé !</p>}
      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
    </form>
  )
}
