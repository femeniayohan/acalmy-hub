import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: {
    value: number // percentage, positive = up, negative = down
    label?: string
  }
  className?: string
  children?: React.ReactNode // slot for sparkline or chart
}

export function MetricCard({
  label,
  value,
  subtext,
  trend,
  className,
  children,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'card p-5 flex flex-col gap-3',
        className
      )}
    >
      <p className="text-xs font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wider">
        {label}
      </p>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold text-[#0a0a0a] tracking-tight">
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-[rgba(0,0,0,0.4)] mt-0.5">{subtext}</p>
          )}
        </div>

        {trend !== undefined && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-[9999px]',
              trend.value >= 0
                ? 'bg-[#dcfce7] text-[#16a34a]'
                : 'bg-[#fee2e2] text-[#dc2626]'
            )}
          >
            {trend.value >= 0 ? '+' : ''}
            {trend.value}%{trend.label ? ` ${trend.label}` : ''}
          </span>
        )}
      </div>

      {children && <div className="mt-auto pt-1">{children}</div>}
    </div>
  )
}
