# Acalmy Hub — Guide Marketplace (interne)

## Vue d'ensemble

La marketplace permet à chaque client de souscrire à des automatisations en libre-service.
Le flow complet est : **Stripe → Vault → n8n** — le client ne voit jamais n8n.

---

## Architecture par client

Chaque client a sa propre instance n8n (Docker). L'admin renseigne l'URL et la clé API
depuis `/admin/clients/{id}` → section "Instance n8n".

```
Client A → n8n-client-a.acalmy.com  (Docker #1)
Client B → n8n-client-b.acalmy.com  (Docker #2)
```

---

## Ajouter un nouveau template

### Étape 1 — Construire le workflow dans n8n

1. Ouvrir l'instance n8n de référence (ou une instance de test)
2. Construire le workflow
3. Récupérer l'**ID du workflow** dans l'URL : `/workflow/ABC123`
4. Exporter le JSON : `⋯ → Download`

> **Important** : les credentials dans le workflow de référence doivent utiliser
> des variables d'environnement ou être vides — ils seront remplacés par ceux du client.

### Étape 2 — Créer le prix Stripe

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Products → Add product
2. Renseigner nom + description
3. Add price → Recurring → Monthly → montant en euros
4. Copier le **Price ID** (`price_xxx`)

### Étape 3 — Insérer dans Supabase

Dans **SQL Editor** :

```sql
INSERT INTO marketplace_templates (
  name,
  description,
  category,         -- crm | marketing | reporting | ia
  icon_name,        -- nom d'une icône Lucide (ex: "Zap", "Mail", "Users")
  price_monthly,    -- en centimes (ex: 4900 = 49€)
  stripe_price_id,  -- 'price_xxx'
  n8n_template_id,  -- ID workflow n8n de référence
  config_schema,    -- champs à demander au client (voir ci-dessous)
  is_active         -- true pour visible, false pour masqué
) VALUES (
  'Nom du template',
  'Description visible par le client.',
  'crm',
  'Zap',
  4900,
  'price_xxx',
  'workflow-id-n8n',
  '{
    "fields": [
      {
        "key": "api_key",
        "label": "Clé API",
        "type": "password",
        "required": true,
        "placeholder": "sk-...",
        "hint": "Paramètres → API → Créer une clé"
      }
    ]
  }',
  true
);
```

---

## Types de champs config_schema

| type       | Usage                          | Exemple              |
|------------|-------------------------------|----------------------|
| `text`     | Texte libre                   | Nom de workspace     |
| `password` | Clé API, token secret         | `sk-xxx`             |
| `email`    | Adresse email                 | Contact de rapport   |
| `url`      | URL webhook ou endpoint       | Webhook Slack        |
| `oauth`    | Connexion OAuth (voir §OAuth) | Google, HubSpot...   |

---

## OAuth (connexion en un clic)

Pour les services qui supportent OAuth (Google, HubSpot, Slack avec OAuth, Notion...),
le client peut se connecter en un clic au lieu de copier-coller des clés API.

### Comment ça marche

1. Le champ config_schema a `"type": "oauth"` avec un `"provider"` (ex: `"google"`)
2. Le client clique "Connecter avec Google"
3. Popup OAuth → consentement → token renvoyé
4. Le token est stocké dans Vault comme les autres credentials

### Providers supportés (prévu)

- `google` — Google Sheets, Gmail, Google Calendar
- `hubspot` — CRM HubSpot
- `notion` — Notion
- `slack` — Slack (OAuth app)
- `airtable` — Airtable

> ⚠️ L'OAuth nécessite une app configurée côté provider (Client ID + Secret).
> Ces clés sont côté Acalmy (dans les env vars), pas côté client.

---

## État des templates actuels

| Template                     | n8n réel | Stripe réel | Statut       |
|-----------------------------|----------|-------------|--------------|
| Alertes Slack (Webhook)     | ✅        | ✅           | Fonctionnel  |
| Sync HubSpot → Notion       | ❌        | ⚠️ à créer  | À construire |
| Rapport hebdo Google Sheets | ❌        | ⚠️ à créer  | À construire |
| Agent IA support client     | ❌        | ⚠️ à créer  | À construire |

---

## Flow technique complet (rappel)

```
1. Client → Marketplace → clique "Souscrire"
2. → /api/marketplace/checkout → Stripe Checkout Session
3. → Client paye → Stripe webhook → /api/webhooks/stripe
4.   → Crée automation (status: pending) + subscription en base
5. → Client redirigé vers marketplace → ConfigForm s'ouvre
6. → Client remplit les champs (ou connecte OAuth)
7. → POST /api/credentials/store
8.   → Credentials chiffrés dans Supabase Vault (AES-256)
9.   → automation.credentials_configured = true
10. → POST /api/automations/activate
11.   → Lit credentials depuis Vault
12.   → Clone workflow n8n_template_id dans l'instance n8n du client
13.   → Injecte les credentials dans le workflow cloné
14.   → Active le workflow
15.   → automation.status = 'active'
```

---

## Désactiver un template

```sql
UPDATE marketplace_templates SET is_active = false WHERE id = 'xxx';
```

Les clients déjà abonnés gardent leur automatisation active.

---

## Variables d'environnement nécessaires

| Variable           | Description                          |
|--------------------|--------------------------------------|
| `N8N_BASE_URL`     | URL instance n8n de référence        |
| `N8N_API_KEY`      | Clé API instance n8n de référence    |
| Par client en base | `tenants.n8n_url` + `tenants.n8n_api_key` |
