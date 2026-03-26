'use client'

import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const BUDGET_OPTIONS = [
  { value: 'lt500', label: 'Moins de 500€' },
  { value: '500_1500', label: '500€ – 1 500€' },
  { value: '1500_3000', label: '1 500€ – 3 000€' },
  { value: 'gt3000', label: 'Plus de 3 000€' },
  { value: 'unknown', label: 'Je ne sais pas encore' },
]

interface CustomRequestFormProps {
  slug: string
}

export function CustomRequestForm({ slug }: CustomRequestFormProps) {
  const [description, setDescription] = useState('')
  const [tools, setTools] = useState('')
  const [budget, setBudget] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/custom-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, tools, budget, slug }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Impossible d\'envoyer la demande')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-8 gap-3">
        <CheckCircle size={36} className="text-[#16a34a]" />
        <div>
          <h3 className="text-base font-semibold text-[#0a0a0a] mb-1">
            Demande envoyée !
          </h3>
          <p className="text-sm text-[rgba(0,0,0,0.5)]">
            Notre équipe vous recontacte sous 24h ouvrées pour discuter de votre projet.
          </p>
        </div>
        <button
          onClick={() => {
            setSubmitted(false)
            setDescription('')
            setTools('')
            setBudget('')
          }}
          className="btn-secondary text-sm mt-2"
        >
          Nouvelle demande
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-xs font-semibold text-[#0a0a0a] mb-1.5"
        >
          Décrivez votre besoin <span className="text-[#dc2626]">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Ex: Je veux automatiser la qualification de mes leads entrants depuis mon formulaire Typeform vers HubSpot, avec un email de bienvenue personnalisé…"
          rows={5}
          required
          className="input-base resize-none leading-relaxed"
        />
        <p className="text-[11px] text-[rgba(0,0,0,0.35)] mt-1">
          Plus vous êtes précis, plus nous pouvons vous faire une proposition adaptée.
        </p>
      </div>

      {/* Tools */}
      <div>
        <label
          htmlFor="tools"
          className="block text-xs font-semibold text-[#0a0a0a] mb-1.5"
        >
          Outils impliqués
        </label>
        <input
          id="tools"
          type="text"
          value={tools}
          onChange={e => setTools(e.target.value)}
          placeholder="HubSpot, Notion, Slack, Google Sheets…"
          className="input-base"
        />
        <p className="text-[11px] text-[rgba(0,0,0,0.35)] mt-1">
          Les logiciels que vous utilisez et que vous souhaitez connecter.
        </p>
      </div>

      {/* Budget */}
      <div>
        <label
          htmlFor="budget"
          className="block text-xs font-semibold text-[#0a0a0a] mb-1.5"
        >
          Budget estimé
        </label>
        <select
          id="budget"
          value={budget}
          onChange={e => setBudget(e.target.value)}
          className={cn(
            'input-base appearance-none cursor-pointer',
            !budget && 'text-[rgba(0,0,0,0.35)]'
          )}
        >
          <option value="" disabled>Sélectionner une fourchette</option>
          {BUDGET_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-xs text-[#dc2626] bg-[#fee2e2] px-3 py-2 rounded-[8px]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !description.trim()}
        className="btn-primary w-full justify-center"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Envoi en cours…
          </>
        ) : (
          'Envoyer ma demande'
        )}
      </button>
    </form>
  )
}
