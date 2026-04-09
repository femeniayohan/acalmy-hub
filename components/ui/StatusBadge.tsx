import { cn } from '@/lib/utils'
import type { AutomationStatus, ExecutionStatus, SubscriptionStatus } from '@/lib/supabase/types'

type BadgeVariant = AutomationStatus | ExecutionStatus | SubscriptionStatus

interface StatusBadgeProps {
  status: BadgeVariant
  className?: string
}

const badgeConfig: Record<BadgeVariant, { label: string }> = {
  active:    { label: 'Actif' },
  paused:    { label: 'En pause' },
  error:     { label: 'Erreur' },
  pending:   { label: 'En attente' },
  success:   { label: 'Succès' },
  canceled:  { label: 'Annulé' },
  past_due:  { label: 'Impayé' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = badgeConfig[status] ?? { label: status }
  const isActive = status === 'active'

  return (
    <span
      className={cn(className)}
      style={isActive ? {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#16a34a',
        background: '#dcfce7',
        borderRadius: '4px',
      } : {
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: '#a1a1aa',
      }}
    >
      {isActive && (
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a', flexShrink: 0, display: 'inline-block' }} />
      )}
      {config.label}
    </span>
  )
}
