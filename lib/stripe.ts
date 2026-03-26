import Stripe from 'stripe'

/**
 * Stripe server-side client — SERVER-SIDE ONLY.
 * Never import this in Client Components.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

/**
 * Create or retrieve a Stripe customer for a tenant.
 */
export async function getOrCreateStripeCustomer(
  tenantId: string,
  email: string,
  companyName: string
): Promise<string> {
  // Check if customer already exists
  const existing = await stripe.customers.search({
    query: `metadata['tenant_id']:'${tenantId}'`,
    limit: 1,
  })

  if (existing.data.length > 0) {
    return existing.data[0].id
  }

  const customer = await stripe.customers.create({
    email,
    name: companyName,
    metadata: { tenant_id: tenantId },
  })

  return customer.id
}

/**
 * Create a Stripe Checkout Session for a marketplace template subscription.
 */
export async function createCheckoutSession(params: {
  customerId: string
  priceId?: string | null
  templateName?: string
  priceMonthly?: number // en centimes
  tenantId: string
  templateId: string
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = params.priceId
    ? { price: params.priceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: 'eur',
          recurring: { interval: 'month' },
          unit_amount: params.priceMonthly ?? 0,
          product_data: {
            name: params.templateName ?? 'Automatisation Acalmy',
          },
        },
      }

  return stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [lineItem],
    subscription_data: {
      metadata: {
        tenant_id: params.tenantId,
        template_id: params.templateId,
      },
    },
    metadata: {
      tenant_id: params.tenantId,
      template_id: params.templateId,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    locale: 'fr',
  })
}

/**
 * Construct and verify a Stripe webhook event.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}
