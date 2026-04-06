-- migration-v5-fix.sql
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Crée les tables manquantes + fix RLS cartes
-- Idempotent : peut être relancé sans risque

BEGIN;

-- ════════════════════════════════════════════════════════════
-- 1. TABLE PROFILES (résidents liés à auth.users)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ville_id        UUID REFERENCES villes(id),
  prenom          TEXT NOT NULL,
  nom             TEXT NOT NULL,
  email           TEXT NOT NULL,
  telephone       TEXT,
  avatar_url      TEXT,
  code_parrainage TEXT UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "profiles_all_service" ON profiles;
CREATE POLICY "profiles_all_service" ON profiles FOR ALL TO service_role USING (TRUE);
CREATE INDEX IF NOT EXISTS idx_profiles_ville ON profiles(ville_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_profiles_updated_at();

-- ════════════════════════════════════════════════════════════
-- 2. FIX RLS CARTES — un résident voit SES propres cartes
-- ════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cartes_select_own" ON cartes;
CREATE POLICY "cartes_select_own" ON cartes
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- ════════════════════════════════════════════════════════════
-- 3. TABLE OFFRES
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS offres (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id        UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  titre              TEXT NOT NULL,
  description        TEXT,
  type               TEXT NOT NULL DEFAULT 'reduction'
                     CHECK (type IN ('reduction','cadeau','offre_speciale','fidelite')),
  valeur             TEXT,
  conditions         TEXT,
  date_debut         TIMESTAMPTZ DEFAULT NOW(),
  date_fin           TIMESTAMPTZ,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  utilisations_count INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE offres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offres_select_public" ON offres;
CREATE POLICY "offres_select_public" ON offres FOR SELECT TO anon, authenticated USING (active = TRUE);
DROP POLICY IF EXISTS "offres_all_admin" ON offres;
CREATE POLICY "offres_all_admin" ON offres FOR ALL TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "offres_all_service" ON offres;
CREATE POLICY "offres_all_service" ON offres FOR ALL TO service_role USING (TRUE);
-- Commerçant authentifié peut gérer ses propres offres
DROP POLICY IF EXISTS "offres_insert_auth" ON offres;
CREATE POLICY "offres_insert_auth" ON offres FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "offres_update_auth" ON offres;
CREATE POLICY "offres_update_auth" ON offres FOR UPDATE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "offres_delete_auth" ON offres;
CREATE POLICY "offres_delete_auth" ON offres FOR DELETE TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_offres_commerce ON offres(commerce_id);
CREATE INDEX IF NOT EXISTS idx_offres_active ON offres(active) WHERE active = TRUE;

-- ════════════════════════════════════════════════════════════
-- 4. TABLE EVENEMENTS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS evenements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id          UUID NOT NULL REFERENCES villes(id),
  organisateur_type TEXT NOT NULL DEFAULT 'mairie'
                    CHECK (organisateur_type IN ('mairie','commerce','association','club')),
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
  prix              DECIMAL(10,2),
  lien_externe      TEXT,
  openagenda_id     TEXT,
  statut            TEXT NOT NULL DEFAULT 'publie'
                    CHECK (statut IN ('brouillon','publie','annule','termine')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE evenements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evenements_select_public" ON evenements;
CREATE POLICY "evenements_select_public" ON evenements FOR SELECT TO anon, authenticated USING (statut = 'publie' OR is_admin());
DROP POLICY IF EXISTS "evenements_all_admin" ON evenements;
CREATE POLICY "evenements_all_admin" ON evenements FOR ALL TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "evenements_all_service" ON evenements;
CREATE POLICY "evenements_all_service" ON evenements FOR ALL TO service_role USING (TRUE);
DROP POLICY IF EXISTS "evenements_insert_auth" ON evenements;
CREATE POLICY "evenements_insert_auth" ON evenements FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "evenements_update_auth" ON evenements;
CREATE POLICY "evenements_update_auth" ON evenements FOR UPDATE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "evenements_delete_auth" ON evenements;
CREATE POLICY "evenements_delete_auth" ON evenements FOR DELETE TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_evenements_ville ON evenements(ville_id);
CREATE INDEX IF NOT EXISTS idx_evenements_date ON evenements(date_debut);

-- ════════════════════════════════════════════════════════════
-- 5. TABLE ACTUALITES
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS actualites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id    UUID NOT NULL REFERENCES villes(id),
  auteur_type TEXT NOT NULL DEFAULT 'mairie'
              CHECK (auteur_type IN ('mairie','commerce','association','club','admin')),
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
DROP POLICY IF EXISTS "actualites_select_public" ON actualites;
CREATE POLICY "actualites_select_public" ON actualites FOR SELECT TO anon, authenticated USING (publie = TRUE OR is_admin());
DROP POLICY IF EXISTS "actualites_all_admin" ON actualites;
CREATE POLICY "actualites_all_admin" ON actualites FOR ALL TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "actualites_all_service" ON actualites;
CREATE POLICY "actualites_all_service" ON actualites FOR ALL TO service_role USING (TRUE);
DROP POLICY IF EXISTS "actualites_insert_auth" ON actualites;
CREATE POLICY "actualites_insert_auth" ON actualites FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "actualites_update_auth" ON actualites;
CREATE POLICY "actualites_update_auth" ON actualites FOR UPDATE TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "actualites_delete_auth" ON actualites;
CREATE POLICY "actualites_delete_auth" ON actualites FOR DELETE TO authenticated USING (is_admin());
CREATE INDEX IF NOT EXISTS idx_actualites_ville ON actualites(ville_id);

-- ════════════════════════════════════════════════════════════
-- 6. TABLE ASSOCIATIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS associations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id    UUID NOT NULL REFERENCES villes(id),
  nom         TEXT NOT NULL,
  description TEXT,
  categorie   TEXT NOT NULL,
  adresse     TEXT,
  email       TEXT,
  telephone   TEXT,
  site_web    TEXT,
  logo_url    TEXT,
  numero_rna  TEXT,
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE associations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "associations_select_public" ON associations;
CREATE POLICY "associations_select_public" ON associations FOR SELECT TO anon, authenticated USING (actif = TRUE OR is_admin());
DROP POLICY IF EXISTS "associations_all_admin" ON associations;
CREATE POLICY "associations_all_admin" ON associations FOR ALL TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "associations_all_service" ON associations;
CREATE POLICY "associations_all_service" ON associations FOR ALL TO service_role USING (TRUE);
DROP POLICY IF EXISTS "associations_insert_auth" ON associations;
CREATE POLICY "associations_insert_auth" ON associations FOR INSERT TO authenticated WITH CHECK (TRUE);

-- ════════════════════════════════════════════════════════════
-- 7. TABLE PROJETS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS projets (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id   UUID NOT NULL REFERENCES associations(id),
  ville_id         UUID NOT NULL REFERENCES villes(id),
  titre            TEXT NOT NULL,
  description      TEXT NOT NULL,
  objectif_montant DECIMAL,
  montant_collecte DECIMAL NOT NULL DEFAULT 0,
  paliers          JSONB DEFAULT '[]',
  image_url        TEXT,
  date_limite      TIMESTAMPTZ,
  statut           TEXT NOT NULL DEFAULT 'actif'
                   CHECK (statut IN ('brouillon','actif','atteint','cloture')),
  source           TEXT NOT NULL DEFAULT 'local'
                   CHECK (source IN ('local','simplyfot','simplyrugby')),
  source_id        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE projets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projets_select_public" ON projets;
CREATE POLICY "projets_select_public" ON projets FOR SELECT TO anon, authenticated USING (statut IN ('actif','atteint') OR is_admin());
DROP POLICY IF EXISTS "projets_all_admin" ON projets;
CREATE POLICY "projets_all_admin" ON projets FOR ALL TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "projets_all_service" ON projets;
CREATE POLICY "projets_all_service" ON projets FOR ALL TO service_role USING (TRUE);
CREATE INDEX IF NOT EXISTS idx_projets_ville ON projets(ville_id);

-- ════════════════════════════════════════════════════════════
-- 8. TABLE MAIRIE_PROFILES
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mairie_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ville_id   UUID NOT NULL REFERENCES villes(id),
  role       TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('elu','directeur','agent')),
  service    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE mairie_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mairie_select_own" ON mairie_profiles;
CREATE POLICY "mairie_select_own" ON mairie_profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "mairie_insert_own" ON mairie_profiles;
CREATE POLICY "mairie_insert_own" ON mairie_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "mairie_select_admin" ON mairie_profiles;
CREATE POLICY "mairie_select_admin" ON mairie_profiles FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "mairie_all_service" ON mairie_profiles;
CREATE POLICY "mairie_all_service" ON mairie_profiles FOR ALL TO service_role USING (TRUE);
CREATE INDEX IF NOT EXISTS idx_mairie_ville ON mairie_profiles(ville_id);

-- ════════════════════════════════════════════════════════════
-- 9. TABLE SOUTIENS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS soutiens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id    UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  soutien_type TEXT NOT NULL CHECK (soutien_type IN ('resident','commerce','mairie')),
  soutien_id   UUID,
  montant      DECIMAL(10,2),
  message      TEXT,
  anonyme      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE soutiens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "soutiens_select_public" ON soutiens;
CREATE POLICY "soutiens_select_public" ON soutiens FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "soutiens_all_service" ON soutiens;
CREATE POLICY "soutiens_all_service" ON soutiens FOR ALL TO service_role USING (TRUE);

-- ════════════════════════════════════════════════════════════
-- 10. TABLE FAVORIS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS favoris (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  favori_type TEXT NOT NULL CHECK (favori_type IN ('commerce','association','evenement')),
  favori_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, favori_type, favori_id)
);
ALTER TABLE favoris ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "favoris_own" ON favoris;
CREATE POLICY "favoris_own" ON favoris FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "favoris_all_service" ON favoris;
CREATE POLICY "favoris_all_service" ON favoris FOR ALL TO service_role USING (TRUE);

-- ════════════════════════════════════════════════════════════
-- 11. TABLE NOTIFICATIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destinataire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('offre','evenement','projet','actualite','systeme')),
  lien            TEXT,
  lu              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (destinataire_id = auth.uid());
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (destinataire_id = auth.uid());
DROP POLICY IF EXISTS "notifications_all_service" ON notifications;
CREATE POLICY "notifications_all_service" ON notifications FOR ALL TO service_role USING (TRUE);

-- ════════════════════════════════════════════════════════════
-- 12. EXTENSIONS TABLES EXISTANTES
-- ════════════════════════════════════════════════════════════
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS horaires JSONB;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS site_web TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS premium BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE villes ADD COLUMN IF NOT EXISTS code_postal TEXT;
ALTER TABLE villes ADD COLUMN IF NOT EXISTS latitude DECIMAL;
ALTER TABLE villes ADD COLUMN IF NOT EXISTS longitude DECIMAL;
ALTER TABLE villes ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Colonnes cartes pour groupes et tracking
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS commande_groupe_id UUID;
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS ordre_titulaire INTEGER DEFAULT 1;
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;
ALTER TABLE cartes ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;

-- Colonnes commerces pour désactivation
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS email_contact TEXT;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS desactivation_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex');

-- SIRET pour les demandes commerçants
ALTER TABLE commercants_inscrits ADD COLUMN IF NOT EXISTS siret TEXT;

-- Table webhook idempotence
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload         JSONB
);

-- ════════════════════════════════════════════════════════════
-- 13. RPC DASHBOARD MAIRIE
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_dashboard_mairie(p_ville_id UUID)
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'residents', (SELECT count(*) FROM profiles WHERE ville_id = p_ville_id),
    'commerces', (SELECT count(*) FROM commerces WHERE ville_id = p_ville_id AND actif = TRUE),
    'associations', (SELECT count(*) FROM associations WHERE ville_id = p_ville_id AND actif = TRUE),
    'evenements', (SELECT count(*) FROM evenements WHERE ville_id = p_ville_id AND statut = 'publie'),
    'offres', (SELECT count(*) FROM offres o JOIN commerces c ON c.id = o.commerce_id WHERE c.ville_id = p_ville_id AND o.active = TRUE),
    'projets', (SELECT count(*) FROM projets WHERE ville_id = p_ville_id AND statut = 'actif'),
    'cartes_actives', (SELECT cartes_actives FROM villes WHERE id = p_ville_id),
    'visites_total', (SELECT visites_total FROM villes WHERE id = p_ville_id)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Aussi créer get_dashboard_stats comme alias (utilisé par le code frontend)
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_ville_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN get_dashboard_mairie(p_ville_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;
