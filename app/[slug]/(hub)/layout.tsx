import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

interface HubLayoutProps {
  children: React.ReactNode
  params: { slug: string }
}

export default async function HubLayout({ children, params }: HubLayoutProps) {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')
  const tenantCompany = headersList.get('x-tenant-company') ?? params.slug

  if (!tenantId) notFound()

  // Check for pending call requests (for sidebar badge)
  let hasCallNotification = false
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('custom_requests')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('call_requested', true)
      .is('proposed_slot', null)
      .limit(1)
    hasCallNotification = (data?.length ?? 0) > 0
  } catch { /* table may not exist yet */ }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar — flush, pas de padding autour */}
      <div className="hidden md:block shrink-0">
        <Sidebar slug={params.slug} companyName={tenantCompany} hasCallNotification={hasCallNotification} />
      </div>

      {/* Contenu */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile nav */}
        <div className="md:hidden">
          <MobileNav slug={params.slug} companyName={tenantCompany} />
        </div>

        <main className="flex-1 overflow-auto min-w-0" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
