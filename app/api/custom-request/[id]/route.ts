import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantFromUser } from '@/lib/tenant'

export const runtime = 'nodejs'

// PATCH /api/custom-request/[id] — client edits their request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const tenantCtx = await getTenantFromUser(userId)
  if (!tenantCtx) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 404 })

  const { description, tools, budget } = await request.json()
  if (!description?.trim()) return NextResponse.json({ error: 'Description requise' }, { status: 400 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('custom_requests')
    .update({
      description: description.trim(),
      tools: tools?.trim() || null,
      budget: budget || null,
      title: description.trim().slice(0, 80) + (description.length > 80 ? '…' : ''),
    })
    .eq('id', params.id)
    .eq('tenant_id', tenantCtx.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// POST /api/custom-request/[id] — client proposes a call slot
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const tenantCtx = await getTenantFromUser(userId)
  if (!tenantCtx) return NextResponse.json({ error: 'Tenant introuvable' }, { status: 404 })

  const { proposed_slot } = await request.json()
  if (!proposed_slot) return NextResponse.json({ error: 'Créneau requis' }, { status: 400 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('custom_requests')
    .update({ proposed_slot, slot_status: 'pending' })
    .eq('id', params.id)
    .eq('tenant_id', tenantCtx.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
