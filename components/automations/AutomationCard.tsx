import Link from 'next/link'
import { StatusDot } from '@/components/ui/StatusDot'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatRelativeTime } from '@/lib/utils'
import { Settings, ChevronRight } from 'lucide-react'
import type { Automation } from '@/lib/supabase/types'

interface AutomationCardProps {
  automation: Automation
  slug: string
  templateId?: string
}

function getSubtitle(automation: Automation): string {
  switch (automation.status) {
    case 'active':
      if (automation.last_run_at) {
        return `${automation.monthly_runs} exécutions ce mois · Dernière ${formatRelativeTime(automation.last_run_at)}`
      }
      return `${automation.monthly_runs} exécutions ce mois`

    case 'paused':
      return 'En pause · Contactez Acalmy pour reprendre'

    case 'error':
      if (automation.last_run_at) {
        return `Dernière erreur ${formatRelativeTime(automation.last_run_at)}`
      }
      return 'Une erreur est survenue · Contactez Acalmy'

    case 'pending':
      if (!automation.credentials_configured) {
        return 'Configuration requise pour activer'
      }
      return 'En cours d\'activation…'

    default:
      return ''
  }
}

export function AutomationCard({ automation, slug, templateId }: AutomationCardProps) {
  const subtitle = getSubtitle(automation)

  return (
    <div className="card p-4 flex items-center gap-4 group">
      <StatusDot status={automation.status} pulse className="shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#0a0a0a] truncate">
          {automation.name}
        </p>
        {subtitle && (
          <p className="text-xs text-[rgba(0,0,0,0.4)] mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={automation.status} />

        {!automation.credentials_configured && automation.status === 'pending' && templateId && (
          <Link
            href={`/${slug}/marketplace?template=${templateId}`}
            className="btn-secondary text-xs px-2.5 py-1 gap-1"
          >
            <Settings size={12} />
            Configurer
          </Link>
        )}

        <Link
          href={`/${slug}/automations/${automation.id}`}
          className="inline-flex items-center gap-1 text-xs text-[rgba(0,0,0,0.4)] hover:text-[#0a0a0a] transition-colors px-2 py-1 rounded-[6px] hover:bg-[#f5f4f0]"
        >
          Détails
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}
