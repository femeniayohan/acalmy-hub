import { formatEur, translateCategory } from '@/lib/utils'
import type { MarketplaceTemplate } from '@/lib/supabase/types'
import { Check } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

interface TemplateCardProps {
  template: MarketplaceTemplate
  isSubscribed: boolean
  onSelect: () => void
}

// Category color mapping
const categoryColors: Record<string, { bg: string; icon: string }> = {
  crm: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  marketing: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  reporting: { bg: 'bg-orange-50', icon: 'text-orange-600' },
  ia: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
}

export function TemplateCard({ template, isSubscribed, onSelect }: TemplateCardProps) {
  const colors = categoryColors[template.category] ?? { bg: 'bg-gray-50', icon: 'text-gray-600' }

  // Dynamic icon from lucide-react
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[template.icon_name]
    ?? LucideIcons.Zap

  return (
    <div className="card p-4 flex flex-col gap-3 hover:border-[rgba(0,0,0,0.15)] transition-all cursor-pointer group"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${colors.bg}`}>
        <IconComponent size={16} className={colors.icon} />
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-[13px] font-semibold text-[#0a0a0a] leading-tight mb-1">
          {template.name}
        </h3>
        <p className="text-xs text-[rgba(0,0,0,0.4)] leading-relaxed line-clamp-2">
          {template.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[rgba(0,0,0,0.05)]">
        <span className="text-[12px] font-medium text-[#0a0a0a]">
          {formatEur(template.price_monthly)}
          <span className="text-[rgba(0,0,0,0.4)] font-normal">/mois</span>
        </span>

        {isSubscribed ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16a34a]">
            <Check size={12} />
            Actif
          </span>
        ) : (
          <span className="text-xs font-medium text-[rgba(0,0,0,0.5)] group-hover:text-[#0a0a0a] transition-colors">
            Ajouter →
          </span>
        )}
      </div>
    </div>
  )
}
