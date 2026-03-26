import { cn } from '@/lib/utils'
import type { AutomationStatus, ExecutionStatus, SubscriptionStatus } from '@/lib/supabase/types'

type BadgeVariant = AutomationStatus | ExecutionStatus | SubscriptionStatus

interface StatusBadgeProps {
  status: BadgeVariant
  className?: string
}

const badgeConfig: Record<BadgeVariant, { label: string; classes: string }> = {
  // Automation statuses
  active: {
    label: 'Actif',
    classes: 'bg-[#dcfce7] text-[#16a34a]',
  },
  paused: {
    label: 'En pause',
    classes: 'bg-[#fef3c7] text-[#d97706]',
  },
  error: {
    label: 'Erreur',
    classes: 'bg-[#fee2e2] text-[#dc2626]',
  },
  pending: {
    label: 'En attente',
    classes: 'bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.5)]',
  },
  // Execution statuses
  success: {
    label: 'Succès',
    classes: 'bg-[#dcfce7] text-[#16a34a]',
  },
  // Subscription statuses
  canceled: {
    label: 'Annulé',
    classes: 'bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.4)]',
  },
  past_due: {
    label: 'Paiement en retard',
    classes: 'bg-[#fee2e2] text-[#dc2626]',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = badgeConfig[status] ?? {
    label: status,
    classes: 'bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.5)]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[9999px] text-xs font-medium',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  )
}
