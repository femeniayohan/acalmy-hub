'use server'

import { cookies } from 'next/headers'

export async function markMarketplaceVisited() {
  cookies().set('visited_marketplace', '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 an
    httpOnly: false,
    sameSite: 'lax',
  })
}
