import type { MarketplaceTemplate } from '@/lib/supabase/types'
import { translateCategory } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'
import { formatEur } from '@/lib/utils'

interface TemplateCardProps {
  template: MarketplaceTemplate
  isSubscribed: boolean
  onSelect: () => void
}

export function TemplateCard({ template, isSubscribed, onSelect }: TemplateCardProps) {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[template.icon_name] ?? LucideIcons.Zap

  return (
    <div
      className="card p-8 flex flex-col gap-5 cursor-pointer card-hover"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="flex items-start justify-between">
        <IconComponent size={18} strokeWidth={1.5} style={{ color: '#a1a1aa' }} />
        {isSubscribed && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '2px 8px', borderRadius: '4px',
            fontSize: '10px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#16a34a', background: '#dcfce7',
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            Actif
          </span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-medium leading-tight mb-2" style={{ color: '#27272a' }}>
          {template.name}
        </h3>
        <p className="text-sm font-light leading-relaxed line-clamp-2" style={{ color: '#71717a' }}>
          {template.description}
        </p>
      </div>

      <div className="flex items-end justify-between pt-4" style={{ borderTop: '1px solid #eeeeee' }}>
        <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a1a1aa' }}>
          {translateCategory(template.category)}
        </span>
        <span className="text-sm font-medium" style={{ color: '#27272a' }}>
          {formatEur(template.price_monthly)}
          <span className="text-xs font-light" style={{ color: '#a1a1aa' }}>/mois</span>
        </span>
      </div>
    </div>
  )
}
