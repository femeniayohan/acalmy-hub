interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  trend?: { value: number; label?: string }
  accent?: string
  className?: string
  children?: React.ReactNode
}

export function MetricCard({ label, value, subtext, className, children }: MetricCardProps) {
  return (
    <div
      className={`card p-8 flex flex-col gap-4 ${className ?? ''}`}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.02)' }}
    >
      <p style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a1a1aa' }}>
        {label}
      </p>
      <p style={{ fontSize: '1.875rem', fontWeight: 500, letterSpacing: '-0.025em', color: '#27272a', lineHeight: 1 }}>
        {value}
      </p>
      {subtext && (
        <p style={{ fontSize: '0.75rem', fontWeight: 300, color: '#a1a1aa', letterSpacing: '0.05em' }}>
          {subtext}
        </p>
      )}
      {children && <div>{children}</div>}
    </div>
  )
}
