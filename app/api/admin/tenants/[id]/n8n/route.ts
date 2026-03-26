import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin role
  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', userId)
    .single()

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { n8n_url, n8n_api_key } = await request.json()

  const { error } = await supabase
    .from('tenants')
    .update({ n8n_url: n8n_url || null, n8n_api_key: n8n_api_key || null })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
