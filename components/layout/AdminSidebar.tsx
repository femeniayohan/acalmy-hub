'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Package, Activity, LayoutDashboard, PenLine } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { label: "Vue d'ensemble", href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Clients', href: '/admin/clients', icon: Users },
  { label: 'Templates', href: '/admin/templates', icon: Package },
  { label: 'Exécutions', href: '/admin/executions', icon: Activity },
  { label: 'Demandes', href: '/admin/requests', icon: PenLine },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigation admin"
      className="flex flex-col h-full w-[220px] shrink-0 border-r border-[rgba(0,0,0,0.08)] bg-white px-2 py-4"
    >
      {/* Wordmark + role */}
      <div className="px-3 mb-5 pb-5 border-b border-[rgba(0,0,0,0.06)]">
        <span className="text-[15px] font-semibold tracking-tight text-[#0a0a0a]">
          acalmy
        </span>
        <p className="text-[10px] font-medium text-[rgba(0,0,0,0.35)] uppercase tracking-widest mt-1">
          Admin
        </p>
      </div>

      <ul className="space-y-0.5 flex-1" role="list">
        {adminNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

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

      <div className="px-3 pt-4 border-t border-[rgba(0,0,0,0.06)]">
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{ elements: { avatarBox: 'w-7 h-7' } }}
        />
      </div>
    </nav>
  )
}
