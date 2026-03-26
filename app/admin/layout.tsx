import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Verify admin role in Supabase (server-side, not client-side)
  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', userId)
    .single()

  if (!user || user.role !== 'admin') {
    // Not an admin — redirect to home or a 403 page
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
