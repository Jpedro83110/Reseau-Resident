-- ============================================================
-- CARTE RÉSIDENT — MIGRATION v3.0 COMPLÈTE
-- Exécuter dans Supabase SQL Editor
-- Compatible avec la base existante (ALTER IF NOT EXISTS)
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- NOUVELLES EXTENSIONS
-- ══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════════════════════════
-- NOUVELLES TABLES
-- ══════════════════════════════════════════════════════════════

-- Webhook idempotence
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload         JSONB
);

-- Badges / Gamification
CREATE TABLE IF NOT EXISTS badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,
  nom         TEXT NOT NULL,
  description TEXT,
  icone       TEXT, -- emoji or lucide icon name
  condition_type TEXT NOT NULL, -- 'visites_count', 'commerces_count', 'missions_complete', etc.
  condition_value INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carte_badges (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carte_id  UUID NOT NULL REFERENCES cartes(id) ON DELETE CASCADE,
  badge_id  UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(carte_id, badge_id)
);

-- Missions / Défis
CREATE TABLE IF NOT EXISTS missions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id    UUID REFERENCES villes(id),
  titre       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'decouverte', -- 'decouverte', 'frequence', 'saison', 'evenement'
  condition   JSONB NOT NULL DEFAULT '{}', -- ex: {"min_commerces": 5, "categorie": "Restaurant"}
  reward_text TEXT, -- ex: "Badge Explorateur"
  badge_id    UUID REFERENCES badges(id),
  date_debut  DATE,
  date_fin    DATE,
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carte_missions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carte_id    UUID NOT NULL REFERENCES cartes(id) ON DELETE CASCADE,
  mission_id  UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  progression INTEGER NOT NULL DEFAULT 0,
  complete    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(carte_id, mission_id)
);

-- Parrainage
CREATE TABLE IF NOT EXISTS parrainages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parrain_carte_id UUID NOT NULL REFERENCES cartes(id) ON DELETE CASCADE,
  filleul_carte_id UUID REFERENCES cartes(id) ON DELETE SET NULL,
  code_parrainage  TEXT NOT NULL UNIQUE DEFAULT upper(encode(gen_random_bytes(4), 'hex')),
  statut           TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'utilise', 'recompense')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Offres dynamiques / saisonnières
CREATE TABLE IF NOT EXISTS offres (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  ville_id    UUID NOT NULL REFERENCES villes(id),
  titre       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'permanente', -- 'permanente', 'ponctuelle', 'saisonniere', 'evenement'
  date_debut  DATE,
  date_fin    DATE,
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Événements locaux
CREATE TABLE IF NOT EXISTS evenements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id    UUID NOT NULL REFERENCES villes(id),
  titre       TEXT NOT NULL,
  description TEXT,
  lieu        TEXT,
  date_debut  TIMESTAMPTZ NOT NULL,
  date_fin    TIMESTAMPTZ,
  image_url   TEXT,
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- ALTER TABLES EXISTANTES (ajouts non-destructifs)
-- ══════════════════════════════════════════════════════════════

-- Cartes: groupe pour couple, confirmation tracking
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS commande_groupe_id UUID;
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS ordre_titulaire INTEGER DEFAULT 1;
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;

-- Commerces: coordonnées GPS pour cartographie
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS horaires TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS email_contact TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS desactivation_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex');

-- Commercants inscrits: SIRET
ALTER TABLE commercants_inscrits ADD COLUMN IF NOT EXISTS siret TEXT;

-- Villes: données enrichies pour multi-villes
ALTER TABLE villes ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE villes ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE villes ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE villes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE villes ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Visites: source tracking
DO $$ BEGIN
  ALTER TABLE visites ADD COLUMN source TEXT NOT NULL DEFAULT 'qr'
    CHECK (source IN ('qr', 'code_mensuel', 'carnet', 'telephone', 'nfc', 'admin'));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════
-- INDEX (nouveaux)
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_stripe_events_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_carte_badges_carte ON carte_badges(carte_id);
CREATE INDEX IF NOT EXISTS idx_carte_missions_carte ON carte_missions(carte_id);
CREATE INDEX IF NOT EXISTS idx_parrainages_code ON parrainages(code_parrainage);
CREATE INDEX IF NOT EXISTS idx_parrainages_parrain ON parrainages(parrain_carte_id);
CREATE INDEX IF NOT EXISTS idx_offres_commerce ON offres(commerce_id);
CREATE INDEX IF NOT EXISTS idx_offres_ville ON offres(ville_id);
CREATE INDEX IF NOT EXISTS idx_offres_actif ON offres(actif) WHERE actif = TRUE;
CREATE INDEX IF NOT EXISTS idx_evenements_ville ON evenements(ville_id);
CREATE INDEX IF NOT EXISTS idx_cartes_groupe ON cartes(commande_groupe_id) WHERE commande_groupe_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visites_source ON visites(source);
CREATE INDEX IF NOT EXISTS idx_commerces_coords ON commerces(latitude, longitude) WHERE latitude IS NOT NULL;

-- ══════════════════════════════════════════════════════════════
-- RPC SÉCURISÉES
-- ══════════════════════════════════════════════════════════════

-- 1. Scan context (remplace la logique fragile front)
CREATE OR REPLACE FUNCTION get_scan_context(p_qr_token TEXT)
RETURNS JSON AS $$
DECLARE
  v_carte RECORD;
  v_commerces JSON;
BEGIN
  SELECT c.id, c.numero, c.prenom, c.nom_titulaire, c.statut, c.date_expiration,
         c.formule, c.ville_id, v.nom AS ville_nom, v.slug AS ville_slug
  INTO v_carte
  FROM cartes c JOIN villes v ON v.id = c.ville_id
  WHERE c.qr_token = p_qr_token;

  IF NOT FOUND THEN RETURN json_build_object('error', 'carte_not_found'); END IF;
  IF v_carte.statut != 'active' THEN RETURN json_build_object('error', 'carte_inactive', 'statut', v_carte.statut); END IF;
  IF v_carte.date_expiration < NOW() THEN RETURN json_build_object('error', 'carte_expiree'); END IF;

  SELECT json_agg(json_build_object('id', co.id, 'nom', co.nom, 'categorie', co.categorie, 'avantage', co.avantage))
  INTO v_commerces
  FROM commerces co WHERE co.ville_id = v_carte.ville_id AND co.actif = TRUE;

  RETURN json_build_object(
    'carte', json_build_object(
      'id', v_carte.id, 'numero', v_carte.numero, 'prenom', v_carte.prenom,
      'nom', v_carte.nom_titulaire, 'formule', v_carte.formule,
      'ville_nom', v_carte.ville_nom, 'date_expiration', v_carte.date_expiration
    ),
    'commerces', COALESCE(v_commerces, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Create visit (secure, with anti-doublon)
CREATE OR REPLACE FUNCTION create_visit_secure(p_qr_token TEXT, p_commerce_id UUID, p_source TEXT DEFAULT 'qr')
RETURNS JSON AS $$
DECLARE
  v_carte RECORD;
  v_commerce RECORD;
  v_recent INTEGER;
  v_visit_id UUID;
BEGIN
  -- Validate carte
  SELECT c.id, c.statut, c.date_expiration, c.ville_id
  INTO v_carte FROM cartes c WHERE c.qr_token = p_qr_token;

  IF NOT FOUND THEN RETURN json_build_object('error', 'carte_not_found'); END IF;
  IF v_carte.statut != 'active' THEN RETURN json_build_object('error', 'carte_inactive'); END IF;
  IF v_carte.date_expiration < NOW() THEN RETURN json_build_object('error', 'carte_expiree'); END IF;

  -- Validate commerce
  SELECT co.id, co.ville_id, co.actif INTO v_commerce FROM commerces co WHERE co.id = p_commerce_id;
  IF NOT FOUND OR NOT v_commerce.actif THEN RETURN json_build_object('error', 'commerce_invalide'); END IF;
  IF v_commerce.ville_id != v_carte.ville_id THEN RETURN json_build_object('error', 'ville_mismatch'); END IF;

  -- Anti-doublon: max 1 visite par carte par commerce par 2h
  SELECT count(*) INTO v_recent FROM visites
  WHERE carte_id = v_carte.id AND commerce_id = p_commerce_id
    AND date_visite > NOW() - INTERVAL '2 hours';
  IF v_recent > 0 THEN RETURN json_build_object('error', 'doublon', 'message', 'Visite déjà enregistrée récemment'); END IF;

  -- Insert
  INSERT INTO visites (carte_id, commerce_id, ville_id, source)
  VALUES (v_carte.id, p_commerce_id, v_carte.ville_id, p_source)
  RETURNING id INTO v_visit_id;

  RETURN json_build_object('success', true, 'visit_id', v_visit_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Admin: approve commercant
CREATE OR REPLACE FUNCTION approve_commercant_request(p_request_id UUID)
RETURNS JSON AS $$
DECLARE
  v_req RECORD;
  v_ville_id UUID;
  v_commerce_id UUID;
BEGIN
  SELECT * INTO v_req FROM commercants_inscrits WHERE id = p_request_id AND statut = 'en_attente';
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;

  -- Get or create ville
  SELECT id INTO v_ville_id FROM villes WHERE lower(nom) = lower(v_req.nom_ville) LIMIT 1;
  IF v_ville_id IS NULL THEN
    INSERT INTO villes (slug, nom, departement, statut, description)
    VALUES (
      lower(replace(replace(replace(replace(v_req.nom_ville,' ','-'),'''',''),'é','e'),'è','e')),
      v_req.nom_ville, v_req.departement, 'bientot', 'Activée par le premier commerce.'
    ) ON CONFLICT (slug) DO UPDATE SET nom = EXCLUDED.nom
    RETURNING id INTO v_ville_id;
  END IF;

  -- Create commerce
  INSERT INTO commerces (ville_id, nom, categorie, avantage, adresse, telephone, email_contact, actif)
  VALUES (v_ville_id, v_req.nom_commerce, v_req.categorie, v_req.avantage_propose, v_req.adresse, v_req.telephone, v_req.email, TRUE)
  RETURNING id INTO v_commerce_id;

  -- Update request
  UPDATE commercants_inscrits SET statut = 'valide' WHERE id = p_request_id;

  -- Auto-activate ville
  UPDATE villes SET statut = 'actif' WHERE id = v_ville_id AND statut = 'bientot';

  RETURN json_build_object('success', true, 'commerce_id', v_commerce_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Admin: refuse commercant
CREATE OR REPLACE FUNCTION refuse_commercant_request(p_request_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE commercants_inscrits SET statut = 'refuse' WHERE id = p_request_id AND statut = 'en_attente';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Top clients by ville (server-side aggregation)
CREATE OR REPLACE FUNCTION get_top_clients_by_ville(p_ville_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS JSON AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_data) FROM (
      SELECT c.id, c.numero, c.prenom, c.nom_titulaire, count(v.id)::INTEGER AS visites
      FROM visites v
      JOIN cartes c ON c.id = v.carte_id
      WHERE v.ville_id = p_ville_id
      GROUP BY c.id, c.numero, c.prenom, c.nom_titulaire
      ORDER BY visites DESC
      LIMIT p_limit
    ) row_data
  ), '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. Admin dashboard (enriched)
CREATE OR REPLACE FUNCTION get_admin_dashboard(p_ville_slug TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_ville_id UUID;
BEGIN
  SELECT id INTO v_ville_id FROM villes WHERE slug = p_ville_slug;
  IF v_ville_id IS NULL THEN RETURN NULL; END IF;

  SELECT json_build_object(
    'ville', json_build_object(
      'id', v.id, 'nom', v.nom, 'slug', v.slug,
      'cartes_actives', v.cartes_actives,
      'commerces_partenaires', v.commerces_partenaires,
      'visites_total', v.visites_total
    ),
    'commerces', COALESCE((
      SELECT json_agg(json_build_object(
        'id', c.id, 'nom', c.nom, 'categorie', c.categorie,
        'avantage', c.avantage, 'visites', c.visites, 'actif', c.actif
      ) ORDER BY c.visites DESC)
      FROM commerces c WHERE c.ville_id = v.id
    ), '[]'::json),
    'demandes_en_attente', (SELECT count(*)::INTEGER FROM commercants_inscrits WHERE statut = 'en_attente'),
    'cartes_total', (SELECT count(*)::INTEGER FROM cartes WHERE ville_id = v.id AND statut = 'active'),
    'cartes_annulees', (SELECT count(*)::INTEGER FROM cartes WHERE ville_id = v.id AND statut = 'annulee'),
    'revenus_cartes', COALESCE((
      SELECT sum(CASE formule WHEN 'individuel' THEN 10 WHEN 'couple' THEN 15 WHEN 'secondaire' THEN 20 END)::INTEGER
      FROM cartes WHERE ville_id = v.id AND statut = 'active'
    ), 0),
    'visites_par_source', COALESCE((
      SELECT json_agg(json_build_object('source', vis.source, 'count', vis.cnt))
      FROM (SELECT source, count(*)::INTEGER as cnt FROM visites WHERE ville_id = v.id GROUP BY source ORDER BY cnt DESC) vis
    ), '[]'::json)
  ) INTO result FROM villes v WHERE v.id = v_ville_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. Activate carte after webhook (server-side only)
CREATE OR REPLACE FUNCTION activate_carte_after_payment(p_carte_id UUID, p_stripe_pi TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE cartes
  SET statut = 'active',
      stripe_payment_intent_id = p_stripe_pi,
      payment_confirmed_at = NOW()
  WHERE id = p_carte_id
    AND statut = 'en_attente_paiement';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Stats mensuelles (keep existing)
CREATE OR REPLACE FUNCTION get_stats_mensuelles(p_ville_id UUID)
RETURNS TABLE (mois TEXT, visites BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT to_char(date_trunc('month', v.date_visite), 'Mon') AS mois, count(*)::BIGINT AS visites
  FROM visites v WHERE v.ville_id = p_ville_id AND v.date_visite >= NOW() - INTERVAL '6 months'
  GROUP BY date_trunc('month', v.date_visite) ORDER BY date_trunc('month', v.date_visite);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 9. Resilier carte (keep existing)
CREATE OR REPLACE FUNCTION resilier_carte(p_numero TEXT, p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE cartes SET statut = 'annulee', updated_at = NOW()
  WHERE numero = p_numero AND email = p_email AND statut = 'active';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Retirer commerce (keep existing)
CREATE OR REPLACE FUNCTION retirer_commerce(p_commerce_id UUID, p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE commerces SET actif = FALSE
  WHERE id = p_commerce_id AND desactivation_token = p_token AND actif = TRUE;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════
-- TRIGGERS (consolidation)
-- ══════════════════════════════════════════════════════════════

-- updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_cartes_updated_at ON cartes;
CREATE TRIGGER trg_cartes_updated_at BEFORE UPDATE ON cartes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Carte counters
CREATE OR REPLACE FUNCTION sync_cartes_actives() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.statut = 'active' THEN
    UPDATE villes SET cartes_actives = cartes_actives + 1 WHERE id = NEW.ville_id;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.statut = 'active' AND (OLD.statut IS DISTINCT FROM 'active') THEN
    UPDATE villes SET cartes_actives = cartes_actives + 1 WHERE id = NEW.ville_id;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.statut = 'active' AND NEW.statut IN ('expiree', 'annulee') THEN
    UPDATE villes SET cartes_actives = GREATEST(cartes_actives - 1, 0) WHERE id = NEW.ville_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_sync_cartes_actives ON cartes;
CREATE TRIGGER trg_sync_cartes_actives AFTER INSERT OR UPDATE ON cartes FOR EACH ROW EXECUTE FUNCTION sync_cartes_actives();

-- Visit counters
CREATE OR REPLACE FUNCTION sync_visites_compteurs() RETURNS TRIGGER AS $$
BEGIN
  UPDATE villes SET visites_total = visites_total + 1 WHERE id = NEW.ville_id;
  UPDATE commerces SET visites = visites + 1 WHERE id = NEW.commerce_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_sync_visites ON visites;
CREATE TRIGGER trg_sync_visites AFTER INSERT ON visites FOR EACH ROW EXECUTE FUNCTION sync_visites_compteurs();

-- Commerce counters
CREATE OR REPLACE FUNCTION sync_commerces_partenaires() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.actif = TRUE THEN
    UPDATE villes SET commerces_partenaires = commerces_partenaires + 1 WHERE id = NEW.ville_id;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.actif = TRUE AND OLD.actif = FALSE THEN
    UPDATE villes SET commerces_partenaires = commerces_partenaires + 1 WHERE id = NEW.ville_id;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.actif = FALSE AND OLD.actif = TRUE THEN
    UPDATE villes SET commerces_partenaires = GREATEST(commerces_partenaires - 1, 0) WHERE id = NEW.ville_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_sync_commerces_partenaires ON commerces;
CREATE TRIGGER trg_sync_commerces_partenaires AFTER INSERT OR UPDATE ON commerces FOR EACH ROW EXECUTE FUNCTION sync_commerces_partenaires();

-- Auto-activate ville
CREATE OR REPLACE FUNCTION auto_activer_ville() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actif = TRUE THEN
    UPDATE villes SET statut = 'actif' WHERE id = NEW.ville_id AND statut = 'bientot';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_auto_activer_ville ON commerces;
CREATE TRIGGER trg_auto_activer_ville AFTER INSERT OR UPDATE ON commerces FOR EACH ROW EXECUTE FUNCTION auto_activer_ville();

-- ══════════════════════════════════════════════════════════════
-- RLS — HARDENED
-- ══════════════════════════════════════════════════════════════

-- Helper
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN RETURN EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()); END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
DO $$ 
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'admins','villes','commerces','cartes','visites','commercants_inscrits',
    'liste_attente','cartes_cadeaux','utilisations_cadeaux','codes_mensuels',
    'stripe_webhook_events','badges','carte_badges','missions','carte_missions',
    'parrainages','offres','evenements'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Drop all existing policies to rebuild clean
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- VILLES: public read
CREATE POLICY "villes_read" ON villes FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "villes_service" ON villes FOR ALL TO service_role USING (TRUE);

-- COMMERCES: public read active, admin all
CREATE POLICY "commerces_read" ON commerces FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "commerces_service" ON commerces FOR ALL TO service_role USING (TRUE);

-- CARTES: insert (en_attente only), select own or pending, service all
CREATE POLICY "cartes_insert" ON cartes FOR INSERT TO anon, authenticated WITH CHECK (statut = 'en_attente_paiement');
CREATE POLICY "cartes_read" ON cartes FOR SELECT TO anon, authenticated USING (statut = 'en_attente_paiement');
CREATE POLICY "cartes_service" ON cartes FOR ALL TO service_role USING (TRUE);

-- VISITES: NO direct insert from anon (use RPC), read via RPC
CREATE POLICY "visites_service" ON visites FOR ALL TO service_role USING (TRUE);

-- COMMERCANTS_INSCRITS: insert public, read public (for RETURNING), service all
CREATE POLICY "ci_insert" ON commercants_inscrits FOR INSERT TO anon, authenticated WITH CHECK (statut = 'en_attente');
CREATE POLICY "ci_read" ON commercants_inscrits FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "ci_service" ON commercants_inscrits FOR ALL TO service_role USING (TRUE);

-- LISTE_ATTENTE
CREATE POLICY "la_insert" ON liste_attente FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "la_service" ON liste_attente FOR ALL TO service_role USING (TRUE);

-- ADMINS
CREATE POLICY "admins_self" ON admins FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "admins_service" ON admins FOR ALL TO service_role USING (TRUE);

-- STRIPE WEBHOOK EVENTS: service only
CREATE POLICY "swe_service" ON stripe_webhook_events FOR ALL TO service_role USING (TRUE);

-- BADGES: public read
CREATE POLICY "badges_read" ON badges FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "badges_service" ON badges FOR ALL TO service_role USING (TRUE);

-- CARTE_BADGES: public read
CREATE POLICY "cb_read" ON carte_badges FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "cb_service" ON carte_badges FOR ALL TO service_role USING (TRUE);

-- MISSIONS: public read active
CREATE POLICY "missions_read" ON missions FOR SELECT TO anon, authenticated USING (actif = TRUE);
CREATE POLICY "missions_service" ON missions FOR ALL TO service_role USING (TRUE);

-- CARTE_MISSIONS
CREATE POLICY "cm_read" ON carte_missions FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "cm_service" ON carte_missions FOR ALL TO service_role USING (TRUE);

-- PARRAINAGES
CREATE POLICY "par_read" ON parrainages FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "par_service" ON parrainages FOR ALL TO service_role USING (TRUE);

-- OFFRES: public read active
CREATE POLICY "offres_read" ON offres FOR SELECT TO anon, authenticated USING (actif = TRUE);
CREATE POLICY "offres_service" ON offres FOR ALL TO service_role USING (TRUE);

-- EVENEMENTS: public read active
CREATE POLICY "evt_read" ON evenements FOR SELECT TO anon, authenticated USING (actif = TRUE);
CREATE POLICY "evt_service" ON evenements FOR ALL TO service_role USING (TRUE);

-- CARTES_CADEAUX
CREATE POLICY "cc_insert" ON cartes_cadeaux FOR INSERT TO anon, authenticated WITH CHECK (statut = 'en_attente_paiement');
CREATE POLICY "cc_read" ON cartes_cadeaux FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "cc_service" ON cartes_cadeaux FOR ALL TO service_role USING (TRUE);

-- UTILISATIONS_CADEAUX
CREATE POLICY "uc_service" ON utilisations_cadeaux FOR ALL TO service_role USING (TRUE);

-- CODES_MENSUELS
CREATE POLICY "cm2_read" ON codes_mensuels FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "cm2_service" ON codes_mensuels FOR ALL TO service_role USING (TRUE);

-- ══════════════════════════════════════════════════════════════
-- SEED BADGES
-- ══════════════════════════════════════════════════════════════
INSERT INTO badges (slug, nom, description, icone, condition_type, condition_value) VALUES
  ('premiere_visite', 'Première visite', 'Bienvenue ! Votre première visite enregistrée.', '🎉', 'visites_count', 1),
  ('explorateur', 'Explorateur', 'Vous avez visité 5 commerces différents.', '🧭', 'commerces_count', 5),
  ('habitue', 'Habitué', '10 visites enregistrées. Vous êtes un pilier !', '⭐', 'visites_count', 10),
  ('ambassadeur', 'Ambassadeur', '25 visites. Votre ville vous remercie.', '🏅', 'visites_count', 25),
  ('legende', 'Légende locale', '50 visites. Vous êtes une légende !', '🏆', 'visites_count', 50),
  ('parrain', 'Parrain', 'Vous avez parrainé votre premier filleul.', '🤝', 'parrainages_count', 1)
ON CONFLICT (slug) DO NOTHING;

SELECT 'Migration v3.0 complète' AS status;
