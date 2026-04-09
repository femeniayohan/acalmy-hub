import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const VALID_STATUSES = ['pending', 'in_progress', 'delivered']

async function verifyAdmin(userId: string) {
  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', userId)
    .single()
  return user?.role === 'admin'
}

// PATCH — update status OR call_requested OR slot_status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (!await verifyAdmin(userId)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const supabase = createServiceClient()
  const body = await request.json()

  // Build update payload dynamically
  const update: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }
    update.status = body.status
  }

  if (body.call_requested !== undefined) {
    update.call_requested = body.call_requested
    update.call_requested_at = body.call_requested ? new Date().toISOString() : null
  }

  if (body.slot_status !== undefined) {
    if (!['confirmed', 'declined'].includes(body.slot_status)) {
      return NextResponse.json({ error: 'slot_status invalide' }, { status: 400 })
    }
    update.slot_status = body.slot_status
  }

  const { error } = await supabase
    .from('custom_requests')
    .update(update)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
