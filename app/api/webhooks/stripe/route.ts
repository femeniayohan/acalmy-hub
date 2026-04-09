import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export const runtime = 'nodejs' // Need Node.js for stripe webhook verification

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature)
  } catch (err) {
    console.error('[Stripe webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenant_id
      const templateId = session.metadata?.template_id
      const stripeSubscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null

      if (!tenantId || !templateId) {
        console.error('[Stripe webhook] Missing metadata on session:', session.id)
        break
      }

      // ── Idempotency: skip if this session was already processed ───────────
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('template_id', templateId)
        .eq('status', 'active')
        .maybeSingle()

      if (existingSub) {
        console.log('[Stripe webhook] Already processed — skipping:', session.id)
        break
      }

      // Fetch template to get name and config_schema
      const { data: template } = await supabase
        .from('marketplace_templates')
        .select('name, description, category, n8n_template_id, config_schema')
        .eq('id', templateId)
        .single()

      if (!template) {
        console.error('[Stripe webhook] Template not found:', templateId)
        break
      }

      // Create automation record in pending state
      const { data: automation, error: autoError } = await supabase
        .from('automations')
        .insert({
          tenant_id: tenantId,
          name: template.name,
          description: template.description,
          category: template.category,
          status: 'pending',
          credentials_configured: false,
          config: template.config_schema,
        })
        .select('id')
        .single()

      if (autoError || !automation) {
        console.error('[Stripe webhook] Failed to create automation:', autoError)
        break
      }

      // Create subscription record
      await supabase.from('subscriptions').insert({
        tenant_id: tenantId,
        template_id: templateId,
        automation_id: automation.id,
        stripe_subscription_id: stripeSubscriptionId,
        status: 'active',
      })

      console.log('[Stripe webhook] checkout.session.completed — created automation:', automation.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = typeof invoice.subscription === 'string'
        ? invoice.subscription
        : (invoice.subscription as Stripe.Subscription | null)?.id ?? null

      if (!subscriptionId) break

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, automation_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single()

      if (sub) {
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('id', sub.id)

        if (sub.automation_id) {
          await supabase
            .from('automations')
            .update({ status: 'paused' })
            .eq('id', sub.automation_id)
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, automation_id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (sub) {
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('id', sub.id)

        if (sub.automation_id) {
          await supabase
            .from('automations')
            .update({ status: 'paused' })
            .eq('id', sub.automation_id)
        }
      }
      break
    }

    default:
      // Unhandled event types — not an error
      break
  }

  return NextResponse.json({ received: true })
}
