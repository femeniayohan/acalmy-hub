import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateStripeCustomer, createCheckoutSession } from '@/lib/stripe'
import { getTenantFromUser } from '@/lib/tenant'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantCtx = await getTenantFromUser(userId)
  if (!tenantCtx) {
    return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 })
  }
  const { tenantId, tenantCompany } = tenantCtx

  const { templateId, successUrl, cancelUrl } = await request.json()

  if (!templateId || !successUrl || !cancelUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check template exists and is active
  const { data: template } = await supabase
    .from('marketplace_templates')
    .select('id, name, stripe_price_id, price_monthly')
    .eq('id', templateId)
    .eq('is_active', true)
    .single()

  if (!template) {
    return NextResponse.json({ error: 'Template introuvable' }, { status: 404 })
  }

  // Prevent duplicate subscriptions
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('template_id', templateId)
    .eq('status', 'active')
    .maybeSingle()

  if (existingSub) {
    return NextResponse.json({ error: 'Vous êtes déjà abonné à ce template' }, { status: 409 })
  }

  // Get or create Stripe customer
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? ''

  const customerId = await getOrCreateStripeCustomer(tenantId, email, tenantCompany)

  // Update tenant with Stripe customer ID if not set
  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.stripe_customer_id) {
    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenantId)
  }

  const session = await createCheckoutSession({
    customerId,
    priceId: template.stripe_price_id ?? null,
    templateName: template.name,
    priceMonthly: template.price_monthly,
    tenantId,
    templateId,
    successUrl,
    cancelUrl,
  })

  return NextResponse.json({ url: session.url })
}
