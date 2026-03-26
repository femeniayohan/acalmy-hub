'use client'

import { useState, useTransition } from 'react'
import { Pause, Play, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { AutomationStatus } from '@/lib/supabase/types'

interface AutomationActionsProps {
  automationId: string
  tenantId: string
  currentStatus: AutomationStatus
  n8nWorkflowId: string | null
}

export function AutomationActions({
  automationId,
  tenantId,
  currentStatus,
  n8nWorkflowId,
}: AutomationActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (currentStatus === 'pending' || !n8nWorkflowId) return null

  const isActive = currentStatus === 'active'

  async function handleToggle() {
    setError(null)
    try {
      const res = await fetch('/api/automations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationId,
          action: isActive ? 'pause' : 'resume',
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Erreur inattendue')
      }

      startTransition(() => router.refresh())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleToggle}
        disabled={isPending}
        className="btn-secondary text-sm gap-2"
        title={isActive ? 'Mettre en pause' : 'Reprendre'}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isActive ? (
          <Pause size={14} />
        ) : (
          <Play size={14} />
        )}
        {isActive ? 'Mettre en pause' : 'Reprendre'}
      </button>
      {error && (
        <p className="text-xs text-[#dc2626]">{error}</p>
      )}
    </div>
  )
}
