'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function OnboardingForm() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40)
  }

  function handleCompanyChange(value: string) {
    setCompanyName(value)
    if (!slugEdited) setSlug(generateSlug(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, slug }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Erreur inattendue')
      }

      router.push(`/${data.slug}/dashboard`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#0a0a0a] mb-0.5">
          Créez votre espace
        </h2>
        <p className="text-xs text-[rgba(0,0,0,0.4)]">
          Votre hub sera accessible à l'adresse indiquée ci-dessous.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
          Nom de votre entreprise <span className="text-[#dc2626]">*</span>
        </label>
        <input
          type="text"
          value={companyName}
          onChange={e => handleCompanyChange(e.target.value)}
          placeholder="Acme SAS"
          required
          className="input-base"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
          Identifiant de l'espace <span className="text-[#dc2626]">*</span>
        </label>
        <div className="flex items-center border border-[rgba(0,0,0,0.12)] rounded-[8px] overflow-hidden focus-within:border-[rgba(0,0,0,0.3)] transition-colors bg-white">
          <span className="px-3 py-2 text-sm text-[rgba(0,0,0,0.35)] bg-[#f5f4f0] border-r border-[rgba(0,0,0,0.08)] shrink-0 select-none">
            app.acalmy.com/
          </span>
          <input
            type="text"
            value={slug}
            onChange={e => {
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              setSlugEdited(true)
            }}
            placeholder="acme-sas"
            required
            pattern="[a-z0-9-]+"
            minLength={3}
            className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
          />
        </div>
        <p className="text-[11px] text-[rgba(0,0,0,0.35)] mt-1">
          Uniquement lettres minuscules, chiffres et tirets.
        </p>
      </div>

      {error && (
        <p className="text-xs text-[#dc2626] bg-[#fee2e2] px-3 py-2 rounded-[8px]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading || !companyName.trim() || !slug.trim()}
        className="btn-primary w-full justify-center"
      >
        {isLoading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Création en cours…
          </>
        ) : (
          'Créer mon espace →'
        )}
      </button>
    </form>
  )
}
