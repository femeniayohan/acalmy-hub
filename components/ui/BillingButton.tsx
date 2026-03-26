'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

interface BillingButtonProps {
  slug: string
  className?: string
}

export function BillingButton({ slug, className }: BillingButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/${slug}/dashboard`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className ?? 'flex items-center gap-2 text-xs text-[rgba(0,0,0,0.45)] hover:text-[#0a0a0a] transition-colors w-full px-3 py-[7px] rounded-[8px] hover:bg-[rgba(0,0,0,0.03)]'}
      >
        {loading
          ? <Loader2 size={14} className="animate-spin shrink-0" />
          : <CreditCard size={14} className="shrink-0" />
        }
        Facturation
      </button>
      {error && (
        <p className="text-[11px] text-[#dc2626] px-3 mt-1">{error}</p>
      )}
    </div>
  )
}
