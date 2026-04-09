import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth()

  if (!userId) redirect('/sign-in')

  const adminOrgId = process.env.CLERK_ADMIN_ORG_ID
  if (!adminOrgId) {
    console.error('[AdminLayout] CLERK_ADMIN_ORG_ID is not set')
    redirect('/')
  }

  // Vérification via Clerk Backend SDK — impossible à contourner côté client
  // Récupère toutes les organisations du user et vérifie qu'il est membre de l'org admin
  try {
    const client = await clerkClient()
    const { data: memberships } = await client.users.getOrganizationMembershipList({ userId })
    const isAdminMember = memberships.some(m => m.organization.id === adminOrgId)
    if (!isAdminMember) redirect('/')
  } catch {
    redirect('/')
  }

  return (
    <div className="flex h-screen bg-[#fafaf9] overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-auto" id="admin-main">
        {children}
      </main>
    </div>
  )
}
