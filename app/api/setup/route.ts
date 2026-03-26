import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * POST /api/setup
 *
 * Crée un tenant démo + automatisations + exécutions pour un utilisateur.
 * Protégé : utilisateur doit être connecté. Utilisable uniquement si aucun tenant
 * n'existe déjà pour cet utilisateur.
 *
 * Body: { companyName: string, slug: string }
 */
export async function POST(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { companyName, slug } = await request.json()

  if (!companyName?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'companyName et slug requis' }, { status: 400 })
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Check if user already has a tenant
  const { data: existingUser } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('clerk_user_id', userId)
    .single()

  if (existingUser?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', existingUser.tenant_id)
      .single()
    return NextResponse.json({ slug: tenant?.slug, alreadyExists: true })
  }

  // Check slug availability
  const { data: slugTaken } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug.toLowerCase())
    .maybeSingle()

  if (slugTaken) {
    return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 409 })
  }

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      slug: slug.toLowerCase(),
      company_name: companyName.trim(),
      plan: 'starter',
      mrr: 0,
    })
    .select('id, slug')
    .single()

  if (tenantError || !tenant) {
    console.error('[Setup] Failed to create tenant:', tenantError)
    return NextResponse.json({ error: 'Impossible de créer le tenant' }, { status: 500 })
  }

  // Get user email from Clerk (via existing user record or fetch from API)
  const { data: clerkUser } = await supabase
    .from('users')
    .select('email, name')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  // Upsert user with tenant_id
  await supabase.from('users').upsert({
    clerk_user_id: userId,
    tenant_id: tenant.id,
    email: clerkUser?.email ?? '',
    name: clerkUser?.name ?? null,
    role: 'client',
  }, { onConflict: 'clerk_user_id' })

  return NextResponse.json({ slug: tenant.slug, created: true })
}
