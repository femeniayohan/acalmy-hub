'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LayoutDashboard, Zap, ShoppingBag, PenLine } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  slug: string
  companyName: string
}

export function MobileNav({ slug, companyName }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { label: 'Tableau de bord', href: `/${slug}/dashboard`, icon: LayoutDashboard },
    { label: 'Mes automatisations', href: `/${slug}/automations`, icon: Zap },
    { label: 'Marketplace', href: `/${slug}/marketplace`, icon: ShoppingBag },
    { label: 'Sur mesure', href: `/${slug}/custom`, icon: PenLine },
  ]

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex md:hidden items-center justify-between px-4 h-12 border-b border-[rgba(0,0,0,0.08)] bg-white shrink-0">
        <span className="text-[15px] font-semibold tracking-tight text-[#0a0a0a]">acalmy</span>
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-[8px] hover:bg-[#f5f4f0] transition-colors"
          aria-label="Menu"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-[240px] bg-white z-50 flex flex-col p-3 md:hidden shadow-xl">
            <div className="flex items-center justify-between px-3 mb-4">
              <span className="text-[15px] font-semibold tracking-tight">acalmy</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-[6px] hover:bg-[#f5f4f0] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-3 mb-4 pb-4 border-b border-[rgba(0,0,0,0.06)]">
              <p className="text-[10px] font-medium text-[rgba(0,0,0,0.35)] uppercase tracking-widest mb-0.5">Espace client</p>
              <p className="text-[13px] font-medium text-[#0a0a0a] truncate">{companyName}</p>
            </div>

            <ul className="space-y-0.5 flex-1">
              {navItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] text-[13px] transition-colors',
                        isActive
                          ? 'bg-[#f5f4f0] text-[#0a0a0a] font-medium'
                          : 'text-[rgba(0,0,0,0.45)] hover:text-[#0a0a0a] hover:bg-[rgba(0,0,0,0.03)]'
                      )}
                    >
                      <item.icon size={14} strokeWidth={isActive ? 2 : 1.5} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="px-3 pt-4 border-t border-[rgba(0,0,0,0.06)]">
              <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
