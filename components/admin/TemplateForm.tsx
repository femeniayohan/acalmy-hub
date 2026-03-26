'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { MarketplaceTemplate } from '@/lib/supabase/types'

const CATEGORIES = [
  { value: 'crm', label: 'CRM' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'ia', label: 'IA & Agents' },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'password', label: 'Mot de passe / Clé API' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL / Webhook' },
]

interface ConfigField {
  key: string
  label: string
  type: string
  required: boolean
  placeholder: string
  hint: string
}

interface TemplateFormProps {
  template?: MarketplaceTemplate
  mode: 'create' | 'edit'
}

export function TemplateForm({ template, mode }: TemplateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [category, setCategory] = useState<'crm' | 'marketing' | 'reporting' | 'ia'>(template?.category ?? 'crm')
  const [iconName, setIconName] = useState(template?.icon_name ?? 'Zap')
  const [priceMonthly, setPriceMonthly] = useState(
    template?.price_monthly ? String(template.price_monthly / 100) : ''
  )
  const [stripePriceId, setStripePriceId] = useState(template?.stripe_price_id ?? '')
  const [n8nTemplateId, setN8nTemplateId] = useState(template?.n8n_template_id ?? '')
  const [isActive, setIsActive] = useState(template?.is_active ?? true)
  const [fields, setFields] = useState<ConfigField[]>(
    (template?.config_schema?.fields ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      placeholder: f.placeholder ?? '',
      hint: f.hint ?? '',
    }))
  )

  function addField() {
    setFields(prev => [...prev, { key: '', label: '', type: 'text', required: true, placeholder: '', hint: '' }])
  }

  function removeField(idx: number) {
    setFields(prev => prev.filter((_, i) => i !== idx))
  }

  function updateField(idx: number, key: keyof ConfigField, value: string | boolean) {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const priceCents = Math.round(parseFloat(priceMonthly) * 100)
    if (isNaN(priceCents) || priceCents <= 0) {
      setError('Prix invalide')
      setLoading(false)
      return
    }

    const payload = {
      ...(mode === 'edit' && { id: template?.id }),
      name,
      description,
      category,
      icon_name: iconName,
      price_monthly: priceCents,
      stripe_price_id: stripePriceId || null,
      n8n_template_id: n8nTemplateId || null,
      config_schema: { fields },
      is_active: isActive,
    }

    try {
      const res = await fetch('/api/admin/templates', {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')

      router.push('/admin/templates')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-[rgba(0,0,0,0.12)] rounded-[8px] px-3 py-2 text-sm text-[#0a0a0a] bg-white placeholder:text-[rgba(0,0,0,0.3)] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[rgba(0,0,0,0.3)]'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-[680px]">

      {/* Infos principales */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#0a0a0a]">Informations</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Nom du template *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Sync HubSpot → Notion" required className={inputCls} />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Description visible par le client…" className={inputCls + ' resize-none'} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Catégorie *</label>
            <select value={category} onChange={e => setCategory(e.target.value as 'crm' | 'marketing' | 'reporting' | 'ia')} className={inputCls}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">
              Icône Lucide
              <a href="https://lucide.dev/icons/" target="_blank" rel="noreferrer" className="ml-1 text-[rgba(0,0,0,0.3)] hover:text-[#0a0a0a]">↗</a>
            </label>
            <input value={iconName} onChange={e => setIconName(e.target.value)} placeholder="Zap" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Prix mensuel (€) *</label>
            <input type="number" step="0.01" min="0" value={priceMonthly} onChange={e => setPriceMonthly(e.target.value)} placeholder="49" required className={inputCls} />
          </div>

          <div className="flex items-center gap-3 pt-5">
            <input type="checkbox" id="is_active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded" />
            <label htmlFor="is_active" className="text-sm text-[#0a0a0a]">Visible dans le marketplace</label>
          </div>
        </div>
      </div>

      {/* Intégrations */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#0a0a0a]">Intégrations</h2>

        <div>
          <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Stripe Price ID</label>
          <input value={stripePriceId} onChange={e => setStripePriceId(e.target.value)} placeholder="price_xxx" className={inputCls + ' font-mono text-xs'} />
          <p className="text-[11px] text-[rgba(0,0,0,0.35)] mt-1">Récupérer dans Stripe Dashboard → Products → Prices</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">ID Workflow n8n (template)</label>
          <input value={n8nTemplateId} onChange={e => setN8nTemplateId(e.target.value)} placeholder="workflow-id" className={inputCls + ' font-mono text-xs'} />
          <p className="text-[11px] text-[rgba(0,0,0,0.35)] mt-1">ID visible dans l'URL n8n : /workflow/ABC123</p>
        </div>
      </div>

      {/* Champs de configuration */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0a0a0a]">Champs de configuration</h2>
            <p className="text-xs text-[rgba(0,0,0,0.4)] mt-0.5">Informations demandées au client lors de l'activation</p>
          </div>
          <button type="button" onClick={addField} className="btn-secondary text-xs gap-1.5">
            <Plus size={12} />
            Ajouter un champ
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-[rgba(0,0,0,0.35)] text-center py-4">
            Aucun champ — le client n'aura rien à configurer.
          </p>
        ) : (
          <div className="space-y-4">
            {fields.map((field, idx) => (
              <div key={idx} className="border border-[rgba(0,0,0,0.08)] rounded-[10px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[rgba(0,0,0,0.4)]">Champ {idx + 1}</span>
                  <button type="button" onClick={() => removeField(idx)} className="text-[rgba(0,0,0,0.3)] hover:text-[#dc2626] transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Clé (code)</label>
                    <input value={field.key} onChange={e => updateField(idx, 'key', e.target.value)} placeholder="api_key" className={inputCls + ' font-mono text-xs'} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Label affiché</label>
                    <input value={field.label} onChange={e => updateField(idx, 'label', e.target.value)} placeholder="Clé API" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Type</label>
                    <select value={field.type} onChange={e => updateField(idx, 'type', e.target.value)} className={inputCls}>
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Placeholder</label>
                    <input value={field.placeholder} onChange={e => updateField(idx, 'placeholder', e.target.value)} placeholder="sk-..." className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">Aide (hint)</label>
                    <input value={field.hint} onChange={e => updateField(idx, 'hint', e.target.value)} placeholder="Où trouver cette information…" className={inputCls} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={`required_${idx}`} checked={field.required} onChange={e => updateField(idx, 'required', e.target.checked)} className="w-4 h-4 rounded" />
                    <label htmlFor={`required_${idx}`} className="text-xs text-[#0a0a0a]">Champ obligatoire</label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-[#fee2e2] border border-[#fecaca] rounded-[8px] px-4 py-3">
          <p className="text-sm text-[#dc2626]">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading} className="btn-primary gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {mode === 'create' ? 'Créer le template' : 'Enregistrer les modifications'}
        </button>
        <button type="button" onClick={() => router.push('/admin/templates')} className="btn-secondary">
          Annuler
        </button>
      </div>
    </form>
  )
}
