'use client'

import { useState } from 'react'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import type { MarketplaceTemplate, ConfigSchemaField } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface ConfigFormProps {
  template: MarketplaceTemplate
  tenantId: string
  onComplete: (automationId: string) => void
}

export function ConfigForm({ template, tenantId, onComplete }: ConfigFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fields = template.config_schema.fields

  function toggleVisibility(key: string) {
    setVisibleFields(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate required fields
    const missing = fields
      .filter(f => f.required && !values[f.key]?.trim())
      .map(f => f.label)

    if (missing.length > 0) {
      setError(`Champs requis manquants : ${missing.join(', ')}`)
      return
    }

    setIsSubmitting(true)

    try {
      // Store credentials in Supabase Vault
      const storeRes = await fetch('/api/credentials/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          credentials: values,
        }),
      })

      if (!storeRes.ok) {
        const data = await storeRes.json().catch(() => ({}))
        throw new Error(data.error ?? 'Impossible de sauvegarder la configuration')
      }

      const { automationId } = await storeRes.json()

      // Activate workflow in n8n
      const activateRes = await fetch('/api/automations/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationId }),
      })

      if (!activateRes.ok) {
        const data = await activateRes.json().catch(() => ({}))
        throw new Error(data.error ?? 'Impossible d\'activer l\'automatisation')
      }

      onComplete(automationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-[rgba(0,0,0,0.5)] mb-4">
          Aucune configuration requise. Cliquez sur Activer pour démarrer.
        </p>
        <button
          onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
          Activer
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-[rgba(0,0,0,0.5)] leading-relaxed">
        Ces informations permettent à Acalmy de connecter vos outils.
        Elles sont chiffrées et ne vous seront jamais redemandées.
      </p>

      {fields.map((field: ConfigSchemaField) => (
        <div key={field.key}>
          <label
            htmlFor={field.key}
            className="block text-xs font-semibold text-[#0a0a0a] mb-1"
          >
            {field.label}
            {field.required && (
              <span className="text-[#dc2626] ml-0.5">*</span>
            )}
          </label>

          <div className="relative">
            <input
              id={field.key}
              type={
                field.type === 'password' && !visibleFields.has(field.key)
                  ? 'password'
                  : field.type === 'url'
                  ? 'url'
                  : field.type === 'email'
                  ? 'email'
                  : 'text'
              }
              value={values[field.key] ?? ''}
              onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder ?? ''}
              required={field.required}
              className={cn(
                'input-base pr-9 font-mono text-xs',
                field.type !== 'password' && 'font-sans text-sm'
              )}
              autoComplete="off"
              spellCheck={false}
            />

            {field.type === 'password' && (
              <button
                type="button"
                onClick={() => toggleVisibility(field.key)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgba(0,0,0,0.35)] hover:text-[#0a0a0a] transition-colors"
                aria-label={visibleFields.has(field.key) ? 'Masquer' : 'Afficher'}
              >
                {visibleFields.has(field.key)
                  ? <EyeOff size={14} />
                  : <Eye size={14} />
                }
              </button>
            )}
          </div>

          {field.hint && (
            <p className="text-[11px] text-[rgba(0,0,0,0.4)] mt-1 leading-relaxed">
              {field.hint}
            </p>
          )}
        </div>
      ))}

      {error && (
        <p className="text-xs text-[#dc2626] bg-[#fee2e2] px-3 py-2 rounded-[8px]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full justify-center"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Activation en cours…
          </>
        ) : (
          'Activer'
        )}
      </button>
    </form>
  )
}
