'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Zap,
  ShoppingBag,
  PenLine,
} from 'lucide-react'
import { UserButton, useUser } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { BillingButton } from '@/components/ui/BillingButton'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

function buildNavItems(slug: string): NavItem[] {
  return [
    { label: 'Tableau de bord', href: `/${slug}/dashboard`, icon: LayoutDashboard },
    { label: 'Mes automatisations', href: `/${slug}/automations`, icon: Zap },
    { label: 'Marketplace', href: `/${slug}/marketplace`, icon: ShoppingBag },
    { label: 'Sur mesure', href: `/${slug}/custom`, icon: PenLine },
  ]
}

interface SidebarProps {
  slug: string
  companyName: string
}

export function Sidebar({ slug, companyName }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useUser()
  const navItems = buildNavItems(slug)

  return (
    <nav
      aria-label="Navigation principale"
      className="flex flex-col h-full w-[220px] shrink-0 border-r border-[rgba(0,0,0,0.08)] bg-white px-2 py-4"
    >
      {/* Wordmark */}
      <div className="px-3 mb-5">
        <span className="text-[15px] font-semibold tracking-tight text-[#0a0a0a]">
          acalmy
        </span>
      </div>

      {/* Tenant context */}
      <div className="px-3 mb-5 pb-5 border-b border-[rgba(0,0,0,0.06)]">
        <p className="text-[10px] font-medium text-[rgba(0,0,0,0.35)] uppercase tracking-widest mb-0.5">
          Espace client
        </p>
        <p className="text-[13px] font-medium text-[#0a0a0a] truncate leading-tight">
          {companyName}
        </p>
      </div>

      {/* Navigation */}
      <ul className="space-y-0.5 flex-1" role="list">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] text-[13px] transition-colors duration-100',
                  isActive
                    ? 'bg-[#f5f4f0] text-[#0a0a0a] font-medium'
                    : 'text-[rgba(0,0,0,0.45)] hover:text-[#0a0a0a] hover:bg-[rgba(0,0,0,0.03)]'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon
                  size={14}
                  strokeWidth={isActive ? 2 : 1.5}
                  className="shrink-0"
                />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Facturation */}
      <div className="px-2 pb-1">
        <BillingButton slug={slug} />
      </div>

      {/* User footer */}
      <div className="px-3 pt-3 border-t border-[rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2.5">
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: 'w-7 h-7',
              },
            }}
          />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-[#0a0a0a] truncate leading-tight">
              {user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? 'Mon compte'}
            </p>
            <p className="text-[11px] text-[rgba(0,0,0,0.35)] truncate leading-tight">
              {user?.emailAddresses[0]?.emailAddress ?? ''}
            </p>
          </div>
        </div>
      </div>
    </nav>
  )
}
