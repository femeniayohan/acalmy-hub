'use client'

import { useState } from 'react'
import { Loader2, Check, Server } from 'lucide-react'

interface N8nProvisioningFormProps {
  tenantId: string
  currentUrl: string | null
  hasApiKey: boolean
}

export function N8nProvisioningForm({ tenantId, currentUrl, hasApiKey }: N8nProvisioningFormProps) {
  const [url, setUrl] = useState(currentUrl ?? '')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/n8n`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ n8n_url: url, n8n_api_key: apiKey || undefined }),
      })

      if (!res.ok) throw new Error('Erreur lors de la mise à jour')
      setSaved(true)
      setApiKey('')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card mb-4">
      <div className="p-4 border-b border-[rgba(0,0,0,0.06)] flex items-center gap-2">
        <Server size={14} className="text-[rgba(0,0,0,0.4)]" />
        <h2 className="text-sm font-semibold text-[#0a0a0a]">Instance n8n</h2>
        {hasApiKey && (
          <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#16a34a]">
            Configurée
          </span>
        )}
        {!hasApiKey && (
          <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#fef9c3] text-[#854d0e]">
            Non configurée
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">URL n8n</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://n8n.client.acalmy.com"
            className="input-base text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[rgba(0,0,0,0.5)] mb-1">
            Clé API n8n {hasApiKey && <span className="text-[rgba(0,0,0,0.35)]">(laisser vide pour conserver)</span>}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={hasApiKey ? '••••••••••••••••' : 'eyJhbGci...'}
            className="input-base text-sm font-mono"
          />
        </div>
        {error && <p className="text-xs text-[#dc2626]">{error}</p>}
        <button
          onClick={handleSave}
          disabled={loading || !url.trim()}
          className="btn-primary text-sm gap-2"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saved ? 'Enregistré' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
