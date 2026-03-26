import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type ClerkUserEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted'
  data: {
    id: string
    email_addresses: { email_address: string; id: string }[]
    first_name: string | null
    last_name: string | null
    primary_email_address_id: string
  }
}

/**
 * POST /api/webhooks/clerk
 *
 * Syncs Clerk user lifecycle events to the Supabase users table.
 * Configure in Clerk Dashboard > Webhooks with events:
 *   user.created, user.updated, user.deleted
 *
 * Set CLERK_WEBHOOK_SECRET env var with the signing secret from Clerk.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  // If no secret configured, accept without verification (dev only)
  const body = await request.text()

  if (webhookSecret) {
    const svixId = request.headers.get('svix-id')
    const svixTimestamp = request.headers.get('svix-timestamp')
    const svixSignature = request.headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
    }

    try {
      const wh = new Webhook(webhookSecret)
      wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      })
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  let event: ClerkUserEvent
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'user.created':
    case 'user.updated': {
      const { id, email_addresses, first_name, last_name, primary_email_address_id } = event.data

      const primaryEmail = email_addresses.find(
        e => e.id === primary_email_address_id
      )?.email_address ?? email_addresses[0]?.email_address ?? ''

      const name = [first_name, last_name].filter(Boolean).join(' ') || null

      if (event.type === 'user.created') {
        // Insert — tenant_id will be assigned separately via onboarding
        const { error } = await supabase.from('users').upsert({
          clerk_user_id: id,
          email: primaryEmail,
          name,
          role: 'client',
        }, { onConflict: 'clerk_user_id' })

        if (error) console.error('[Clerk webhook] user.created upsert failed:', error)
      } else {
        // Update email/name if user already has a tenant
        const { error } = await supabase
          .from('users')
          .update({ email: primaryEmail, name })
          .eq('clerk_user_id', id)

        if (error) console.error('[Clerk webhook] user.updated failed:', error)
      }
      break
    }

    case 'user.deleted': {
      // Soft delete: remove user record (cascade deletes handled by DB FK constraints)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('clerk_user_id', event.data.id)

      if (error) console.error('[Clerk webhook] user.deleted failed:', error)
      break
    }
  }

  return NextResponse.json({ received: true })
}
