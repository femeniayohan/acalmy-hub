import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

async function verifyAdmin(userId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('clerk_user_id', userId)
    .single()
  return data?.role === 'admin'
}

export async function POST(request: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verifyAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, description, category, icon_name, price_monthly, stripe_price_id, n8n_template_id, config_schema, is_active } = body

  if (!name?.trim() || !category || !price_monthly) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('marketplace_templates')
    .insert({
      name: name.trim(),
      description: description?.trim() ?? '',
      category,
      icon_name: icon_name?.trim() || 'Zap',
      price_monthly: parseInt(price_monthly),
      stripe_price_id: stripe_price_id?.trim() || null,
      n8n_template_id: n8n_template_id?.trim() || null,
      config_schema: config_schema ?? { fields: [] },
      is_active: is_active ?? true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Admin templates] Insert error:', error)
    return NextResponse.json({ error: 'Impossible de créer le template' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

export async function PATCH(request: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verifyAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('marketplace_templates')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Impossible de modifier le template' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
