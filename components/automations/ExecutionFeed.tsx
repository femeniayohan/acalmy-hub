'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { StatusDot } from '@/components/ui/StatusDot'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, formatTime, formatDuration } from '@/lib/utils'
import type { Execution } from '@/lib/supabase/types'

function humanizeError(errorMessage: string | null): string {
  if (!errorMessage) return 'Erreur inattendue'
  const msg = errorMessage.toLowerCase()
  if (msg.includes('hubspot')) return 'Connexion HubSpot échouée'
  if (msg.includes('notion')) return 'Connexion Notion échouée'
  if (msg.includes('slack')) return 'Envoi Slack échoué'
  if (msg.includes('google') || msg.includes('sheets')) return 'Connexion Google Sheets échouée'
  if (msg.includes('airtable')) return 'Connexion Airtable échouée'
  if (msg.includes('timeout') || msg.includes('timed out')) return 'Délai d\'attente dépassé'
  if (msg.includes('rate limit') || msg.includes('429')) return 'Limite d\'appels atteinte — réessai automatique'
  if (msg.includes('auth') || msg.includes('401') || msg.includes('403')) return 'Problème d\'authentification — vérifiez votre configuration'
  if (msg.includes('404') || msg.includes('not found')) return 'Ressource introuvable'
  if (msg.includes('network') || msg.includes('econnrefused')) return 'Problème réseau temporaire'
  return 'Erreur inattendue · Contactez Acalmy si le problème persiste'
}

interface ExecutionFeedProps {
  executions: Pick<Execution, 'id' | 'status' | 'ran_at' | 'duration_ms' | 'error_message'>[]
  showSummary?: boolean
}

export function ExecutionFeed({ executions, showSummary = true }: ExecutionFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (executions.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center">
          <Clock size={18} className="text-[rgba(0,0,0,0.25)]" />
        </div>
        <p className="text-sm text-[rgba(0,0,0,0.35)]">Aucune exécution pour le moment</p>
      </div>
    )
  }

  const successCount = executions.filter(e => e.status === 'success').length
  const errorCount = executions.filter(e => e.status === 'error').length
  const successRate = Math.round((successCount / executions.length) * 100)
  const avgDuration = executions.filter(e => e.duration_ms).reduce((acc, e) => acc + (e.duration_ms ?? 0), 0) / (executions.filter(e => e.duration_ms).length || 1)

  return (
    <div>
      {/* Résumé */}
      {showSummary && executions.length > 1 && (
        <div className="grid grid-cols-3 gap-px border-b border-[rgba(0,0,0,0.06)] bg-[rgba(0,0,0,0.04)]">
          {[
            { label: 'Taux de succès', value: `${successRate}%`, color: successRate >= 90 ? 'text-[#16a34a]' : successRate >= 70 ? 'text-[#d97706]' : 'text-[#dc2626]' },
            { label: 'Succès / Erreurs', value: `${successCount} / ${errorCount}`, color: 'text-[#0a0a0a]' },
            { label: 'Durée moyenne', value: avgDuration > 0 ? formatDuration(Math.round(avgDuration)) : '—', color: 'text-[#0a0a0a]' },
          ].map(stat => (
            <div key={stat.label} className="bg-white px-4 py-3 text-center">
              <p className={`text-sm font-semibold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-[rgba(0,0,0,0.4)] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Liste */}
      <div className="divide-y divide-[rgba(0,0,0,0.05)]">
        {executions.map((exec) => {
          const isExpanded = expandedId === exec.id
          const hasError = exec.status === 'error' && exec.error_message

          return (
            <div key={exec.id}>
              <div
                className={`flex items-center gap-3 px-4 py-3 ${hasError ? 'cursor-pointer hover:bg-[rgba(220,38,38,0.02)]' : ''}`}
                onClick={() => hasError && setExpandedId(isExpanded ? null : exec.id)}
              >
                <StatusDot
                  status={exec.status === 'success' ? 'active' : 'error'}
                  className="shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={exec.status} />
                    {exec.status === 'error' && exec.error_message && (
                      <p className="text-xs text-[#dc2626] truncate">
                        {humanizeError(exec.error_message)}
                      </p>
                    )}
                    {exec.status === 'success' && (
                      <p className="text-xs text-[rgba(0,0,0,0.4)]">Exécution réussie</p>
                    )}
                  </div>
                  <p className="text-[11px] text-[rgba(0,0,0,0.35)] mt-0.5">
                    {formatDate(exec.ran_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {formatTime(exec.ran_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {exec.duration_ms != null && (
                    <span className="text-xs text-[rgba(0,0,0,0.35)] font-mono">
                      {formatDuration(exec.duration_ms)}
                    </span>
                  )}
                  {hasError && (
                    <span className="text-[rgba(0,0,0,0.3)]">
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </span>
                  )}
                </div>
              </div>

              {/* Détail erreur technique */}
              {isExpanded && hasError && (
                <div className="mx-4 mb-3 bg-[#fef2f2] border border-[#fecaca] rounded-[8px] p-3">
                  <p className="text-[11px] font-semibold text-[#991b1b] mb-1 uppercase tracking-wide">
                    Détail technique
                  </p>
                  <p className="text-xs text-[#7f1d1d] font-mono leading-relaxed break-all">
                    {exec.error_message}
                  </p>
                  <p className="text-[11px] text-[#b91c1c] mt-2">
                    Notre équipe a été notifiée automatiquement.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
