'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * Wraps page content with a fade-up animation on route change.
 * Uses a key based on pathname to re-trigger the animation.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Reset and replay animation on route change
    el.style.animation = 'none'
    void el.offsetHeight // force reflow
    el.style.animation = ''
  }, [pathname])

  return (
    <div
      ref={ref}
      className={`animate-fade-up ${className ?? ''}`}
      style={{ animationDuration: '0.4s' }}
    >
      {children}
    </div>
  )
}
