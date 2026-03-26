import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/OnboardingForm'

export const metadata: Metadata = { title: 'Bienvenue — Acalmy' }

export default async function OnboardingPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServiceClient()

  // If user already has a tenant, redirect to their hub
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id, tenants(slug)')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (user?.tenant_id) {
    const slug = Array.isArray(user.tenants)
      ? user.tenants[0]?.slug
      : (user.tenants as { slug: string } | null)?.slug
    if (slug) redirect(`/${slug}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-lg font-semibold tracking-tight text-[#0a0a0a]">acalmy</span>
          <p className="text-sm text-[rgba(0,0,0,0.45)] mt-2">
            Configurons votre espace en quelques secondes.
          </p>
        </div>
        <div className="card p-6">
          <OnboardingForm />
        </div>
      </div>
    </div>
  )
}
