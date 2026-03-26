# Acalmy Hub — Checklist mise en production

## Variables d'environnement Vercel

| Variable | Action | Notes |
|----------|--------|-------|
| `RESEND_FROM_EMAIL` | Changer `onboarding@resend.dev` → `noreply@acalmy.com` | Après vérification domaine Resend |
| `RESEND_CONTACT_EMAIL` | Changer `femeniayohan@gmail.com` → `yohan@acalmy.com` | |
| `N8N_BASE_URL` | Renseigner URL instance n8n de référence | Ex: `https://n8n-master.acalmy.com` |
| `N8N_API_KEY` | Renseigner clé API instance n8n de référence | |
| `STRIPE_WEBHOOK_SECRET` | Renseigner secret Stripe webhook réel | Voir §Stripe ci-dessous |
| `CLERK_WEBHOOK_SECRET` | Déjà ajouté ✅ | `whsec_VQw6...` |
| `CRON_SECRET` | Générer une valeur sécurisée | `openssl rand -hex 32` |
| `N8N_WEBHOOK_SECRET` | Générer et configurer dans n8n | Secret partagé entre n8n et le hub |

---

## Resend — Domaine email

1. Aller sur [resend.com/domains](https://resend.com/domains)
2. Ajouter `acalmy.com`
3. Ajouter les 2 records DNS (SPF + DKIM) chez ton registrar
4. Vérifier → statut "Verified"
5. Mettre à jour sur Vercel :
   - `RESEND_FROM_EMAIL` = `noreply@acalmy.com`
   - `RESEND_CONTACT_EMAIL` = `yohan@acalmy.com`

---

## Stripe — Webhook production

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → Webhooks → Add endpoint
2. URL : `https://app.acalmy.com/api/webhooks/stripe`
3. Événements à écouter :
   - `checkout.session.completed`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Copier le **Signing secret** (`whsec_xxx`)
5. Mettre à jour `STRIPE_WEBHOOK_SECRET` sur Vercel

---

## Clerk — Webhook

1. [dashboard.clerk.com](https://dashboard.clerk.com) → Webhooks → Add endpoint
2. URL : `https://app.acalmy.com/api/webhooks/clerk`
3. Événements à écouter :
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Le `CLERK_WEBHOOK_SECRET` est déjà configuré ✅

---

## Stripe — Customer Portal

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Settings → Billing → Customer portal
2. Activer le portail
3. Configurer les options (résiliation, changement de carte, factures)
4. Sauvegarder

---

## DNS & Domaines

| Domaine | Destination | Notes |
|---------|-------------|-------|
| `app.acalmy.com` | Vercel | Déjà configuré si le projet est sur Vercel |
| `admin.acalmy.com` | Vercel | Même déploiement, routé par middleware |
| `n8n-master.acalmy.com` | Serveur Docker | Instance n8n de référence |

---

## n8n — Configuration par client

Pour chaque nouveau client :
1. Créer une instance Docker n8n sur le serveur
2. Récupérer l'URL et générer une clé API (n8n Settings → API)
3. Dans l'admin hub : `/admin/clients/{id}` → section "Instance n8n" → renseigner URL + clé API

---

## Admin — Premier utilisateur admin

Après le premier déploiement, définir ton compte comme admin en Supabase :

```sql
UPDATE users SET role = 'admin' WHERE email = 'yohan@acalmy.com';
```

---

## Supabase Vault

Vérifier que l'extension pgvault est activée sur le projet Supabase de production :
- Supabase Dashboard → Database → Extensions → rechercher `vault` → activer

---

## Vercel Cron

Le rapport mensuel tourne automatiquement le 1er de chaque mois à 8h (UTC).
Configurer `CRON_SECRET` sur Vercel avec une valeur générée :
```bash
openssl rand -hex 32
```

---

## Déploiement

```bash
# Depuis le dossier acalmy-hub
npx vercel --prod
```

Vérifier après déploiement :
- [ ] `app.acalmy.com/sign-in` → page de connexion
- [ ] `app.acalmy.com/{slug}/dashboard` → hub client
- [ ] `admin.acalmy.com` → interface admin
- [ ] Souscrire à un template → Stripe → activation
- [ ] Formulaire sur mesure → email reçu sur yohan@acalmy.com
