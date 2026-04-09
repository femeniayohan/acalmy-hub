import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { Settings } from 'lucide-react'
import type { Automation } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface AutomationCardProps {
  automation: Automation
  slug: string
  templateId?: string
}

function getSubtitle(automation: Automation): string {
  switch (automation.status) {
    case 'active':
      return automation.last_run_at
        ? `${automation.monthly_runs} exécutions · dernière ${formatRelativeTime(automation.last_run_at)}`
        : `${automation.monthly_runs} exécutions ce mois`
    case 'paused':
      return 'En pause'
    case 'error':
      return automation.last_run_at ? `Erreur ${formatRelativeTime(automation.last_run_at)}` : 'Erreur'
    case 'pending':
      return !automation.credentials_configured ? 'Configuration requise' : 'Activation en cours…'
    default:
      return ''
  }
}

export function AutomationCard({ automation, slug, templateId }: AutomationCardProps) {
  const subtitle = getSubtitle(automation)
  const isInactive = automation.status !== 'active'

  const isActive = automation.status === 'active'

  return (
    <div
      className={cn('flex items-center gap-5 px-6 py-4 group transition-colors', isInactive && 'opacity-40')}
      style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,0,0,0.01)' }}
    >
      {/* Dot statut */}
      <span
        className="shrink-0 w-2 h-2 rounded-full"
        style={{ background: isActive ? '#16a34a' : '#d4d4d8' }}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: '#27272a' }}>
          {automation.name}
        </p>
        {subtitle && (
          <p
            className="text-xs font-light mt-0.5 truncate uppercase tracking-widest"
            style={{ color: isActive ? '#16a34a' : '#a1a1aa' }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions — revealed on hover */}
      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!automation.credentials_configured && automation.status === 'pending' && templateId && (
          <Link
            href={`/${slug}/marketplace?template=${templateId}`}
            className="btn-secondary text-xs px-3 py-1"
          >
            <Settings size={12} strokeWidth={1.5} />
            Configurer
          </Link>
        )}
        <Link
          href={`/${slug}/automations/${automation.id}`}
          className="btn-ghost text-xs px-3 py-1"
        >
          Détails
        </Link>
      </div>
    </div>
  )
}
