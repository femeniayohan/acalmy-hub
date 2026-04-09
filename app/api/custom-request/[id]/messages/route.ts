import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantFromUser } from '@/lib/tenant'
import { firstName } from '@/lib/utils'

export const runtime = 'nodejs'

// POST /api/custom-request/[id]/messages — client posts a message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const tenantCtx = await getTenantFromUser(userId)
  if (!tenantCtx) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 404 })

  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

  const clerkUser = await currentUser()
  const authorName = firstName(
    clerkUser?.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ''}`
      : clerkUser?.emailAddresses[0]?.emailAddress ?? null
  )

  const supabase = createServiceClient()

  // Verify request belongs to tenant
  const { data: req } = await supabase
    .from('custom_requests')
    .select('id')
    .eq('id', params.id)
    .eq('tenant_id', tenantCtx.tenantId)
    .single()

  if (!req) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  const { data: message, error } = await supabase
    .from('custom_request_messages')
    .insert({
      request_id: params.id,
      tenant_id: tenantCtx.tenantId,
      author_role: 'client',
      author_name: authorName,
      content: content.trim(),
    })
    .select('id, content, author_role, author_name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message })
}
