'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Check, Loader2, ExternalLink } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { Stepper } from '@/components/ui/Stepper'
import { ConfigForm } from './ConfigForm'
import { formatEur, translateCategory } from '@/lib/utils'
import type { MarketplaceTemplate } from '@/lib/supabase/types'

const STEPS = [
  { id: 1, label: 'Souscription' },
  { id: 2, label: 'Configuration' },
  { id: 3, label: 'Activation' },
]

const categoryColors: Record<string, { bg: string; icon: string }> = {
  crm: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  marketing: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  reporting: { bg: 'bg-orange-50', icon: 'text-orange-600' },
  ia: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
}

interface TemplatePanelProps {
  template: MarketplaceTemplate
  isSubscribed: boolean
  tenantId: string
  slug: string
  onClose: () => void
}

export function TemplatePanel({
  template,
  isSubscribed,
  tenantId,
  slug,
  onClose,
}: TemplatePanelProps) {
  const [step, setStep] = useState<1 | 2 | 3>(isSubscribed ? 2 : 1)
  const [automationId, setAutomationId] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Trap focus & prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => { document.body.style.overflow = '' }
  }, [])

  const colors = categoryColors[template.category] ?? { bg: 'bg-gray-50', icon: 'text-gray-600' }
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[template.icon_name]
    ?? LucideIcons.Zap

  async function handleSubscribe() {
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/marketplace/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          priceId: template.stripe_price_id,
          successUrl: `${window.location.origin}/${slug}/marketplace?session_id={CHECKOUT_SESSION_ID}&template=${template.id}`,
          cancelUrl: window.location.href,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Impossible de démarrer le paiement')
      }

      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Erreur inattendue')
      setCheckoutLoading(false)
    }
  }

  function handleConfigComplete(newAutomationId: string) {
    setAutomationId(newAutomationId)
    setStep(3)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={template.name}
        tabIndex={-1}
        className="fixed right-0 top-0 h-full w-full max-w-[440px] bg-white border-l border-[rgba(0,0,0,0.08)]
          shadow-2xl z-50 flex flex-col overflow-hidden
          animate-in slide-in-from-right duration-200"
      >
        {/* Panel header */}
        <div className="flex items-start gap-3 p-5 border-b border-[rgba(0,0,0,0.06)]">
          <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 ${colors.bg}`}>
            <IconComponent size={16} className={colors.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-[#0a0a0a] leading-tight">
              {template.name}
            </h2>
            <p className="text-xs text-[rgba(0,0,0,0.4)] mt-0.5">
              {translateCategory(template.category)} · {formatEur(template.price_monthly)}/mois
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 -mr-1 -mt-1"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stepper */}
        {!isSubscribed && (
          <div className="px-5 pt-4 pb-3 border-b border-[rgba(0,0,0,0.06)]">
            <Stepper steps={STEPS} currentStep={step} />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {/* Step 1 — Subscription detail */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[rgba(0,0,0,0.6)] leading-relaxed">
                {template.description}
              </p>

              {/* Prerequisites */}
              {template.config_schema.fields.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[#0a0a0a] uppercase tracking-wide mb-2">
                    Ce qu'il faut préparer
                  </h3>
                  <ul className="space-y-1.5">
                    {template.config_schema.fields.map(field => (
                      <li key={field.key} className="flex items-start gap-2 text-xs text-[rgba(0,0,0,0.5)]">
                        <span className="w-1 h-1 rounded-full bg-[rgba(0,0,0,0.3)] mt-1.5 shrink-0" />
                        {field.label}
                        {field.hint && (
                          <span className="text-[rgba(0,0,0,0.35)]"> — {field.hint}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pricing summary */}
              <div className="card bg-[#f5f4f0] border-0 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#0a0a0a]">{template.name}</span>
                  <span className="text-sm font-semibold text-[#0a0a0a]">
                    {formatEur(template.price_monthly)}/mois
                  </span>
                </div>
                <p className="text-xs text-[rgba(0,0,0,0.4)] mt-1">
                  Abonnement mensuel · Résiliable à tout moment
                </p>
              </div>

              {checkoutError && (
                <p className="text-xs text-[#dc2626]">{checkoutError}</p>
              )}

              <button
                onClick={handleSubscribe}
                disabled={checkoutLoading}
                className="btn-primary w-full justify-center"
              >
                {checkoutLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Souscrire · {formatEur(template.price_monthly)}/mois
              </button>

              <p className="text-[11px] text-center text-[rgba(0,0,0,0.3)]">
                Paiement sécurisé via Stripe · Aucune période d'engagement
              </p>
            </div>
          )}

          {/* Step 2 — Configuration */}
          {step === 2 && (
            <ConfigForm
              template={template}
              tenantId={tenantId}
              onComplete={handleConfigComplete}
            />
          )}

          {/* Step 3 — Confirmation */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-12 h-12 rounded-full bg-[#dcfce7] flex items-center justify-center">
                <Check size={22} className="text-[#16a34a]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#0a0a0a] mb-1">
                  Automatisation activée !
                </h3>
                <p className="text-sm text-[rgba(0,0,0,0.5)]">
                  Votre automatisation est maintenant en ligne. Vous pouvez suivre son activité
                  depuis votre tableau de bord.
                </p>
              </div>
              <a
                href={`/${slug}/automations${automationId ? `/${automationId}` : ''}`}
                className="btn-primary gap-2"
              >
                Voir dans mes automatisations
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
