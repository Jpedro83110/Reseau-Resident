-- ══════════════════════════════════════════════════════════════════════
-- RÉSEAUX-RÉSIDENT — SQL COMPLET À EXÉCUTER DANS SUPABASE
-- ══════════════════════════════════════════════════════════════════════
-- Ce fichier contient TOUT le SQL nécessaire pour que le site fonctionne.
-- Il est idempotent (IF NOT EXISTS partout) — vous pouvez le relancer sans risque.
--
-- INSTRUCTIONS :
-- 1. Ouvrez Supabase Dashboard → SQL Editor
-- 2. Copiez-collez CE FICHIER ENTIER
-- 3. Cliquez "Run"
-- 4. Vérifiez que tout passe sans erreur
--
-- Contenu :
-- PARTIE 1 : Tables de base (v2.0) — admins, villes, commerces, cartes, visites, etc.
-- PARTIE 2 : Extensions v3 — stripe_webhook_events, badges, RPCs scan/admin/stats
-- PARTIE 3 : RPCs v3.1 — espace résident & commerçant
-- PARTIE 4 : Migration v4 — profiles, offres, associations, projets, mairie, favoris, etc.
-- ══════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- PARTIE 1 : TABLES DE BASE (v2.0)
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ADMINS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── VILLES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS villes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT NOT NULL UNIQUE,
  nom                   TEXT NOT NULL,
  departement           TEXT,
  region                TEXT,
  statut                TEXT NOT NULL DEFAULT 'bientot' CHECK (statut IN ('actif', 'bientot')),
  description           TEXT,
  cartes_actives        INTEGER NOT NULL DEFAULT 0,
  commerces_partenaires INTEGER NOT NULL DEFAULT 0,
  visites_total         INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COMMERCES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commerces (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id   UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  nom        TEXT NOT NULL,
  categorie  TEXT NOT NULL,
  avantage   TEXT NOT NULL,
  adresse    TEXT,
  telephone  TEXT,
  email      TEXT,
  actif      BOOLEAN NOT NULL DEFAULT TRUE,
  visites    INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CARTES RÉSIDENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cartes (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero                   TEXT NOT NULL UNIQUE,
  qr_token                 TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ville_id                 UUID NOT NULL REFERENCES villes(id),
  formule                  TEXT NOT NULL CHECK (formule IN ('individuel', 'couple', 'famille', 'secondaire')),
  type_carte               TEXT NOT NULL DEFAULT 'physique' CHECK (type_carte IN ('physique', 'digitale', 'les_deux')),
  statut                   TEXT NOT NULL DEFAULT 'en_attente_paiement'
                             CHECK (statut IN ('en_attente_paiement', 'active', 'expiree', 'annulee')),
  email                    TEXT NOT NULL,
  prenom                   TEXT NOT NULL,
  nom_titulaire            TEXT NOT NULL,
  telephone                TEXT,
  adresse                  TEXT,
  retrait_commerce         BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_payment_intent_id TEXT,
  date_expiration          TIMESTAMPTZ NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── VISITES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carte_id    UUID NOT NULL REFERENCES cartes(id) ON DELETE CASCADE,
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  ville_id    UUID NOT NULL REFERENCES villes(id),
  source      TEXT NOT NULL DEFAULT 'qr' CHECK (source IN ('qr', 'code_mensuel', 'carnet', 'telephone', 'nfc', 'admin')),
  date_visite TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COMMERCANTS INSCRITS (demandes) ──────────────────────────
CREATE TABLE IF NOT EXISTS commercants_inscrits (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom_commerce     TEXT NOT NULL,
  categorie        TEXT NOT NULL,
  nom_ville        TEXT NOT NULL,
  departement      TEXT,
  adresse          TEXT NOT NULL,
  telephone        TEXT NOT NULL,
  email            TEXT NOT NULL,
  avantage_propose TEXT NOT NULL,
  siret            TEXT,
  statut           TEXT NOT NULL DEFAULT 'en_attente'
                     CHECK (statut IN ('en_attente', 'valide', 'refuse')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LISTE D'ATTENTE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS liste_attente (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  ville_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email, ville_slug)
);

-- ── CARTES CADEAUX ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cartes_cadeaux (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                     TEXT NOT NULL UNIQUE DEFAULT upper(encode(gen_random_bytes(4), 'hex')),
  ville_id                 UUID NOT NULL REFERENCES villes(id),
  montant_initial          INTEGER NOT NULL CHECK (montant_initial IN (1000, 2000, 3000)),
  montant_restant          INTEGER NOT NULL CHECK (montant_restant >= 0),
  statut                   TEXT NOT NULL DEFAULT 'en_attente_paiement'
                             CHECK (statut IN ('en_attente_paiement', 'active', 'utilisee', 'expiree')),
  acheteur_email           TEXT NOT NULL,
  acheteur_nom             TEXT,
  beneficiaire_nom         TEXT,
  message_personnel        TEXT,
  stripe_payment_intent_id TEXT,
  date_expiration          TIMESTAMPTZ NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── UTILISATIONS CADEAUX ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisations_cadeaux (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carte_cadeau_id UUID NOT NULL REFERENCES cartes_cadeaux(id) ON DELETE CASCADE,
  commerce_id     UUID NOT NULL REFERENCES commerces(id),
  montant_utilise INTEGER NOT NULL CHECK (montant_utilise > 0),
  date_utilisation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CODES MENSUELS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS codes_mensuels (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  mois        DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(commerce_id, mois)
);

-- INDEX de base
CREATE INDEX IF NOT EXISTS idx_villes_slug ON villes(slug);
CREATE INDEX IF NOT EXISTS idx_villes_statut ON villes(statut);
CREATE INDEX IF NOT EXISTS idx_commerces_ville_id ON commerces(ville_id);
CREATE INDEX IF NOT EXISTS idx_commerces_actif ON commerces(actif) WHERE actif = TRUE;
CREATE INDEX IF NOT EXISTS idx_cartes_email ON cartes(email);
CREATE INDEX IF NOT EXISTS idx_cartes_ville_id ON cartes(ville_id);
CREATE INDEX IF NOT EXISTS idx_cartes_statut ON cartes(statut);
CREATE INDEX IF NOT EXISTS idx_cartes_expiration ON cartes(date_expiration);
CREATE INDEX IF NOT EXISTS idx_cartes_qr_token ON cartes(qr_token);
CREATE INDEX IF NOT EXISTS idx_cartes_numero ON cartes(numero);
CREATE INDEX IF NOT EXISTS idx_visites_ville_date ON visites(ville_id, date_visite DESC);
CREATE INDEX IF NOT EXISTS idx_visites_commerce_id ON visites(commerce_id);
CREATE INDEX IF NOT EXISTS idx_visites_carte_id ON visites(carte_id);
CREATE INDEX IF NOT EXISTS idx_visites_date ON visites(date_visite DESC);
CREATE INDEX IF NOT EXISTS idx_commercants_statut ON commercants_inscrits(statut);
CREATE INDEX IF NOT EXISTS idx_cartes_cadeaux_code ON cartes_cadeaux(code);
CREATE INDEX IF NOT EXISTS idx_cartes_cadeaux_ville ON cartes_cadeaux(ville_id);
CREATE INDEX IF NOT EXISTS idx_codes_mensuels ON codes_mensuels(commerce_id, mois);

-- FONCTION ADMIN
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admins WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- TRIGGERS de base
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cartes_updated_at ON cartes;
CREATE TRIGGER trg_cartes_updated_at BEFORE UPDATE ON cartes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION sync_cartes_actives()
RETURNS TRIGGER AS $$
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

CREATE OR REPLACE FUNCTION sync_visites_compteurs()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE villes SET visites_total = visites_total + 1 WHERE id = NEW.ville_id;
  UPDATE commerces SET visites = visites + 1 WHERE id = NEW.commerce_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_sync_visites ON visites;
CREATE TRIGGER trg_sync_visites AFTER INSERT ON visites FOR EACH ROW EXECUTE FUNCTION sync_visites_compteurs();

CREATE OR REPLACE FUNCTION sync_commerces_partenaires()
RETURNS TRIGGER AS $$
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

CREATE OR REPLACE FUNCTION sync_solde_carte_cadeau()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cartes_cadeaux
  SET montant_restant = montant_restant - NEW.montant_utilise,
      statut = CASE WHEN montant_restant - NEW.montant_utilise <= 0 THEN 'utilisee' ELSE statut END
  WHERE id = NEW.carte_cadeau_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_sync_solde_cadeau ON utilisations_cadeaux;
CREATE TRIGGER trg_sync_solde_cadeau AFTER INSERT ON utilisations_cadeaux FOR EACH ROW EXECUTE FUNCTION sync_solde_carte_cadeau();

-- RPC stats mensuelles
CREATE OR REPLACE FUNCTION get_stats_mensuelles(p_ville_id UUID)
RETURNS TABLE (mois TEXT, visites BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT to_char(date_trunc('month', v.date_visite), 'Mon') AS mois, count(*)::BIGINT AS visites
  FROM visites v WHERE v.ville_id = p_ville_id AND v.date_visite >= NOW() - INTERVAL '6 months'
  GROUP BY date_trunc('month', v.date_visite) ORDER BY date_trunc('month', v.date_visite);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RPC recherche carte par QR
CREATE OR REPLACE FUNCTION get_carte_by_qr(p_qr_token TEXT)
RETURNS TABLE (id UUID, numero TEXT, prenom TEXT, nom_titulaire TEXT, ville_nom TEXT, statut TEXT, date_expiration TIMESTAMPTZ, formule TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.numero, c.prenom, c.nom_titulaire, v.nom, c.statut, c.date_expiration, c.formule
  FROM cartes c JOIN villes v ON v.id = c.ville_id
  WHERE c.qr_token = p_qr_token AND c.statut = 'active' AND c.date_expiration > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS tables de base
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE villes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerces ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartes ENABLE ROW LEVEL SECURITY;
ALTER TABLE visites ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercants_inscrits ENABLE ROW LEVEL SECURITY;
ALTER TABLE liste_attente ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartes_cadeaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisations_cadeaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes_mensuels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select_self" ON admins;
CREATE POLICY "admins_select_self" ON admins FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "admins_all_service" ON admins;
CREATE POLICY "admins_all_service" ON admins FOR ALL TO service_role USING (TRUE);

DROP POLICY IF EXISTS "villes_select_public" ON villes;
CREATE POLICY "villes_select_public" ON villes FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "villes_admin_write" ON villes;
CREATE POLICY "villes_admin_write" ON villes FOR ALL TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "villes_write_service" ON villes;
CREATE POLICY "villes_write_service" ON villes FOR ALL TO service_role USING (TRUE);

DROP POLICY IF EXISTS "commerces_select_public" ON commerces;
CREATE POLICY "commerces_select_public" ON commerces FOR SELECT TO anon, authenticated USING (actif = TRUE OR is_admin());
DROP POLICY IF EXISTS "commerces_write_service" ON commerces;
CREATE POLICY "commerces_write_service" ON commerces FOR ALL TO service_role USING (TRUE);

DROP POLICY IF EXISTS "cartes_insert_anon" ON cartes;
CREATE POLICY "cartes_insert_anon" ON cartes FOR INSERT TO anon, authenticated WITH CHECK (statut = 'en_attente_paiement');
DROP POLICY IF EXISTS "cartes_select_own" ON cartes;
CREATE POLICY "cartes_select_own" ON cartes FOR SELECT TO authenticated USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS "cartes_all_service" ON cartes;
CREATE POLICY "cartes_all_service" ON cartes FOR ALL TO service_role USING (TRUE);

DROP POLICY IF EXISTS "visites_insert_public" ON visites;
CREATE POLICY "visites_insert_public" ON visites FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "visites_select_admin" ON visites;
CREATE POLICY "visites_select_admin" ON visites FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "visites_all_service" ON visites;
CREATE POLICY "visites_all_service" ON visites FOR ALL TO service_role USING (TRUE);

DROP POLICY IF EXISTS "commercants_insert_public" ON commercants_inscrits;
CREATE POLICY "commercants_insert_public" ON commercants_inscrits FOR INSERT TO anon, authenticated WITH CHECK (statut = 'en_attente');
DROP POLICY IF EXISTS "commercants_select_admin" ON commercants_inscrits;
CREATE POLICY "commercants_select_admin" ON commercants_inscrits FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "commercants_all_service" ON commercants_inscrits;
CREATE POLICY "commercants_all_service" ON commercants_inscrits FOR ALL TO service_role USING (TRUE);

DROP POLICY IF EXISTS "attente_insert_public" ON liste_attente;
CREATE POLICY "attente_insert_public" ON liste_attente FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "attente_all_service" ON liste_attente;
CREATE POLICY "attente_all_service" ON liste_attente FOR ALL TO service_role USING (TRUE);

DROP POLICY IF EXISTS "cadeaux_insert_public" ON cartes_cadeaux;
CREATE POLICY "cadeaux_insert_public" ON cartes_cadeaux FOR INSERT TO anon, authenticated WITH CHECK (statut = 'en_attente_paiement');
DROP POLICY IF EXISTS "cadeaux_select_public" ON cartes_cadeaux;
CREATE POLICY "cadeaux_select_public" ON cartes_cadeaux FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "cadeaux_all_service" ON cartes_cadeaux;
CREATE POLICY "cadeaux_all_service" ON cartes_cadeaux FOR ALL TO service_role USING (TRUE);

DROP POLICY IF EXISTS "util_insert_public" ON utilisations_cadeaux;
CREATE POLICY "util_insert_public" ON utilisations_cadeaux FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "util_all_service" ON utilisations_cadeaux;
CREATE POLICY "util_all_service" ON utilisations_cadeaux FOR ALL TO service_role USING (TRUE);

DROP POLICY IF EXISTS "codes_select_public" ON codes_mensuels;
CREATE POLICY "codes_select_public" ON codes_mensuels FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "codes_all_service" ON codes_mensuels;
CREATE POLICY "codes_all_service" ON codes_mensuels FOR ALL TO service_role USING (TRUE);

-- Données initiales
INSERT INTO villes (slug, nom, departement, region, statut, description) VALUES
  ('sanary', 'Sanary-sur-Mer', 'Var', 'PACA', 'actif', 'Ville pilote du programme Réseaux-Résident.')
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- PARTIE 2 : EXTENSIONS v3 — tables webhook, badges + RPCs
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload         JSONB
);
CREATE INDEX IF NOT EXISTS idx_stripe_events_id ON stripe_webhook_events(stripe_event_id);

-- Colonnes supplémentaires sur cartes
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS commande_groupe_id UUID;
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS ordre_titulaire INTEGER DEFAULT 1;
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_cartes_groupe ON cartes(commande_groupe_id) WHERE commande_groupe_id IS NOT NULL;

-- Colonnes supplémentaires sur commerces
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS email_contact TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS desactivation_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex');

-- RPCs v3
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

CREATE OR REPLACE FUNCTION create_visit_secure(p_qr_token TEXT, p_commerce_id UUID, p_source TEXT DEFAULT 'qr')
RETURNS JSON AS $$
DECLARE
  v_carte RECORD;
  v_commerce RECORD;
  v_recent INTEGER;
  v_visit_id UUID;
BEGIN
  SELECT c.id, c.statut, c.date_expiration, c.ville_id INTO v_carte FROM cartes c WHERE c.qr_token = p_qr_token;
  IF NOT FOUND THEN RETURN json_build_object('error', 'carte_not_found'); END IF;
  IF v_carte.statut != 'active' THEN RETURN json_build_object('error', 'carte_inactive'); END IF;
  IF v_carte.date_expiration < NOW() THEN RETURN json_build_object('error', 'carte_expiree'); END IF;

  SELECT co.id, co.ville_id, co.actif INTO v_commerce FROM commerces co WHERE co.id = p_commerce_id;
  IF NOT FOUND OR NOT v_commerce.actif THEN RETURN json_build_object('error', 'commerce_invalide'); END IF;
  IF v_commerce.ville_id != v_carte.ville_id THEN RETURN json_build_object('error', 'ville_mismatch'); END IF;

  SELECT count(*) INTO v_recent FROM visites WHERE carte_id = v_carte.id AND commerce_id = p_commerce_id AND date_visite > NOW() - INTERVAL '2 hours';
  IF v_recent > 0 THEN RETURN json_build_object('error', 'doublon', 'message', 'Visite déjà enregistrée récemment'); END IF;

  INSERT INTO visites (carte_id, commerce_id, ville_id, source)
  VALUES (v_carte.id, p_commerce_id, v_carte.ville_id, p_source)
  RETURNING id INTO v_visit_id;

  RETURN json_build_object('success', true, 'visit_id', v_visit_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_commercant_request(p_request_id UUID)
RETURNS JSON AS $$
DECLARE v_req RECORD; v_ville_id UUID; v_commerce_id UUID;
BEGIN
  SELECT * INTO v_req FROM commercants_inscrits WHERE id = p_request_id AND statut = 'en_attente';
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  SELECT id INTO v_ville_id FROM villes WHERE lower(nom) = lower(v_req.nom_ville) LIMIT 1;
  IF v_ville_id IS NULL THEN
    INSERT INTO villes (slug, nom, departement, statut, description)
    VALUES (lower(replace(replace(replace(replace(v_req.nom_ville,' ','-'),'''',''),'é','e'),'è','e')), v_req.nom_ville, v_req.departement, 'bientot', 'Activée par le premier commerce.')
    ON CONFLICT (slug) DO UPDATE SET nom = EXCLUDED.nom RETURNING id INTO v_ville_id;
  END IF;
  INSERT INTO commerces (ville_id, nom, categorie, avantage, adresse, telephone, email_contact, actif)
  VALUES (v_ville_id, v_req.nom_commerce, v_req.categorie, v_req.avantage_propose, v_req.adresse, v_req.telephone, v_req.email, TRUE)
  RETURNING id INTO v_commerce_id;
  UPDATE commercants_inscrits SET statut = 'valide' WHERE id = p_request_id;
  UPDATE villes SET statut = 'actif' WHERE id = v_ville_id AND statut = 'bientot';
  RETURN json_build_object('success', true, 'commerce_id', v_commerce_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refuse_commercant_request(p_request_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE commercants_inscrits SET statut = 'refuse' WHERE id = p_request_id AND statut = 'en_attente';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_top_clients_by_ville(p_ville_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS JSON AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_data) FROM (
      SELECT c.id, c.numero, c.prenom, c.nom_titulaire, count(v.id)::INTEGER AS visites
      FROM visites v JOIN cartes c ON c.id = v.carte_id WHERE v.ville_id = p_ville_id
      GROUP BY c.id, c.numero, c.prenom, c.nom_titulaire ORDER BY visites DESC LIMIT p_limit
    ) row_data
  ), '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_admin_dashboard(p_ville_slug TEXT)
RETURNS JSON AS $$
DECLARE result JSON; v_ville_id UUID;
BEGIN
  SELECT id INTO v_ville_id FROM villes WHERE slug = p_ville_slug;
  IF v_ville_id IS NULL THEN RETURN NULL; END IF;
  SELECT json_build_object(
    'ville', json_build_object('id', v.id, 'nom', v.nom, 'slug', v.slug, 'cartes_actives', v.cartes_actives, 'commerces_partenaires', v.commerces_partenaires, 'visites_total', v.visites_total),
    'commerces', COALESCE((SELECT json_agg(json_build_object('id', c.id, 'nom', c.nom, 'categorie', c.categorie, 'avantage', c.avantage, 'visites', c.visites, 'actif', c.actif) ORDER BY c.visites DESC) FROM commerces c WHERE c.ville_id = v.id), '[]'::json),
    'demandes_en_attente', (SELECT count(*)::INTEGER FROM commercants_inscrits WHERE statut = 'en_attente'),
    'cartes_total', (SELECT count(*)::INTEGER FROM cartes WHERE ville_id = v.id AND statut = 'active'),
    'revenus_cartes', COALESCE((SELECT sum(CASE formule WHEN 'individuel' THEN 10 WHEN 'couple' THEN 15 WHEN 'secondaire' THEN 20 END)::INTEGER FROM cartes WHERE ville_id = v.id AND statut = 'active'), 0),
    'visites_par_source', COALESCE((SELECT json_agg(json_build_object('source', vis.source, 'count', vis.cnt)) FROM (SELECT source, count(*)::INTEGER as cnt FROM visites WHERE ville_id = v.id GROUP BY source ORDER BY cnt DESC) vis), '[]'::json)
  ) INTO result FROM villes v WHERE v.id = v_ville_id;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION activate_carte_after_payment(p_carte_id UUID, p_stripe_pi TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE cartes SET statut = 'active', stripe_payment_intent_id = p_stripe_pi, payment_confirmed_at = NOW()
  WHERE id = p_carte_id AND statut = 'en_attente_paiement';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION resilier_carte(p_numero TEXT, p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE cartes SET statut = 'annulee', updated_at = NOW() WHERE numero = p_numero AND email = p_email AND statut = 'active';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION retirer_commerce(p_commerce_id UUID, p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE commerces SET actif = FALSE WHERE id = p_commerce_id AND desactivation_token = p_token AND actif = TRUE;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-activation ville quand un commerce est ajouté
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

-- ══════════════════════════════════════════════════════════════════════
-- PARTIE 3 : RPCs v3.1 — espace résident & commerçant
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_resident_profile(p_numero TEXT, p_email TEXT)
RETURNS JSON AS $$
DECLARE v_carte RECORD; result JSON;
BEGIN
  SELECT c.*, v.nom AS ville_nom, v.slug AS ville_slug INTO v_carte
  FROM cartes c JOIN villes v ON v.id = c.ville_id
  WHERE c.numero = p_numero AND c.email = p_email AND c.statut = 'active' LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  SELECT json_build_object(
    'carte', json_build_object('id', v_carte.id, 'numero', v_carte.numero, 'prenom', v_carte.prenom, 'nom', v_carte.nom_titulaire, 'formule', v_carte.formule, 'type_carte', v_carte.type_carte, 'ville_nom', v_carte.ville_nom, 'ville_slug', v_carte.ville_slug, 'qr_token', v_carte.qr_token, 'date_expiration', v_carte.date_expiration),
    'stats', json_build_object('total_visites', (SELECT count(*)::INTEGER FROM visites WHERE carte_id = v_carte.id), 'commerces_visites', (SELECT count(DISTINCT commerce_id)::INTEGER FROM visites WHERE carte_id = v_carte.id)),
    'visites_recentes', COALESCE((SELECT json_agg(json_build_object('commerce_nom', co.nom, 'categorie', co.categorie, 'date', vis.date_visite)) FROM (SELECT * FROM visites WHERE carte_id = v_carte.id ORDER BY date_visite DESC LIMIT 10) vis JOIN commerces co ON co.id = vis.commerce_id), '[]'::json)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_recommendations(p_carte_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS JSON AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_data) FROM (
      SELECT co.id, co.nom, co.categorie, co.avantage, co.adresse
      FROM commerces co JOIN cartes c ON c.id = p_carte_id AND co.ville_id = c.ville_id
      WHERE co.actif = TRUE AND co.id NOT IN (SELECT commerce_id FROM visites WHERE carte_id = p_carte_id)
      ORDER BY co.visites DESC LIMIT p_limit
    ) row_data
  ), '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_commerce_stats(p_commerce_id UUID, p_token TEXT)
RETURNS JSON AS $$
DECLARE v_commerce RECORD;
BEGIN
  SELECT * INTO v_commerce FROM commerces WHERE id = p_commerce_id AND desactivation_token = p_token;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;
  RETURN json_build_object(
    'commerce', json_build_object('id', v_commerce.id, 'nom', v_commerce.nom, 'categorie', v_commerce.categorie, 'avantage', v_commerce.avantage, 'adresse', v_commerce.adresse, 'actif', v_commerce.actif, 'visites_total', v_commerce.visites),
    'visites_30j', (SELECT count(*)::INTEGER FROM visites WHERE commerce_id = p_commerce_id AND date_visite > NOW() - INTERVAL '30 days'),
    'visites_7j', (SELECT count(*)::INTEGER FROM visites WHERE commerce_id = p_commerce_id AND date_visite > NOW() - INTERVAL '7 days'),
    'clients_uniques', (SELECT count(DISTINCT carte_id)::INTEGER FROM visites WHERE commerce_id = p_commerce_id),
    'visites_par_mois', COALESCE((SELECT json_agg(json_build_object('mois', to_char(m, 'Mon'), 'count', c)) FROM (SELECT date_trunc('month', date_visite) AS m, count(*)::INTEGER AS c FROM visites WHERE commerce_id = p_commerce_id AND date_visite > NOW() - INTERVAL '6 months' GROUP BY date_trunc('month', date_visite) ORDER BY m) sub), '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION create_parrainage_code(p_carte_id UUID)
RETURNS TEXT AS $$
DECLARE v_code TEXT;
BEGIN
  -- Génère un code simple basé sur l'UUID de la carte
  v_code := upper(encode(gen_random_bytes(4), 'hex'));
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════
-- PARTIE 4 : MIGRATION v4 — Tables Réseaux-Résident
-- ══════════════════════════════════════════════════════════════════════

-- Fonction updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ville_id        UUID REFERENCES villes(id) ON DELETE SET NULL,
  prenom          TEXT NOT NULL,
  nom             TEXT NOT NULL,
  email           TEXT NOT NULL,
  telephone       TEXT,
  adresse         TEXT,
  code_parrainage TEXT UNIQUE,
  parrain_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url      TEXT,
  preferences     JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_admin" ON profiles;
CREATE POLICY "profiles_admin" ON profiles FOR ALL TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_profiles_ville_id ON profiles(ville_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. COMMERCANT_PROFILES
CREATE TABLE IF NOT EXISTS commercant_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'staff')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE commercant_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commercant_profiles_select_own" ON commercant_profiles;
CREATE POLICY "commercant_profiles_select_own" ON commercant_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "commercant_profiles_insert_own" ON commercant_profiles;
CREATE POLICY "commercant_profiles_insert_own" ON commercant_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "commercant_profiles_admin" ON commercant_profiles;
CREATE POLICY "commercant_profiles_admin" ON commercant_profiles FOR ALL TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_commercant_profiles_commerce_id ON commercant_profiles(commerce_id);

-- 3. OFFRES (v4 — remplace l'ancienne si elle existe avec des colonnes différentes)
CREATE TABLE IF NOT EXISTS offres (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id        UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  titre              TEXT NOT NULL,
  description        TEXT,
  type               TEXT NOT NULL DEFAULT 'reduction' CHECK (type IN ('reduction', 'cadeau', 'offre_speciale', 'programme_fidelite')),
  valeur             TEXT,
  conditions         TEXT,
  date_debut         TIMESTAMPTZ,
  date_fin           TIMESTAMPTZ,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  utilisations_count INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE offres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offres_select_anon" ON offres;
CREATE POLICY "offres_select_anon" ON offres FOR SELECT TO anon USING (active = true);
DROP POLICY IF EXISTS "offres_select_auth" ON offres;
CREATE POLICY "offres_select_auth" ON offres FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "offres_commercant_manage" ON offres;
CREATE POLICY "offres_commercant_manage" ON offres FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM commercant_profiles WHERE commercant_profiles.commerce_id = offres.commerce_id AND commercant_profiles.id = auth.uid()));
DROP POLICY IF EXISTS "offres_admin" ON offres;
CREATE POLICY "offres_admin" ON offres FOR ALL TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_offres_commerce_id ON offres(commerce_id);
CREATE INDEX IF NOT EXISTS idx_offres_active ON offres(active) WHERE active = true;

-- 4. UTILISATIONS_OFFRES
CREATE TABLE IF NOT EXISTS utilisations_offres (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offre_id         UUID NOT NULL REFERENCES offres(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  commerce_id      UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  date_utilisation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE utilisations_offres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "utilisations_offres_resident_select" ON utilisations_offres;
CREATE POLICY "utilisations_offres_resident_select" ON utilisations_offres FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "utilisations_offres_resident_insert" ON utilisations_offres;
CREATE POLICY "utilisations_offres_resident_insert" ON utilisations_offres FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "utilisations_offres_admin" ON utilisations_offres;
CREATE POLICY "utilisations_offres_admin" ON utilisations_offres FOR ALL TO authenticated USING (is_admin());

-- 5. EVENEMENTS (v4)
CREATE TABLE IF NOT EXISTS evenements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id          UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  organisateur_type TEXT NOT NULL CHECK (organisateur_type IN ('mairie', 'commerce', 'association', 'club')),
  organisateur_id   UUID,
  titre             TEXT NOT NULL,
  description       TEXT,
  lieu              TEXT,
  adresse           TEXT,
  date_debut        TIMESTAMPTZ NOT NULL,
  date_fin          TIMESTAMPTZ,
  image_url         TEXT,
  categorie         TEXT,
  gratuit           BOOLEAN NOT NULL DEFAULT TRUE,
  prix              DECIMAL(10, 2),
  lien_externe      TEXT,
  openagenda_id     TEXT,
  statut            TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'publie', 'annule', 'termine')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE evenements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evenements_select_publie_anon" ON evenements;
CREATE POLICY "evenements_select_publie_anon" ON evenements FOR SELECT TO anon USING (statut = 'publie');
DROP POLICY IF EXISTS "evenements_select_publie_auth" ON evenements;
CREATE POLICY "evenements_select_publie_auth" ON evenements FOR SELECT TO authenticated USING (statut = 'publie');
DROP POLICY IF EXISTS "evenements_admin" ON evenements;
CREATE POLICY "evenements_admin" ON evenements FOR ALL TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_evenements_ville_id ON evenements(ville_id);
CREATE INDEX IF NOT EXISTS idx_evenements_date_debut ON evenements(date_debut);
CREATE INDEX IF NOT EXISTS idx_evenements_statut ON evenements(statut);

-- 6. ACTUALITES
CREATE TABLE IF NOT EXISTS actualites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id    UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  auteur_type TEXT NOT NULL CHECK (auteur_type IN ('mairie', 'commerce', 'association', 'club', 'admin')),
  auteur_id   UUID,
  titre       TEXT NOT NULL,
  contenu     TEXT NOT NULL,
  image_url   TEXT,
  categorie   TEXT,
  epingle     BOOLEAN NOT NULL DEFAULT FALSE,
  publie      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE actualites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "actualites_select_publie_anon" ON actualites;
CREATE POLICY "actualites_select_publie_anon" ON actualites FOR SELECT TO anon USING (publie = true);
DROP POLICY IF EXISTS "actualites_select_publie_auth" ON actualites;
CREATE POLICY "actualites_select_publie_auth" ON actualites FOR SELECT TO authenticated USING (publie = true);
DROP POLICY IF EXISTS "actualites_admin" ON actualites;
CREATE POLICY "actualites_admin" ON actualites FOR ALL TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_actualites_ville_id ON actualites(ville_id);
CREATE INDEX IF NOT EXISTS idx_actualites_publie ON actualites(publie) WHERE publie = true;

-- 7. ASSOCIATIONS
CREATE TABLE IF NOT EXISTS associations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id     UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  nom          TEXT NOT NULL,
  description  TEXT,
  categorie    TEXT NOT NULL,
  adresse      TEXT,
  email        TEXT,
  telephone    TEXT,
  site_web     TEXT,
  logo_url     TEXT,
  numero_rna   TEXT,
  numero_siret TEXT,
  actif        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE associations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "associations_select_actif_anon" ON associations;
CREATE POLICY "associations_select_actif_anon" ON associations FOR SELECT TO anon USING (actif = true);
DROP POLICY IF EXISTS "associations_select_actif_auth" ON associations;
CREATE POLICY "associations_select_actif_auth" ON associations FOR SELECT TO authenticated USING (actif = true);
DROP POLICY IF EXISTS "associations_admin" ON associations;
CREATE POLICY "associations_admin" ON associations FOR ALL TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_associations_ville_id ON associations(ville_id);

-- 8. ASSOCIATION_PROFILES
CREATE TABLE IF NOT EXISTS association_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('president', 'admin', 'membre')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE association_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "association_profiles_select_own" ON association_profiles;
CREATE POLICY "association_profiles_select_own" ON association_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "association_profiles_insert_own" ON association_profiles;
CREATE POLICY "association_profiles_insert_own" ON association_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "association_profiles_admin" ON association_profiles;
CREATE POLICY "association_profiles_admin" ON association_profiles FOR ALL TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_association_profiles_asso_id ON association_profiles(association_id);

-- Policy asso manage (dépend de association_profiles)
DROP POLICY IF EXISTS "associations_asso_manage" ON associations;
CREATE POLICY "associations_asso_manage" ON associations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM association_profiles WHERE association_profiles.association_id = associations.id AND association_profiles.id = auth.uid() AND association_profiles.role IN ('president', 'admin')));

-- 9. PROJETS
CREATE TABLE IF NOT EXISTS projets (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id       UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  ville_id             UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  titre                TEXT NOT NULL,
  description          TEXT NOT NULL,
  objectif_montant     DECIMAL(10, 2),
  montant_collecte     DECIMAL(10, 2) NOT NULL DEFAULT 0,
  objectif_description TEXT,
  paliers              JSONB,
  image_url            TEXT,
  date_limite          TIMESTAMPTZ,
  statut               TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'actif', 'atteint', 'cloture')),
  source               TEXT NOT NULL DEFAULT 'local' CHECK (source IN ('local', 'simplyfot', 'simplyrugby')),
  source_id            TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE projets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projets_select_actif_anon" ON projets;
CREATE POLICY "projets_select_actif_anon" ON projets FOR SELECT TO anon USING (statut IN ('actif', 'atteint'));
DROP POLICY IF EXISTS "projets_select_auth" ON projets;
CREATE POLICY "projets_select_auth" ON projets FOR SELECT TO authenticated USING (statut IN ('actif', 'atteint'));
DROP POLICY IF EXISTS "projets_asso_manage" ON projets;
CREATE POLICY "projets_asso_manage" ON projets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM association_profiles WHERE association_profiles.association_id = projets.association_id AND association_profiles.id = auth.uid()));
DROP POLICY IF EXISTS "projets_admin" ON projets;
CREATE POLICY "projets_admin" ON projets FOR ALL TO authenticated USING (is_admin());
DROP TRIGGER IF EXISTS trg_projets_updated_at ON projets;
CREATE TRIGGER trg_projets_updated_at BEFORE UPDATE ON projets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_projets_ville_id ON projets(ville_id);
CREATE INDEX IF NOT EXISTS idx_projets_association_id ON projets(association_id);
CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);

-- 10. SOUTIENS
CREATE TABLE IF NOT EXISTS soutiens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id    UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  soutien_type TEXT NOT NULL CHECK (soutien_type IN ('resident', 'commerce', 'mairie')),
  soutien_id   UUID,
  montant      DECIMAL(10, 2),
  message      TEXT,
  anonyme      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE soutiens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "soutiens_select_anon" ON soutiens;
CREATE POLICY "soutiens_select_anon" ON soutiens FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "soutiens_select_auth" ON soutiens;
CREATE POLICY "soutiens_select_auth" ON soutiens FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "soutiens_insert_auth" ON soutiens;
CREATE POLICY "soutiens_insert_auth" ON soutiens FOR INSERT TO authenticated WITH CHECK (soutien_id = auth.uid());
DROP POLICY IF EXISTS "soutiens_admin" ON soutiens;
CREATE POLICY "soutiens_admin" ON soutiens FOR ALL TO authenticated USING (is_admin());

-- Trigger sync montant_collecte
CREATE OR REPLACE FUNCTION fn_sync_montant_collecte()
RETURNS TRIGGER AS $$
DECLARE v_projet_id UUID;
BEGIN
  v_projet_id := COALESCE(NEW.projet_id, OLD.projet_id);
  UPDATE projets SET montant_collecte = (SELECT COALESCE(SUM(montant), 0) FROM soutiens WHERE projet_id = v_projet_id) WHERE id = v_projet_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_sync_montant_collecte ON soutiens;
CREATE TRIGGER trg_sync_montant_collecte AFTER INSERT OR UPDATE OR DELETE ON soutiens FOR EACH ROW EXECUTE FUNCTION fn_sync_montant_collecte();
CREATE INDEX IF NOT EXISTS idx_soutiens_projet_id ON soutiens(projet_id);

-- 11. MAIRIE_PROFILES
CREATE TABLE IF NOT EXISTS mairie_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ville_id   UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('elu', 'directeur', 'agent')),
  service    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE mairie_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mairie_profiles_select_own" ON mairie_profiles;
CREATE POLICY "mairie_profiles_select_own" ON mairie_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "mairie_profiles_insert_own" ON mairie_profiles;
CREATE POLICY "mairie_profiles_insert_own" ON mairie_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "mairie_profiles_admin" ON mairie_profiles;
CREATE POLICY "mairie_profiles_admin" ON mairie_profiles FOR ALL TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_mairie_profiles_ville_id ON mairie_profiles(ville_id);

-- 12. FAVORIS
CREATE TABLE IF NOT EXISTS favoris (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  favori_type TEXT NOT NULL CHECK (favori_type IN ('commerce', 'association', 'evenement')),
  favori_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, favori_type, favori_id)
);
ALTER TABLE favoris ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "favoris_own" ON favoris;
CREATE POLICY "favoris_own" ON favoris FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "favoris_admin" ON favoris;
CREATE POLICY "favoris_admin" ON favoris FOR ALL TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_favoris_profile_id ON favoris(profile_id);

-- 13. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destinataire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('offre', 'evenement', 'projet', 'actualite', 'systeme')),
  lien            TEXT,
  lu              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (destinataire_id = auth.uid());
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (destinataire_id = auth.uid());
DROP POLICY IF EXISTS "notifications_admin_insert" ON notifications;
CREATE POLICY "notifications_admin_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "notifications_admin_all" ON notifications;
CREATE POLICY "notifications_admin_all" ON notifications FOR ALL TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "notifications_service_insert" ON notifications;
CREATE POLICY "notifications_service_insert" ON notifications FOR INSERT TO service_role WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_notifications_destinataire_id ON notifications(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_notifications_non_lu ON notifications(destinataire_id) WHERE lu = false;

-- 14. PARRAINAGES (v4 — basé sur profiles)
CREATE TABLE IF NOT EXISTS parrainages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parrain_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filleul_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  statut     TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parrain_id, filleul_id)
);
ALTER TABLE parrainages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parrainages_select_own" ON parrainages;
CREATE POLICY "parrainages_select_own" ON parrainages FOR SELECT TO authenticated USING (parrain_id = auth.uid() OR filleul_id = auth.uid());
DROP POLICY IF EXISTS "parrainages_insert_auth" ON parrainages;
CREATE POLICY "parrainages_insert_auth" ON parrainages FOR INSERT TO authenticated WITH CHECK (filleul_id = auth.uid());
DROP POLICY IF EXISTS "parrainages_admin" ON parrainages;
CREATE POLICY "parrainages_admin" ON parrainages FOR ALL TO authenticated USING (is_admin());

-- 15. CAMPAGNES
CREATE TABLE IF NOT EXISTS campagnes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  ville_id    UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL CHECK (type IN ('mise_en_avant', 'notification_push', 'banniere')),
  date_debut  TIMESTAMPTZ,
  date_fin    TIMESTAMPTZ,
  budget      DECIMAL(10, 2),
  statut      TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'active', 'terminee')),
  impressions INTEGER NOT NULL DEFAULT 0,
  clics       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE campagnes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campagnes_commercant_manage" ON campagnes;
CREATE POLICY "campagnes_commercant_manage" ON campagnes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM commercant_profiles WHERE commercant_profiles.commerce_id = campagnes.commerce_id AND commercant_profiles.id = auth.uid()));
DROP POLICY IF EXISTS "campagnes_admin" ON campagnes;
CREATE POLICY "campagnes_admin" ON campagnes FOR ALL TO authenticated USING (is_admin());

-- EXTENSIONS TABLE COMMERCES
ALTER TABLE commerces
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS horaires       JSONB,
  ADD COLUMN IF NOT EXISTS photos         JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS site_web       TEXT,
  ADD COLUMN IF NOT EXISTS latitude       DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude      DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS siret          TEXT,
  ADD COLUMN IF NOT EXISTS premium        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS premium_depuis TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_commerces_owner_id ON commerces(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commerces_premium ON commerces(premium) WHERE premium = true;
CREATE INDEX IF NOT EXISTS idx_commerces_stripe_customer_id ON commerces(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- EXTENSIONS TABLE VILLES
ALTER TABLE villes
  ADD COLUMN IF NOT EXISTS associations_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evenements_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projets_actifs_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS population           INTEGER,
  ADD COLUMN IF NOT EXISTS code_postal          TEXT,
  ADD COLUMN IF NOT EXISTS code_insee           TEXT,
  ADD COLUMN IF NOT EXISTS logo_url             TEXT,
  ADD COLUMN IF NOT EXISTS site_web             TEXT;

-- TRIGGERS SYNC COMPTEURS VILLES
CREATE OR REPLACE FUNCTION fn_sync_associations_count() RETURNS TRIGGER AS $$
DECLARE v_ville_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN v_ville_id := OLD.ville_id; ELSE v_ville_id := NEW.ville_id; END IF;
  UPDATE villes SET associations_count = (SELECT COUNT(*) FROM associations WHERE associations.ville_id = v_ville_id AND actif = true) WHERE id = v_ville_id;
  IF TG_OP = 'UPDATE' AND OLD.ville_id IS DISTINCT FROM NEW.ville_id THEN
    UPDATE villes SET associations_count = (SELECT COUNT(*) FROM associations WHERE associations.ville_id = OLD.ville_id AND actif = true) WHERE id = OLD.ville_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_sync_associations_count ON associations;
CREATE TRIGGER trg_sync_associations_count AFTER INSERT OR UPDATE OR DELETE ON associations FOR EACH ROW EXECUTE FUNCTION fn_sync_associations_count();

CREATE OR REPLACE FUNCTION fn_sync_evenements_count() RETURNS TRIGGER AS $$
DECLARE v_ville_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN v_ville_id := OLD.ville_id; ELSE v_ville_id := NEW.ville_id; END IF;
  UPDATE villes SET evenements_count = (SELECT COUNT(*) FROM evenements WHERE evenements.ville_id = v_ville_id AND statut = 'publie') WHERE id = v_ville_id;
  IF TG_OP = 'UPDATE' AND OLD.ville_id IS DISTINCT FROM NEW.ville_id THEN
    UPDATE villes SET evenements_count = (SELECT COUNT(*) FROM evenements WHERE evenements.ville_id = OLD.ville_id AND statut = 'publie') WHERE id = OLD.ville_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_sync_evenements_count ON evenements;
CREATE TRIGGER trg_sync_evenements_count AFTER INSERT OR UPDATE OR DELETE ON evenements FOR EACH ROW EXECUTE FUNCTION fn_sync_evenements_count();

CREATE OR REPLACE FUNCTION fn_sync_projets_actifs_count() RETURNS TRIGGER AS $$
DECLARE v_ville_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN v_ville_id := OLD.ville_id; ELSE v_ville_id := NEW.ville_id; END IF;
  UPDATE villes SET projets_actifs_count = (SELECT COUNT(*) FROM projets WHERE projets.ville_id = v_ville_id AND statut = 'actif') WHERE id = v_ville_id;
  IF TG_OP = 'UPDATE' AND OLD.ville_id IS DISTINCT FROM NEW.ville_id THEN
    UPDATE villes SET projets_actifs_count = (SELECT COUNT(*) FROM projets WHERE projets.ville_id = OLD.ville_id AND statut = 'actif') WHERE id = OLD.ville_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_sync_projets_actifs_count ON projets;
CREATE TRIGGER trg_sync_projets_actifs_count AFTER INSERT OR UPDATE OR DELETE ON projets FOR EACH ROW EXECUTE FUNCTION fn_sync_projets_actifs_count();

-- RPCs v4
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_ville_id UUID) RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'residents_count', (SELECT COUNT(*) FROM profiles WHERE ville_id = p_ville_id),
    'commerces_count', (SELECT COUNT(*) FROM commerces WHERE ville_id = p_ville_id AND actif = true),
    'associations_count', (SELECT COUNT(*) FROM associations WHERE ville_id = p_ville_id AND actif = true),
    'evenements_count', (SELECT COUNT(*) FROM evenements WHERE ville_id = p_ville_id AND statut = 'publie'),
    'projets_actifs_count', (SELECT COUNT(*) FROM projets WHERE ville_id = p_ville_id AND statut = 'actif'),
    'offres_actives_count', (SELECT COUNT(*) FROM offres WHERE active = true AND commerce_id IN (SELECT id FROM commerces WHERE ville_id = p_ville_id AND actif = true)),
    'visites_total', (SELECT COALESCE(visites_total, 0) FROM villes WHERE id = p_ville_id),
    'cartes_actives_count', (SELECT COALESCE(cartes_actives, 0) FROM villes WHERE id = p_ville_id),
    'soutiens_total', (SELECT COALESCE(SUM(montant), 0) FROM soutiens WHERE projet_id IN (SELECT id FROM projets WHERE ville_id = p_ville_id)),
    'parrainages_valides', (SELECT COUNT(*) FROM parrainages WHERE statut = 'valide' AND parrain_id IN (SELECT id FROM profiles WHERE ville_id = p_ville_id))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_projets_ville(p_ville_id UUID) RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT COALESCE(json_agg(projet ORDER BY projet.created_at DESC), '[]'::json) FROM (
    SELECT p.id, p.titre, p.description, p.objectif_montant, p.montant_collecte, p.paliers, p.image_url, p.date_limite, p.statut, p.source, p.created_at,
      json_build_object('id', a.id, 'nom', a.nom, 'categorie', a.categorie, 'logo_url', a.logo_url) AS association,
      CASE WHEN p.objectif_montant > 0 THEN ROUND((p.montant_collecte / p.objectif_montant * 100)::numeric, 1) ELSE 0 END AS progression_pct,
      (SELECT COUNT(*) FROM soutiens WHERE projet_id = p.id) AS nb_soutiens
    FROM projets p JOIN associations a ON a.id = p.association_id
    WHERE p.ville_id = p_ville_id AND p.statut IN ('actif', 'atteint')
  ) AS projet INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLICIES DIFFÉRÉES (dépendent de mairie_profiles + association_profiles)
DROP POLICY IF EXISTS "profiles_mairie_select" ON profiles;
CREATE POLICY "profiles_mairie_select" ON profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM mairie_profiles WHERE mairie_profiles.id = auth.uid() AND mairie_profiles.ville_id = profiles.ville_id));

DROP POLICY IF EXISTS "evenements_commercant_manage" ON evenements;
CREATE POLICY "evenements_commercant_manage" ON evenements FOR ALL TO authenticated USING (organisateur_type = 'commerce' AND EXISTS (SELECT 1 FROM commercant_profiles WHERE commercant_profiles.id = auth.uid() AND commercant_profiles.commerce_id = evenements.organisateur_id));

DROP POLICY IF EXISTS "evenements_asso_manage" ON evenements;
CREATE POLICY "evenements_asso_manage" ON evenements FOR ALL TO authenticated USING (organisateur_type IN ('association', 'club') AND EXISTS (SELECT 1 FROM association_profiles WHERE association_profiles.id = auth.uid() AND association_profiles.association_id = evenements.organisateur_id));

DROP POLICY IF EXISTS "evenements_mairie_manage" ON evenements;
CREATE POLICY "evenements_mairie_manage" ON evenements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM mairie_profiles WHERE mairie_profiles.id = auth.uid() AND mairie_profiles.ville_id = evenements.ville_id));

DROP POLICY IF EXISTS "actualites_commercant_manage" ON actualites;
CREATE POLICY "actualites_commercant_manage" ON actualites FOR ALL TO authenticated USING (auteur_type = 'commerce' AND EXISTS (SELECT 1 FROM commercant_profiles WHERE commercant_profiles.id = auth.uid() AND commercant_profiles.commerce_id = actualites.auteur_id));

DROP POLICY IF EXISTS "actualites_asso_manage" ON actualites;
CREATE POLICY "actualites_asso_manage" ON actualites FOR ALL TO authenticated USING (auteur_type IN ('association', 'club') AND EXISTS (SELECT 1 FROM association_profiles WHERE association_profiles.id = auth.uid() AND association_profiles.association_id = actualites.auteur_id));

DROP POLICY IF EXISTS "actualites_mairie_manage" ON actualites;
CREATE POLICY "actualites_mairie_manage" ON actualites FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM mairie_profiles WHERE mairie_profiles.id = auth.uid() AND mairie_profiles.ville_id = actualites.ville_id));

DROP POLICY IF EXISTS "projets_mairie_select" ON projets;
CREATE POLICY "projets_mairie_select" ON projets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM mairie_profiles WHERE mairie_profiles.id = auth.uid() AND mairie_profiles.ville_id = projets.ville_id));

DROP POLICY IF EXISTS "campagnes_mairie_select" ON campagnes;
CREATE POLICY "campagnes_mairie_select" ON campagnes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM mairie_profiles WHERE mairie_profiles.id = auth.uid() AND mairie_profiles.ville_id = campagnes.ville_id));

-- ══════════════════════════════════════════════════════════════════════
-- FIN — TOUT EST EN PLACE
-- ══════════════════════════════════════════════════════════════════════

COMMIT;
