'use client'

import { useEffect } from 'react'
import { markMarketplaceVisited } from '@/app/actions'

export function TrackMarketplaceVisit() {
  useEffect(() => {
    markMarketplaceVisited()
  }, [])
  return null
}
