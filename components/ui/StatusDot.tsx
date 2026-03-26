import { cn } from '@/lib/utils'
import type { AutomationStatus } from '@/lib/supabase/types'

interface StatusDotProps {
  status: AutomationStatus
  className?: string
  pulse?: boolean
}

const statusConfig: Record<AutomationStatus, { color: string; pulseColor: string }> = {
  active: {
    color: 'bg-[#16a34a]',
    pulseColor: 'bg-[#16a34a]',
  },
  paused: {
    color: 'bg-[#d97706]',
    pulseColor: 'bg-[#d97706]',
  },
  error: {
    color: 'bg-[#dc2626]',
    pulseColor: 'bg-[#dc2626]',
  },
  pending: {
    color: 'bg-[rgba(0,0,0,0.2)]',
    pulseColor: 'bg-[rgba(0,0,0,0.2)]',
  },
}

export function StatusDot({ status, className, pulse = false }: StatusDotProps) {
  const config = statusConfig[status]

  return (
    <span className={cn('relative flex h-2 w-2 shrink-0', className)}>
      {pulse && status === 'active' && (
        <span
          className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            config.pulseColor
          )}
        />
      )}
      <span
        className={cn('relative inline-flex rounded-full h-2 w-2', config.color)}
      />
    </span>
  )
}
