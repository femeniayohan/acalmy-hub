'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'pending',     label: 'En attente',  className: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'in_progress', label: 'En cours',    className: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'delivered',   label: 'Livré',       className: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
]

interface Props {
  requestId: string
  currentStatus: string
}

export function RequestStatusForm({ requestId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  async function handleChange(newStatus: string) {
    setStatus(newStatus)
    setSaved(false)
    startTransition(async () => {
      await fetch(`/api/admin/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          disabled={isPending}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
            status === opt.value
              ? opt.className
              : 'border-[rgba(0,0,0,0.1)] bg-transparent text-[rgba(0,0,0,0.4)] hover:border-[rgba(0,0,0,0.2)] hover:text-[rgba(0,0,0,0.6)]'
          )}
        >
          {opt.label}
        </button>
      ))}
      {isPending && <Loader2 size={13} className="animate-spin text-[rgba(0,0,0,0.3)]" />}
      {saved && !isPending && (
        <span className="text-xs text-emerald-600 font-medium">Enregistré</span>
      )}
    </div>
  )
}
