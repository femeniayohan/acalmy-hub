import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
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

  return (
    <div className="flex h-screen bg-[#fafaf9] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar slug={params.slug} companyName={tenantCompany} />
      </div>

      {/* Mobile layout */}
      <div className="flex flex-col flex-1 md:flex-none md:contents overflow-hidden">
        <MobileNav slug={params.slug} companyName={tenantCompany} />

        <main className="flex-1 overflow-auto" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
