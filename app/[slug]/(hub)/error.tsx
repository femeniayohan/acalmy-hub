'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function HubError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Hub error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-10 h-10 rounded-full bg-[#fee2e2] flex items-center justify-center mb-3">
        <AlertTriangle size={18} className="text-[#dc2626]" />
      </div>
      <h2 className="text-sm font-semibold text-[#0a0a0a] mb-1">
        Une erreur est survenue
      </h2>
      <p className="text-xs text-[rgba(0,0,0,0.4)] mb-4 max-w-xs">
        Impossible de charger cette page. Notre équipe a été notifiée.
      </p>
      <button onClick={reset} className="btn-secondary text-sm">
        Réessayer
      </button>
    </div>
  )
}
