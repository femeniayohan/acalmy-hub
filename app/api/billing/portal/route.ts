import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTenantFromUser } from '@/lib/tenant'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

export async function POST(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantCtx = await getTenantFromUser(userId)
  if (!tenantCtx) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantCtx.tenantId)
    .single()

  if (!tenant?.stripe_customer_id) {
    return NextResponse.json({ error: 'Aucun abonnement actif' }, { status: 404 })
  }

  const { returnUrl } = await request.json().catch(() => ({}))

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/${tenantCtx.tenantSlug}/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}
