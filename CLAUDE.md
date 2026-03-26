# Acalmy Hub — Project Memory

## Project Overview
Multi-tenant SaaS client portal for Acalmy (AI automation agency).
- **Client hub**: `app.acalmy.com/{slug}` — each client has their own space
- **Admin**: `admin.acalmy.com` — Acalmy team only
- **Stack**: Next.js 14 App Router, TypeScript, Tailwind CSS, Clerk v5, Supabase, Stripe, n8n, Resend

## Key Architecture Decisions

### Multi-tenancy
- Routing by URL slug: `app.acalmy.com/{slug-client}/dashboard`
- Middleware (`middleware.ts`) resolves slug → tenant via Supabase, injects headers:
  - `x-tenant-id`, `x-tenant-slug`, `x-tenant-company`, `x-tenant-plan`
- Hub layout reads headers: `headers().get('x-tenant-id')`
- RESERVED_SEGMENTS: `admin`, `api`, `sign-in`, `sign-up`, `onboarding`, `not-found`

### Auth (Clerk v5)
- Pattern: `auth().protect()` NOT `auth.protect()` — must call `auth()` first
- Redirect URLs: `/onboarding` after sign-in and sign-up
- Webhook at `/api/webhooks/clerk` (needs `CLERK_WEBHOOK_SECRET` env var)
- Svix signature verification for webhook security

### Database (Supabase)
- 6 tables: `tenants`, `users`, `automations`, `executions`, `marketplace_templates`, `subscriptions`
- RLS enabled — `anon` key for client reads, `service_role` for admin writes
- Credentials stored in **Supabase Vault** (pgvault extension, AES-256) — never in plaintext
- `createServerClient()` = anon key + cookies (for hub pages)
- `createServiceClient()` = service role, bypasses RLS (for API routes + admin)
- SQL functions: `increment_automation_runs()`, `get_daily_runs()`, `get_monthly_comparison()`

### n8n Integration
- Server-side only — client NEVER sees n8n concepts
- All business language in UI: "automatisation", not "workflow"
- `lib/n8n.ts` — activate/deactivate workflow, create credentials, deploy template
- n8n triggered via `/api/automations/activate` and `/api/automations/toggle`

### Stripe
- API version: `'2025-02-24.acacia'`
- Webhook at `/api/webhooks/stripe`
- Events handled: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`

## Design System

### Colors
- Background: `#fafaf9` (main), `#f5f4f0` (surface-secondary/active states)
- Text primary: `#0a0a0a`
- Text muted: `rgba(0,0,0,0.45)`
- Border: `rgba(0,0,0,0.08)` (main), `rgba(0,0,0,0.06)` (subtle)
- Status: green=active, amber=paused, red=error, gray=pending

### Typography
- Font: Geist (`GeistSans` variable `--font-geist-sans`, `GeistMono` for `--font-geist-mono`)
- Imported from `geist` npm package in `app/layout.tsx`

### CSS Classes (globals.css)
- `.card` — white bg, border, rounded-[12px], shadow-sm
- `.btn-primary` — black bg, white text
- `.btn-secondary` — border button
- `.btn-ghost` — transparent
- `.input-base` — form input styling

## Build & Dev

```bash
npm run dev       # localhost:3000
npm run build     # production build check
npx vercel env pull .env.local  # sync env vars from Vercel
```

## Environment Variables
Pulled from Vercel via `npx vercel env pull .env.local`

| Key | Status |
|-----|--------|
| CLERK_SECRET_KEY | ✅ real |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | ✅ real |
| NEXT_PUBLIC_SUPABASE_URL | ✅ real |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ real |
| SUPABASE_SERVICE_ROLE_KEY | ✅ real |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ real |
| STRIPE_SECRET_KEY | ✅ real |
| STRIPE_WEBHOOK_SECRET | ⚠️ placeholder |
| N8N_API_KEY | ⚠️ placeholder |
| N8N_BASE_URL | ⚠️ placeholder |
| RESEND_API_KEY | ⚠️ placeholder (`re_REPLACE_ME`) |
| CLERK_WEBHOOK_SECRET | ⚠️ not yet added |

## Completion Status

### Phase 1 ✅ — Foundation
- Next.js 14 + TypeScript + Tailwind setup
- Clerk auth (sign-in, sign-up pages)
- Supabase schema (deployed to production)
- Tenant middleware with slug resolution
- Hub layout (Sidebar + MobileNav)
- Design system tokens

### Phase 2 ✅ — Core Hub
- Dashboard with real Supabase data + sparklines
- Automations list + detail pages
- Marketplace page with category filters
- Sur mesure (custom request) page
- Onboarding flow → creates tenant + 4 demo automations + 30 executions
- Admin pages (clients, templates, executions)
- All API routes wired up
- Mobile navigation (hamburger drawer)

### Phase 3 🔲 — Marketplace + Stripe
- TemplatePanel full Stripe Checkout flow (infrastructure built, needs end-to-end testing)
- Stripe webhook → automation creation
- Real `STRIPE_WEBHOOK_SECRET` needed

### Phase 4 🔲 — Credentials + n8n
- End-to-end: Vault storage → n8n credential push → workflow activation
- Needs real `N8N_API_KEY` + `N8N_BASE_URL`

### Phase 5 🔲 — Admin + Polish
- Admin interface polish
- Resend email wiring (needs real `RESEND_API_KEY`)
- Clerk webhook registration in Clerk Dashboard
- Full mobile responsive audit
- Rate limiting hardening

## File Structure (key files)

```
acalmy-hub/
├── middleware.ts                    # Tenant + auth middleware
├── lib/
│   ├── supabase/
│   │   ├── types.ts                 # All TypeScript types
│   │   ├── server.ts                # Server Supabase clients
│   │   └── client.ts                # Browser Supabase client
│   ├── tenant.ts                    # getTenantBySlug() with 60s cache
│   ├── n8n.ts                       # n8n API client (server-only)
│   ├── stripe.ts                    # Stripe client + helpers
│   └── utils.ts                     # cn(), formatEur(), formatRelativeTime()...
├── app/
│   ├── layout.tsx                   # ClerkProvider + Geist fonts
│   ├── globals.css                  # CSS vars + utility classes
│   ├── (auth)/                      # sign-in, sign-up
│   ├── onboarding/                  # Onboarding flow
│   ├── [slug]/(hub)/                # Client hub (layout + pages)
│   │   ├── dashboard/page.tsx
│   │   ├── automations/
│   │   ├── marketplace/page.tsx
│   │   └── custom/page.tsx
│   ├── admin/                       # Admin space
│   └── api/                         # API routes
├── components/
│   ├── layout/                      # Sidebar, MobileNav, AdminSidebar
│   ├── ui/                          # StatusDot, StatusBadge, MetricCard, Sparkline, Stepper
│   ├── automations/                 # AutomationCard, ExecutionFeed, AutomationActions
│   ├── marketplace/                 # MarketplaceClient, TemplateCard, TemplatePanel, ConfigForm
│   ├── OnboardingForm.tsx
│   └── CustomRequestForm.tsx
└── supabase/
    └── schema.sql                   # Full DB schema (deployed ✅)
```

## Common Gotchas
- `auth().protect()` not `auth.protect()` (Clerk v5)
- `next.config.mjs` not `.ts` (Next.js 14.2.x limitation)
- Stripe API version must be exact: `'2025-02-24.acacia'`
- Lucide icons in components: cast via `(LucideIcons as unknown as Record<string, ElementType>)`
- Supabase cookie type: explicit `{ name: string; value: string; options?: Record<string, unknown> }[]`
- Admin auth check uses `service_role` client to read `users` table with `clerk_id` match
