-- ═══════════════════════════════════════════════════════════════════════════
-- Acalmy Hub — Schéma Supabase complet
-- Version : 1.0
-- Exécuter dans le SQL Editor de Supabase (ordre respecté)
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note : activer l'extension Vault via Supabase Dashboard > Database > Extensions > vault

-- ─── Tables ──────────────────────────────────────────────────────────────────

-- Tenants (un par client Acalmy)
CREATE TABLE IF NOT EXISTS tenants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              TEXT UNIQUE NOT NULL,
  company_name      TEXT NOT NULL,
  plan              TEXT NOT NULL DEFAULT 'starter'
                    CHECK (plan IN ('infrastructure', 'starter')),
  mrr               INTEGER NOT NULL DEFAULT 0,  -- en centimes
  stripe_customer_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- Utilisateurs clients (liés à Clerk)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  clerk_user_id   TEXT UNIQUE NOT NULL,
  email           TEXT NOT NULL,
  name            TEXT,
  role            TEXT NOT NULL DEFAULT 'client'
                  CHECK (role IN ('client', 'admin')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);

-- Automatisations livrées par Acalmy
CREATE TABLE IF NOT EXISTS automations (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  description             TEXT,
  category                TEXT NOT NULL
                          CHECK (category IN ('crm', 'marketing', 'reporting', 'ia')),
  n8n_workflow_id         TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('active', 'paused', 'error', 'pending')),
  credentials_configured  BOOLEAN NOT NULL DEFAULT FALSE,
  config                  JSONB,
  activated_at            TIMESTAMPTZ,
  monthly_runs            INTEGER NOT NULL DEFAULT 0,
  last_run_at             TIMESTAMPTZ,
  last_run_status         TEXT CHECK (last_run_status IN ('success', 'error')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_tenant_id ON automations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automations_status ON automations(status);
CREATE INDEX IF NOT EXISTS idx_automations_tenant_status ON automations(tenant_id, status);

-- Exécutions (feed d'activité)
CREATE TABLE IF NOT EXISTS executions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id   UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status          TEXT NOT NULL CHECK (status IN ('success', 'error')),
  ran_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms     INTEGER,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_tenant_id ON executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_executions_automation_id ON executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_executions_ran_at ON executions(ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_tenant_ran_at ON executions(tenant_id, ran_at DESC);

-- Templates marketplace
CREATE TABLE IF NOT EXISTS marketplace_templates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL
                    CHECK (category IN ('crm', 'marketing', 'reporting', 'ia')),
  price_monthly     INTEGER NOT NULL, -- en centimes (ex: 4900 = 49,00€)
  stripe_price_id   TEXT,
  config_schema     JSONB NOT NULL DEFAULT '{"fields": []}',
  n8n_template_id   TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  icon_name         TEXT NOT NULL DEFAULT 'Zap',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_templates_active ON marketplace_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_category ON marketplace_templates(category);

-- Abonnements marketplace
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id               UUID NOT NULL REFERENCES marketplace_templates(id),
  automation_id             UUID REFERENCES automations(id),
  stripe_subscription_id    TEXT UNIQUE,
  status                    TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'canceled', 'past_due')),
  started_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  canceled_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_template_id ON subscriptions(template_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically (no policy needed for service_role)

-- Tenants : lecture uniquement pour les utilisateurs de ce tenant
CREATE POLICY "tenants_read_own" ON tenants
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Users : lecture de son propre enregistrement
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (
    clerk_user_id = auth.jwt() ->> 'sub'
  );

-- Automations : lecture des automatisations de son tenant
CREATE POLICY "automations_read_own_tenant" ON automations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Executions : lecture des exécutions de son tenant
CREATE POLICY "executions_read_own_tenant" ON executions
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Marketplace templates : lecture par tout utilisateur authentifié (templates publics)
CREATE POLICY "marketplace_templates_read_active" ON marketplace_templates
  FOR SELECT USING (
    is_active = TRUE AND auth.role() = 'authenticated'
  );

-- Subscriptions : lecture des abonnements de son tenant
CREATE POLICY "subscriptions_read_own_tenant" ON subscriptions
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- ─── Fonctions utilitaires ────────────────────────────────────────────────────

-- Incrémente le compteur d'exécutions et met à jour last_run_at / last_run_status
CREATE OR REPLACE FUNCTION increment_automation_runs(
  p_automation_id UUID,
  p_tenant_id     UUID,
  p_status        TEXT
) RETURNS VOID AS $$
DECLARE
  v_current_month_start TIMESTAMPTZ;
  v_last_month_start    TIMESTAMPTZ;
BEGIN
  v_current_month_start := DATE_TRUNC('month', NOW());

  -- Reset monthly_runs if we're in a new month
  UPDATE automations
  SET
    monthly_runs    = CASE
                        WHEN last_run_at IS NULL OR last_run_at < v_current_month_start
                        THEN 1
                        ELSE monthly_runs + 1
                      END,
    last_run_at     = NOW(),
    last_run_status = p_status,
    status          = CASE
                        WHEN p_status = 'error' AND status = 'active' THEN 'error'
                        WHEN p_status = 'success' AND status = 'error' THEN 'active'
                        ELSE status
                      END
  WHERE id = p_automation_id
    AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Statistiques journalières pour le sparkline (30 derniers jours)
CREATE OR REPLACE FUNCTION get_daily_runs(p_tenant_id UUID)
RETURNS TABLE(day DATE, run_count BIGINT, success_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('day', ran_at)::DATE     AS day,
    COUNT(*)                             AS run_count,
    COUNT(*) FILTER (WHERE status = 'success') AS success_count
  FROM executions
  WHERE tenant_id = p_tenant_id
    AND ran_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', ran_at)
  ORDER BY day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Statistiques mensuelles comparatives
CREATE OR REPLACE FUNCTION get_monthly_comparison(p_tenant_id UUID)
RETURNS TABLE(
  this_month_runs   BIGINT,
  last_month_runs   BIGINT,
  this_month_errors BIGINT,
  avg_duration_ms   NUMERIC
) AS $$
DECLARE
  v_month_start      TIMESTAMPTZ := DATE_TRUNC('month', NOW());
  v_last_month_start TIMESTAMPTZ := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
  v_last_month_end   TIMESTAMPTZ := DATE_TRUNC('month', NOW()) - INTERVAL '1 second';
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM executions
     WHERE tenant_id = p_tenant_id AND ran_at >= v_month_start) AS this_month_runs,
    (SELECT COUNT(*) FROM executions
     WHERE tenant_id = p_tenant_id
       AND ran_at >= v_last_month_start AND ran_at <= v_last_month_end) AS last_month_runs,
    (SELECT COUNT(*) FROM executions
     WHERE tenant_id = p_tenant_id AND ran_at >= v_month_start
       AND status = 'error') AS this_month_errors,
    (SELECT AVG(duration_ms) FROM executions
     WHERE tenant_id = p_tenant_id AND ran_at >= v_month_start
       AND duration_ms IS NOT NULL) AS avg_duration_ms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Données de démonstration (exécuter uniquement en dev/staging) ────────────
-- Décommentez le bloc suivant pour insérer des données de test

/*
-- Tenant démo
INSERT INTO tenants (id, slug, company_name, plan, mrr)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo-client', 'Demo SAS', 'infrastructure', 149900);

-- Template marketplace démo
INSERT INTO marketplace_templates (name, description, category, price_monthly, icon_name, config_schema)
VALUES
  (
    'Qualification leads HubSpot',
    'Qualifiez automatiquement vos leads entrants depuis vos formulaires et enrichissez vos fiches HubSpot.',
    'crm',
    4900,
    'Users',
    '{"fields": [{"key": "hubspot_api_key", "label": "Clé API HubSpot", "hint": "Permet à Acalmy de lire vos contacts. Accès lecture seule uniquement.", "type": "password", "required": true}, {"key": "form_webhook_url", "label": "URL de votre formulaire", "hint": "L URL publique de votre formulaire Typeform ou Tally.", "type": "url", "required": true}]}'
  ),
  (
    'Rapport hebdo Notion',
    'Recevez chaque lundi un résumé de vos KPIs dans une page Notion dédiée.',
    'reporting',
    2900,
    'BarChart3',
    '{"fields": [{"key": "notion_token", "label": "Token d intégration Notion", "hint": "Créez une intégration Notion en lecture/écriture sur votre workspace.", "type": "password", "required": true}, {"key": "notion_db_id", "label": "ID de la base de données Notion", "hint": "L identifiant de la page Notion où envoyer les rapports.", "type": "text", "required": true}]}'
  ),
  (
    'Alertes Slack pipeline',
    'Recevez une alerte Slack instantanée à chaque nouvelle opportunité qualifiée dans votre CRM.',
    'marketing',
    1900,
    'Bell',
    '{"fields": [{"key": "slack_webhook", "label": "Webhook Slack", "hint": "Le webhook de votre channel Slack dédié aux alertes commerciales.", "type": "url", "required": true}]}'
  );
*/
