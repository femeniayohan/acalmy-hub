'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for Client Components.
 * Uses the anon key + user session (respects RLS policies).
 * Safe to use in the browser — never uses service role key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
