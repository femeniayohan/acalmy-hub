'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const BUDGET_OPTIONS = [
  { value: 'lt500', label: 'Moins de 500€' },
  { value: '500_1500', label: '500€ – 1 500€' },
  { value: '1500_3000', label: '1 500€ – 3 000€' },
  { value: 'gt3000', label: 'Plus de 3 000€' },
  { value: 'unknown', label: 'Je ne sais pas encore' },
]

interface Props {
  requestId: string
  description: string
  tools: string
  budget: string
}

export function EditRequestForm({ requestId, description: init_desc, tools: init_tools, budget: init_budget }: Props) {
  const [description, setDescription] = useState(init_desc)
  const [tools, setTools] = useState(init_tools)
  const [budget, setBudget] = useState(init_budget)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isDirty = description !== init_desc || tools !== init_tools || budget !== init_budget

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/custom-request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, tools, budget }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erreur')
        return
      }
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">Besoin décrit</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          required
          className="input-base resize-none leading-relaxed text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">Outils impliqués</label>
        <input
          type="text"
          value={tools}
          onChange={e => setTools(e.target.value)}
          placeholder="HubSpot, Notion, Slack…"
          className="input-base text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">Budget estimé</label>
        <select
          value={budget}
          onChange={e => setBudget(e.target.value)}
          className={cn('input-base appearance-none cursor-pointer text-sm', !budget && 'text-[rgba(0,0,0,0.35)]')}
        >
          <option value="" disabled>Sélectionner</option>
          {BUDGET_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !isDirty}
          className="btn-primary text-sm"
        >
          {isPending ? <Loader2 size={13} className="animate-spin" /> : 'Enregistrer'}
        </button>
        {saved && !isPending && <span className="text-xs text-emerald-600 font-medium">Modifications enregistrées</span>}
      </div>
    </form>
  )
}
