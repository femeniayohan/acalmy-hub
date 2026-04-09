'use client'

import { useState, useEffect } from 'react'
import { TemplateCard } from './TemplateCard'
import { TemplatePanel } from './TemplatePanel'
import type { MarketplaceTemplate, AutomationCategory } from '@/lib/supabase/types'
import { translateCategory } from '@/lib/utils'

const CATEGORIES: { value: AutomationCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'crm', label: 'CRM' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'ia', label: 'IA & Agents' },
]

interface MarketplaceClientProps {
  templates: MarketplaceTemplate[]
  subscribedTemplateIds: string[]
  tenantId: string
  slug: string
  postCheckoutTemplateId?: string
}

export function MarketplaceClient({
  templates,
  subscribedTemplateIds,
  tenantId,
  slug,
  postCheckoutTemplateId,
}: MarketplaceClientProps) {
  const [activeCategory, setActiveCategory] = useState<AutomationCategory | 'all'>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null)

  // Auto-open panel after Stripe checkout redirect
  useEffect(() => {
    if (postCheckoutTemplateId) {
      const template = templates.find(t => t.id === postCheckoutTemplateId)
      if (template) setSelectedTemplate(template)
    }
  }, [postCheckoutTemplateId, templates])

  const subscribed = templates.filter(t => subscribedTemplateIds.includes(t.id))
  const available = templates.filter(t => !subscribedTemplateIds.includes(t.id))
  const filteredAvailable = activeCategory === 'all'
    ? available
    : available.filter(t => t.category === activeCategory)

  return (
    <div className="relative space-y-8">

      {/* Abonnements actifs */}
      {subscribed.length > 0 && (
        <section>
          <h2 className="text-xs font-medium text-[rgba(0,0,0,0.35)] uppercase tracking-wider mb-3">
            Mes abonnements · {subscribed.length}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {subscribed.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isSubscribed={true}
                onSelect={() => setSelectedTemplate(template)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Catalogue disponible */}
      <section>
        {subscribed.length > 0 && (
          <h2 className="text-xs font-medium text-[rgba(0,0,0,0.35)] uppercase tracking-wider mb-3">
            Catalogue
          </h2>
        )}

        {/* Category filters */}
        <div className="flex gap-1.5 mb-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[9999px] transition-colors ${
                activeCategory === cat.value
                  ? 'bg-[#0a0a0a] text-white'
                  : 'bg-white border border-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.5)] hover:text-[#0a0a0a] hover:border-[rgba(0,0,0,0.15)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {filteredAvailable.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-[rgba(0,0,0,0.35)]">
              {available.length === 0
                ? 'Vous êtes abonné à tous les templates disponibles.'
                : 'Aucun template dans cette catégorie.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredAvailable.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isSubscribed={false}
                onSelect={() => setSelectedTemplate(template)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Side panel */}
      {selectedTemplate && (
        <TemplatePanel
          template={selectedTemplate}
          isSubscribed={
            subscribedTemplateIds.includes(selectedTemplate.id) ||
            selectedTemplate.id === postCheckoutTemplateId
          }
          tenantId={tenantId}
          slug={slug}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  )
}
