import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import { getTenantBySlug } from '@/lib/tenant'

// Routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)', // Stripe + n8n webhooks must remain public
])

// After sign-in, redirect root "/" to onboarding
const isRootRoute = createRouteMatcher(['/'])

// URL path segments that are never tenant slugs
const RESERVED_SEGMENTS = new Set([
  'admin',
  'api',
  'sign-in',
  'sign-up',
  'onboarding',
  '_next',
  'favicon.ico',
  'not-found',
  'error',
])

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') ?? ''

  // ── 1. Admin subdomain rewrite ─────────────────────────────────────────────
  // admin.acalmy.com → /admin/...
  const isAdminDomain =
    hostname === 'admin.acalmy.com' ||
    hostname.startsWith('admin.acalmy.') // staging variants

  if (isAdminDomain && !url.pathname.startsWith('/admin')) {
    url.pathname = `/admin${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(url)
  }

  // ── 2. Auth protection ─────────────────────────────────────────────────────
  if (!isPublicRoute(request)) {
    auth().protect()
  }

  // ── 2a. Admin routes: vérifier l'organisation Clerk ───────────────────────
  // La vérification approfondie est faite dans AdminLayout via le Backend SDK.
  // Ici on vérifie rapidement que l'orgId actif correspond à l'org admin (JWT).
  const isAdminRoute = url.pathname.startsWith('/admin')
  const adminOrgId = process.env.CLERK_ADMIN_ORG_ID
  if (isAdminRoute && !isPublicRoute(request) && adminOrgId) {
    const { orgId } = auth()
    if (!orgId || orgId !== adminOrgId) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── 2b. Root redirect → onboarding ────────────────────────────────────────
  if (isRootRoute(request) && auth().userId) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // ── 3. Tenant resolution for hub routes ───────────────────────────────────
  const pathParts = url.pathname.split('/').filter(Boolean)
  const potentialSlug = pathParts[0]

  if (potentialSlug && !RESERVED_SEGMENTS.has(potentialSlug)) {
    const tenant = await getTenantBySlug(potentialSlug)

    if (!tenant) {
      return NextResponse.redirect(new URL('/not-found', request.url))
    }

    // Inject tenant context into request headers for Server Components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-tenant-id', tenant.id)
    requestHeaders.set('x-tenant-slug', tenant.slug)
    requestHeaders.set('x-tenant-company', tenant.company_name)
    requestHeaders.set('x-tenant-plan', tenant.plan)

    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Match all routes except Next.js static files and image optimization
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
