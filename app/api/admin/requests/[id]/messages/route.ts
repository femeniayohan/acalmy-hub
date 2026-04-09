import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { firstName } from '@/lib/utils'

export const runtime = 'nodejs'

// POST /api/admin/requests/[id]/messages — admin posts a message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', userId)
    .single()

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

  const clerkUser = await currentUser()
  const authorName = firstName(
    clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ''}`
      : 'Acalmy'
  ) || 'Acalmy'

  // Get tenant_id from the request
  const { data: req } = await supabase
    .from('custom_requests')
    .select('tenant_id')
    .eq('id', params.id)
    .single()

  if (!req) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  const { data: message, error } = await supabase
    .from('custom_request_messages')
    .insert({
      request_id: params.id,
      tenant_id: req.tenant_id,
      author_role: 'admin',
      author_name: authorName,
      content: content.trim(),
    })
    .select('id, content, author_role, author_name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message })
}
