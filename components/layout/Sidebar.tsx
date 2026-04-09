'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Zap, ShoppingBag, PenLine } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { BillingButton } from '@/components/ui/BillingButton'
import { cn } from '@/lib/utils'

interface SidebarProps {
  slug: string
  companyName: string
  hasCallNotification?: boolean
}

const navItems = (slug: string, hasCallNotification: boolean) => [
  { label: 'Tableau de bord',      href: `/${slug}/dashboard`,    icon: LayoutDashboard },
  { label: 'Automatisations',      href: `/${slug}/automations`,  icon: Zap },
  { label: 'Marketplace',          href: `/${slug}/marketplace`,  icon: ShoppingBag },
  { label: 'Sur mesure',           href: `/${slug}/custom`,       icon: PenLine,        badge: hasCallNotification },
]

export function Sidebar({ slug, companyName, hasCallNotification = false }: SidebarProps) {
  const pathname = usePathname()
  const items = navItems(slug, hasCallNotification)

  return (
    <nav
      aria-label="Navigation principale"
      className="flex flex-col h-full w-72 shrink-0"
      style={{ background: '#ffffff', borderRight: '1px solid #eeeeee' }}
    >
      {/* Logo */}
      <div className="h-20 flex items-center px-8">
        <span
          className="text-xs font-medium tracking-widest uppercase"
          style={{ color: '#27272a' }}
        >
          {companyName}
        </span>
      </div>

      {/* Nav section label */}
      <div className="px-8 mb-2">
        <p style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a1a1aa' }}>
          Espace client
        </p>
      </div>

      {/* Nav items */}
      <ul className="flex-1 px-4" role="list">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'text-[#27272a]'
                    : 'text-[#71717a] hover:text-[#27272a]'
                )}
                style={isActive ? { background: 'rgba(250,250,248,0.8)' } : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* 2px left bar for active */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4"
                    style={{ background: '#a8a29e' }}
                  />
                )}
                <Icon size={16} strokeWidth={1.5} className="shrink-0" style={{ color: isActive ? '#71717a' : '#a1a1aa' }} />
                <span className={cn('flex-1 text-sm', isActive ? 'font-medium' : 'font-normal')}>
                  {item.label}
                </span>
                {item.badge && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#a8a29e' }} />
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Separator */}
      <div className="mx-8 h-px" style={{ background: '#eeeeee' }} />

      {/* Billing */}
      <div className="px-4 mt-3 mb-3">
        <BillingButton slug={slug} />
      </div>

      {/* User */}
      <div className="px-8 pb-8">
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{ elements: { avatarBox: 'w-7 h-7' } }}
        />
      </div>
    </nav>
  )
}
