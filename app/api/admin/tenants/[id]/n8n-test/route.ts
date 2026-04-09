import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { testConnection } from '@/lib/n8n'

export const runtime = 'nodejs'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: user } = await supabase.from('users').select('role').eq('clerk_user_id', userId).single()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('n8n_url, n8n_api_key')
    .eq('id', params.id)
    .single()

  if (!tenant?.n8n_url || !tenant?.n8n_api_key) {
    return NextResponse.json({ error: 'Instance n8n non configurée' }, { status: 400 })
  }

  const ok = await testConnection({ baseUrl: tenant.n8n_url, apiKey: tenant.n8n_api_key })
  return NextResponse.json({ ok })
}
