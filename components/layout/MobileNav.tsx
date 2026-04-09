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
    { label: 'Tableau de bord', href: `/${slug}/dashboard`,   icon: LayoutDashboard },
    { label: 'Automatisations', href: `/${slug}/automations`, icon: Zap },
    { label: 'Marketplace',     href: `/${slug}/marketplace`, icon: ShoppingBag },
    { label: 'Sur mesure',      href: `/${slug}/custom`,      icon: PenLine },
  ]

  return (
    <>
      <header
        className="flex md:hidden items-center justify-between px-6 h-14 shrink-0"
        style={{ background: '#ffffff', borderBottom: '1px solid #eeeeee' }}
      >
        <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#27272a' }}>
          {companyName}
        </span>
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 transition-colors"
          style={{ color: '#a1a1aa' }}
          aria-label="Menu"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>
      </header>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/10 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div
            className="fixed left-0 top-0 h-full w-72 z-50 flex flex-col md:hidden"
            style={{ background: '#ffffff', borderRight: '1px solid #eeeeee' }}
          >
            <div className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid #eeeeee' }}>
              <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#27272a' }}>
                {companyName}
              </span>
              <button onClick={() => setOpen(false)} style={{ color: '#a1a1aa' }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <ul className="flex-1 px-4 pt-4">
              {navItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'relative flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                        isActive ? 'text-[#27272a]' : 'text-[#71717a] hover:text-[#27272a]'
                      )}
                      style={isActive ? { background: 'rgba(250,250,248,0.8)' } : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4" style={{ background: '#a8a29e' }} />
                      )}
                      <item.icon size={16} strokeWidth={1.5} style={{ color: isActive ? '#71717a' : '#a1a1aa' }} />
                      <span className={isActive ? 'font-medium' : 'font-normal'}>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="px-8 pb-8" style={{ borderTop: '1px solid #eeeeee', paddingTop: '1.5rem' }}>
              <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
