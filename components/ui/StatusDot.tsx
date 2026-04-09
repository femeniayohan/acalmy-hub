import { cn } from '@/lib/utils'
import type { AutomationStatus } from '@/lib/supabase/types'

interface StatusDotProps {
  status: AutomationStatus
  className?: string
  pulse?: boolean
}

export function StatusDot({ status, className, pulse = false }: StatusDotProps) {
  const isActive = status === 'active'
  const color = isActive ? '#16a34a' : '#d4d4d8'  // emerald-600 or zinc-300

  return (
    <span className={cn('relative flex h-1.5 w-1.5 shrink-0', className)}>
      {pulse && isActive && (
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
          style={{ background: color }}
        />
      )}
      <span
        className="relative inline-flex rounded-full h-1.5 w-1.5"
        style={{ background: color }}
      />
    </span>
  )
}
