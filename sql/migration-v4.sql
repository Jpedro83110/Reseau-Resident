-- migration-v4.sql
-- Description : Migration complète Réseaux-Résident v4.0
--               Crée toutes les nouvelles tables, RLS, policies, indexes,
--               triggers et fonctions RPC documentés dans CLAUDE.md section 4.
-- Date : 2026-03-28
-- Prérequis : supabase-schema.sql v2.0 déjà exécuté
--             (tables admins, villes, commerces, cartes, visites, etc.)
--             La fonction is_admin() (SECURITY DEFINER) doit exister.
-- À exécuter dans : Supabase Dashboard > SQL Editor

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- FONCTION UTILITAIRE : updated_at automatique
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
-- 1. PROFILES (résidents)
-- ════════════════════════════════════════════════════════════════

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

-- Le résident voit et modifie son propre profil
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Les admins gèrent tous les profils
DROP POLICY IF EXISTS "profiles_admin" ON profiles;
CREATE POLICY "profiles_admin"
  ON profiles FOR ALL TO authenticated
  USING (is_admin());

-- NB : policy profiles_mairie_select créée en fin de fichier (dépend de mairie_profiles)

CREATE INDEX IF NOT EXISTS idx_profiles_ville_id ON profiles(ville_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_code_parrainage ON profiles(code_parrainage)
  WHERE code_parrainage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_parrain_id ON profiles(parrain_id)
  WHERE parrain_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════════
-- 2. COMMERCANT_PROFILES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS commercant_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'owner'
              CHECK (role IN ('owner', 'manager', 'staff')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commercant_profiles ENABLE ROW LEVEL SECURITY;

-- Le commerçant voit son propre profil
DROP POLICY IF EXISTS "commercant_profiles_select_own" ON commercant_profiles;
CREATE POLICY "commercant_profiles_select_own"
  ON commercant_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Le commerçant crée son propre profil
DROP POLICY IF EXISTS "commercant_profiles_insert_own" ON commercant_profiles;
CREATE POLICY "commercant_profiles_insert_own"
  ON commercant_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Le commerçant modifie son propre profil
DROP POLICY IF EXISTS "commercant_profiles_update_own" ON commercant_profiles;
CREATE POLICY "commercant_profiles_update_own"
  ON commercant_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin gère tout
DROP POLICY IF EXISTS "commercant_profiles_admin" ON commercant_profiles;
CREATE POLICY "commercant_profiles_admin"
  ON commercant_profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_commercant_profiles_commerce_id
  ON commercant_profiles(commerce_id);

-- ════════════════════════════════════════════════════════════════
-- 3. OFFRES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS offres (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id        UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  titre              TEXT NOT NULL,
  description        TEXT,
  type               TEXT NOT NULL DEFAULT 'reduction'
                     CHECK (type IN ('reduction', 'cadeau', 'offre_speciale', 'programme_fidelite')),
  valeur             TEXT,
  conditions         TEXT,
  date_debut         TIMESTAMPTZ,
  date_fin           TIMESTAMPTZ,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  utilisations_count INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE offres ENABLE ROW LEVEL SECURITY;

-- Tout le monde voit les offres actives
DROP POLICY IF EXISTS "offres_select_anon" ON offres;
CREATE POLICY "offres_select_anon"
  ON offres FOR SELECT TO anon
  USING (active = true);

DROP POLICY IF EXISTS "offres_select_auth" ON offres;
CREATE POLICY "offres_select_auth"
  ON offres FOR SELECT TO authenticated
  USING (true);

-- Le commerçant propriétaire gère ses offres
DROP POLICY IF EXISTS "offres_commercant_manage" ON offres;
CREATE POLICY "offres_commercant_manage"
  ON offres FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commercant_profiles
      WHERE commercant_profiles.commerce_id = offres.commerce_id
        AND commercant_profiles.id = auth.uid()
    )
  );

-- Admin gère tout
DROP POLICY IF EXISTS "offres_admin" ON offres;
CREATE POLICY "offres_admin"
  ON offres FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_offres_commerce_id ON offres(commerce_id);
CREATE INDEX IF NOT EXISTS idx_offres_active ON offres(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_offres_type ON offres(type);

-- Fonction : incrémente utilisations_count dans offres
CREATE OR REPLACE FUNCTION fn_sync_utilisations_offre()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE offres SET utilisations_count = utilisations_count + 1
  WHERE id = NEW.offre_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
-- 4. UTILISATIONS_OFFRES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS utilisations_offres (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offre_id         UUID NOT NULL REFERENCES offres(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  commerce_id      UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  date_utilisation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE utilisations_offres ENABLE ROW LEVEL SECURITY;

-- Le résident voit ses propres utilisations
DROP POLICY IF EXISTS "utilisations_offres_resident_select" ON utilisations_offres;
CREATE POLICY "utilisations_offres_resident_select"
  ON utilisations_offres FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- Le résident peut créer une utilisation pour lui-même
DROP POLICY IF EXISTS "utilisations_offres_resident_insert" ON utilisations_offres;
CREATE POLICY "utilisations_offres_resident_insert"
  ON utilisations_offres FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Le commerçant voit les utilisations de ses offres
DROP POLICY IF EXISTS "utilisations_offres_commercant_select" ON utilisations_offres;
CREATE POLICY "utilisations_offres_commercant_select"
  ON utilisations_offres FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commercant_profiles
      WHERE commercant_profiles.commerce_id = utilisations_offres.commerce_id
        AND commercant_profiles.id = auth.uid()
    )
  );

-- Admin gère tout
DROP POLICY IF EXISTS "utilisations_offres_admin" ON utilisations_offres;
CREATE POLICY "utilisations_offres_admin"
  ON utilisations_offres FOR ALL TO authenticated
  USING (is_admin());

DROP TRIGGER IF EXISTS trg_sync_utilisations_offre ON utilisations_offres;
CREATE TRIGGER trg_sync_utilisations_offre
  AFTER INSERT ON utilisations_offres
  FOR EACH ROW EXECUTE FUNCTION fn_sync_utilisations_offre();

CREATE INDEX IF NOT EXISTS idx_utilisations_offres_profile_id ON utilisations_offres(profile_id);
CREATE INDEX IF NOT EXISTS idx_utilisations_offres_offre_id ON utilisations_offres(offre_id);
CREATE INDEX IF NOT EXISTS idx_utilisations_offres_commerce_id ON utilisations_offres(commerce_id);

-- ════════════════════════════════════════════════════════════════
-- 5. EVENEMENTS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS evenements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id          UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  organisateur_type TEXT NOT NULL
                    CHECK (organisateur_type IN ('mairie', 'commerce', 'association', 'club')),
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
  statut            TEXT NOT NULL DEFAULT 'brouillon'
                    CHECK (statut IN ('brouillon', 'publie', 'annule', 'termine')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE evenements ENABLE ROW LEVEL SECURITY;

-- Tout le monde voit les événements publiés
DROP POLICY IF EXISTS "evenements_select_publie_anon" ON evenements;
CREATE POLICY "evenements_select_publie_anon"
  ON evenements FOR SELECT TO anon
  USING (statut = 'publie');

DROP POLICY IF EXISTS "evenements_select_publie_auth" ON evenements;
CREATE POLICY "evenements_select_publie_auth"
  ON evenements FOR SELECT TO authenticated
  USING (statut = 'publie');

-- Le commerçant gère ses propres événements
DROP POLICY IF EXISTS "evenements_commercant_manage" ON evenements;
CREATE POLICY "evenements_commercant_manage"
  ON evenements FOR ALL TO authenticated
  USING (
    organisateur_type = 'commerce' AND
    EXISTS (
      SELECT 1 FROM commercant_profiles
      WHERE commercant_profiles.id = auth.uid()
        AND commercant_profiles.commerce_id = evenements.organisateur_id
    )
  );

-- NB : policies evenements_asso_manage et evenements_mairie_manage créées en fin de fichier

-- Admin gère tout
DROP POLICY IF EXISTS "evenements_admin" ON evenements;
CREATE POLICY "evenements_admin"
  ON evenements FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_evenements_ville_id ON evenements(ville_id);
CREATE INDEX IF NOT EXISTS idx_evenements_date_debut ON evenements(date_debut);
CREATE INDEX IF NOT EXISTS idx_evenements_statut ON evenements(statut);
CREATE INDEX IF NOT EXISTS idx_evenements_organisateur
  ON evenements(organisateur_type, organisateur_id);

-- ════════════════════════════════════════════════════════════════
-- 6. ACTUALITES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS actualites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id    UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  auteur_type TEXT NOT NULL
              CHECK (auteur_type IN ('mairie', 'commerce', 'association', 'club', 'admin')),
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

-- Tout le monde voit les actualités publiées
DROP POLICY IF EXISTS "actualites_select_publie_anon" ON actualites;
CREATE POLICY "actualites_select_publie_anon"
  ON actualites FOR SELECT TO anon
  USING (publie = true);

DROP POLICY IF EXISTS "actualites_select_publie_auth" ON actualites;
CREATE POLICY "actualites_select_publie_auth"
  ON actualites FOR SELECT TO authenticated
  USING (publie = true);

-- Le commerçant gère ses propres actualités
DROP POLICY IF EXISTS "actualites_commercant_manage" ON actualites;
CREATE POLICY "actualites_commercant_manage"
  ON actualites FOR ALL TO authenticated
  USING (
    auteur_type = 'commerce' AND
    EXISTS (
      SELECT 1 FROM commercant_profiles
      WHERE commercant_profiles.id = auth.uid()
        AND commercant_profiles.commerce_id = actualites.auteur_id
    )
  );

-- NB : policies actualites_asso_manage et actualites_mairie_manage créées en fin de fichier

-- Admin gère tout
DROP POLICY IF EXISTS "actualites_admin" ON actualites;
CREATE POLICY "actualites_admin"
  ON actualites FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_actualites_ville_id ON actualites(ville_id);
CREATE INDEX IF NOT EXISTS idx_actualites_publie ON actualites(publie) WHERE publie = true;
CREATE INDEX IF NOT EXISTS idx_actualites_epingle ON actualites(epingle) WHERE epingle = true;
CREATE INDEX IF NOT EXISTS idx_actualites_auteur
  ON actualites(auteur_type, auteur_id);

-- ════════════════════════════════════════════════════════════════
-- 7. ASSOCIATIONS
-- ════════════════════════════════════════════════════════════════

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

-- Tout le monde voit les associations actives
DROP POLICY IF EXISTS "associations_select_actif_anon" ON associations;
CREATE POLICY "associations_select_actif_anon"
  ON associations FOR SELECT TO anon
  USING (actif = true);

DROP POLICY IF EXISTS "associations_select_actif_auth" ON associations;
CREATE POLICY "associations_select_actif_auth"
  ON associations FOR SELECT TO authenticated
  USING (actif = true);

-- Le responsable asso gère sa propre fiche
DROP POLICY IF EXISTS "associations_asso_manage" ON associations;
CREATE POLICY "associations_asso_manage"
  ON associations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM association_profiles
      WHERE association_profiles.association_id = associations.id
        AND association_profiles.id = auth.uid()
        AND association_profiles.role IN ('president', 'admin')
    )
  );

-- Admin gère tout
DROP POLICY IF EXISTS "associations_admin" ON associations;
CREATE POLICY "associations_admin"
  ON associations FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_associations_ville_id ON associations(ville_id);
CREATE INDEX IF NOT EXISTS idx_associations_actif ON associations(actif) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_associations_categorie ON associations(categorie);

-- ════════════════════════════════════════════════════════════════
-- 8. ASSOCIATION_PROFILES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS association_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'admin'
                 CHECK (role IN ('president', 'admin', 'membre')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE association_profiles ENABLE ROW LEVEL SECURITY;

-- Le responsable voit son propre profil
DROP POLICY IF EXISTS "association_profiles_select_own" ON association_profiles;
CREATE POLICY "association_profiles_select_own"
  ON association_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Le responsable crée son propre profil
DROP POLICY IF EXISTS "association_profiles_insert_own" ON association_profiles;
CREATE POLICY "association_profiles_insert_own"
  ON association_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Le responsable modifie son propre profil
DROP POLICY IF EXISTS "association_profiles_update_own" ON association_profiles;
CREATE POLICY "association_profiles_update_own"
  ON association_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin gère tout
DROP POLICY IF EXISTS "association_profiles_admin" ON association_profiles;
CREATE POLICY "association_profiles_admin"
  ON association_profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_association_profiles_asso_id
  ON association_profiles(association_id);

-- ════════════════════════════════════════════════════════════════
-- 9. PROJETS
-- ════════════════════════════════════════════════════════════════

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
  statut               TEXT NOT NULL DEFAULT 'brouillon'
                       CHECK (statut IN ('brouillon', 'actif', 'atteint', 'cloture')),
  source               TEXT NOT NULL DEFAULT 'local'
                       CHECK (source IN ('local', 'simplyfot', 'simplyrugby')),
  source_id            TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projets ENABLE ROW LEVEL SECURITY;

-- Tout le monde voit les projets actifs ou atteints
DROP POLICY IF EXISTS "projets_select_actif_anon" ON projets;
CREATE POLICY "projets_select_actif_anon"
  ON projets FOR SELECT TO anon
  USING (statut IN ('actif', 'atteint'));

DROP POLICY IF EXISTS "projets_select_auth" ON projets;
CREATE POLICY "projets_select_auth"
  ON projets FOR SELECT TO authenticated
  USING (statut IN ('actif', 'atteint'));

-- L'association gère ses propres projets
DROP POLICY IF EXISTS "projets_asso_manage" ON projets;
CREATE POLICY "projets_asso_manage"
  ON projets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM association_profiles
      WHERE association_profiles.association_id = projets.association_id
        AND association_profiles.id = auth.uid()
    )
  );

-- La mairie voit tous les projets de sa ville (lecture seule)
DROP POLICY IF EXISTS "projets_mairie_select" ON projets;
CREATE POLICY "projets_mairie_select"
  ON projets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mairie_profiles
      WHERE mairie_profiles.id = auth.uid()
        AND mairie_profiles.ville_id = projets.ville_id
    )
  );

-- Admin gère tout
DROP POLICY IF EXISTS "projets_admin" ON projets;
CREATE POLICY "projets_admin"
  ON projets FOR ALL TO authenticated
  USING (is_admin());

DROP TRIGGER IF EXISTS trg_projets_updated_at ON projets;
CREATE TRIGGER trg_projets_updated_at
  BEFORE UPDATE ON projets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_projets_ville_id ON projets(ville_id);
CREATE INDEX IF NOT EXISTS idx_projets_association_id ON projets(association_id);
CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);
CREATE INDEX IF NOT EXISTS idx_projets_source ON projets(source)
  WHERE source <> 'local';

-- ════════════════════════════════════════════════════════════════
-- 10. SOUTIENS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS soutiens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id    UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  soutien_type TEXT NOT NULL
               CHECK (soutien_type IN ('resident', 'commerce', 'mairie')),
  soutien_id   UUID,
  montant      DECIMAL(10, 2),
  message      TEXT,
  anonyme      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE soutiens ENABLE ROW LEVEL SECURITY;

-- Tout le monde voit les soutiens (transparence)
DROP POLICY IF EXISTS "soutiens_select_anon" ON soutiens;
CREATE POLICY "soutiens_select_anon"
  ON soutiens FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "soutiens_select_auth" ON soutiens;
CREATE POLICY "soutiens_select_auth"
  ON soutiens FOR SELECT TO authenticated
  USING (true);

-- Un utilisateur authentifié peut créer un soutien en son nom
DROP POLICY IF EXISTS "soutiens_insert_auth" ON soutiens;
CREATE POLICY "soutiens_insert_auth"
  ON soutiens FOR INSERT TO authenticated
  WITH CHECK (soutien_id = auth.uid());

-- Admin gère tout
DROP POLICY IF EXISTS "soutiens_admin" ON soutiens;
CREATE POLICY "soutiens_admin"
  ON soutiens FOR ALL TO authenticated
  USING (is_admin());

-- Fonction : synchronise montant_collecte dans projets
CREATE OR REPLACE FUNCTION fn_sync_montant_collecte()
RETURNS TRIGGER AS $$
DECLARE
  v_projet_id UUID;
BEGIN
  -- Sur DELETE, NEW est NULL — utiliser OLD
  v_projet_id := COALESCE(NEW.projet_id, OLD.projet_id);
  UPDATE projets
  SET montant_collecte = (
    SELECT COALESCE(SUM(montant), 0)
    FROM soutiens
    WHERE projet_id = v_projet_id
  )
  WHERE id = v_projet_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_montant_collecte ON soutiens;
CREATE TRIGGER trg_sync_montant_collecte
  AFTER INSERT OR UPDATE OR DELETE ON soutiens
  FOR EACH ROW EXECUTE FUNCTION fn_sync_montant_collecte();

CREATE INDEX IF NOT EXISTS idx_soutiens_projet_id ON soutiens(projet_id);
CREATE INDEX IF NOT EXISTS idx_soutiens_soutien ON soutiens(soutien_type, soutien_id);

-- ════════════════════════════════════════════════════════════════
-- 11. MAIRIE_PROFILES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mairie_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ville_id   UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'agent'
             CHECK (role IN ('elu', 'directeur', 'agent')),
  service    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mairie_profiles ENABLE ROW LEVEL SECURITY;

-- L'agent/élu voit son propre profil
DROP POLICY IF EXISTS "mairie_profiles_select_own" ON mairie_profiles;
CREATE POLICY "mairie_profiles_select_own"
  ON mairie_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- L'agent/élu crée son propre profil
DROP POLICY IF EXISTS "mairie_profiles_insert_own" ON mairie_profiles;
CREATE POLICY "mairie_profiles_insert_own"
  ON mairie_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- L'agent/élu modifie son propre profil
DROP POLICY IF EXISTS "mairie_profiles_update_own" ON mairie_profiles;
CREATE POLICY "mairie_profiles_update_own"
  ON mairie_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin gère tout
DROP POLICY IF EXISTS "mairie_profiles_admin" ON mairie_profiles;
CREATE POLICY "mairie_profiles_admin"
  ON mairie_profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_mairie_profiles_ville_id ON mairie_profiles(ville_id);

-- ════════════════════════════════════════════════════════════════
-- 12. FAVORIS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS favoris (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  favori_type TEXT NOT NULL
              CHECK (favori_type IN ('commerce', 'association', 'evenement')),
  favori_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, favori_type, favori_id)
);

ALTER TABLE favoris ENABLE ROW LEVEL SECURITY;

-- Le résident gère ses propres favoris
DROP POLICY IF EXISTS "favoris_own" ON favoris;
CREATE POLICY "favoris_own"
  ON favoris FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Admin voit tout
DROP POLICY IF EXISTS "favoris_admin" ON favoris;
CREATE POLICY "favoris_admin"
  ON favoris FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_favoris_profile_id ON favoris(profile_id);
CREATE INDEX IF NOT EXISTS idx_favoris_type_id ON favoris(favori_type, favori_id);

-- ════════════════════════════════════════════════════════════════
-- 13. NOTIFICATIONS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destinataire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN ('offre', 'evenement', 'projet', 'actualite', 'systeme')),
  lien            TEXT,
  lu              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- L'utilisateur voit ses propres notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT TO authenticated
  USING (destinataire_id = auth.uid());

-- L'utilisateur peut marquer ses notifications comme lues
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (destinataire_id = auth.uid());

-- Les admins et service_role peuvent créer des notifications
DROP POLICY IF EXISTS "notifications_admin_insert" ON notifications;
CREATE POLICY "notifications_admin_insert"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Admin gère tout
DROP POLICY IF EXISTS "notifications_admin_all" ON notifications;
CREATE POLICY "notifications_admin_all"
  ON notifications FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_notifications_destinataire_id ON notifications(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_notifications_non_lu
  ON notifications(destinataire_id) WHERE lu = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ════════════════════════════════════════════════════════════════
-- 14. PARRAINAGES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS parrainages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parrain_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filleul_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  statut     TEXT NOT NULL DEFAULT 'en_attente'
             CHECK (statut IN ('en_attente', 'valide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parrain_id, filleul_id)
);

ALTER TABLE parrainages ENABLE ROW LEVEL SECURITY;

-- Le parrain et le filleul voient leur parrainage
DROP POLICY IF EXISTS "parrainages_select_own" ON parrainages;
CREATE POLICY "parrainages_select_own"
  ON parrainages FOR SELECT TO authenticated
  USING (parrain_id = auth.uid() OR filleul_id = auth.uid());

-- Un utilisateur authentifié peut créer un parrainage (en tant que filleul)
DROP POLICY IF EXISTS "parrainages_insert_auth" ON parrainages;
CREATE POLICY "parrainages_insert_auth"
  ON parrainages FOR INSERT TO authenticated
  WITH CHECK (filleul_id = auth.uid());

-- Admin gère tout
DROP POLICY IF EXISTS "parrainages_admin" ON parrainages;
CREATE POLICY "parrainages_admin"
  ON parrainages FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_parrainages_parrain_id ON parrainages(parrain_id);
CREATE INDEX IF NOT EXISTS idx_parrainages_filleul_id ON parrainages(filleul_id);

-- ════════════════════════════════════════════════════════════════
-- 15. CAMPAGNES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS campagnes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  ville_id    UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL
              CHECK (type IN ('mise_en_avant', 'notification_push', 'banniere')),
  date_debut  TIMESTAMPTZ,
  date_fin    TIMESTAMPTZ,
  budget      DECIMAL(10, 2),
  statut      TEXT NOT NULL DEFAULT 'brouillon'
              CHECK (statut IN ('brouillon', 'active', 'terminee')),
  impressions INTEGER NOT NULL DEFAULT 0,
  clics       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campagnes ENABLE ROW LEVEL SECURITY;

-- Le commerçant gère ses propres campagnes
DROP POLICY IF EXISTS "campagnes_commercant_manage" ON campagnes;
CREATE POLICY "campagnes_commercant_manage"
  ON campagnes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commercant_profiles
      WHERE commercant_profiles.commerce_id = campagnes.commerce_id
        AND commercant_profiles.id = auth.uid()
    )
  );

-- La mairie voit les campagnes de sa ville (lecture seule)
DROP POLICY IF EXISTS "campagnes_mairie_select" ON campagnes;
CREATE POLICY "campagnes_mairie_select"
  ON campagnes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mairie_profiles
      WHERE mairie_profiles.id = auth.uid()
        AND mairie_profiles.ville_id = campagnes.ville_id
    )
  );

-- Admin gère tout
DROP POLICY IF EXISTS "campagnes_admin" ON campagnes;
CREATE POLICY "campagnes_admin"
  ON campagnes FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_campagnes_commerce_id ON campagnes(commerce_id);
CREATE INDEX IF NOT EXISTS idx_campagnes_ville_id ON campagnes(ville_id);
CREATE INDEX IF NOT EXISTS idx_campagnes_statut ON campagnes(statut);

-- ════════════════════════════════════════════════════════════════
-- EXTENSIONS TABLE COMMERCES (+10 colonnes)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE commerces
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS horaires       JSONB,
  ADD COLUMN IF NOT EXISTS photos         JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS site_web       TEXT,
  ADD COLUMN IF NOT EXISTS latitude       DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude      DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS siret          TEXT,
  ADD COLUMN IF NOT EXISTS premium                BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS premium_depuis         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_commerces_owner_id
  ON commerces(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commerces_premium
  ON commerces(premium) WHERE premium = true;
CREATE INDEX IF NOT EXISTS idx_commerces_ville_id_actif
  ON commerces(ville_id) WHERE actif = true;
CREATE INDEX IF NOT EXISTS idx_commerces_stripe_customer_id
  ON commerces(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- EXTENSIONS TABLE VILLES (+10 colonnes)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE villes
  ADD COLUMN IF NOT EXISTS associations_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evenements_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projets_actifs_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS population           INTEGER,
  ADD COLUMN IF NOT EXISTS code_postal          TEXT,
  ADD COLUMN IF NOT EXISTS code_insee           TEXT,
  ADD COLUMN IF NOT EXISTS latitude             DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude            DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS logo_url             TEXT,
  ADD COLUMN IF NOT EXISTS site_web             TEXT;

CREATE INDEX IF NOT EXISTS idx_villes_code_postal ON villes(code_postal)
  WHERE code_postal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_villes_code_insee ON villes(code_insee)
  WHERE code_insee IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- TRIGGERS : synchronisation compteurs dénormalisés dans villes
-- ════════════════════════════════════════════════════════════════

-- Compteur associations actives par ville
CREATE OR REPLACE FUNCTION fn_sync_associations_count()
RETURNS TRIGGER AS $$
DECLARE
  v_ville_id UUID;
BEGIN
  -- Déterminer la ville_id concernée
  IF TG_OP = 'DELETE' THEN
    v_ville_id := OLD.ville_id;
  ELSE
    v_ville_id := NEW.ville_id;
  END IF;

  UPDATE villes
  SET associations_count = (
    SELECT COUNT(*) FROM associations
    WHERE associations.ville_id = v_ville_id AND actif = true
  )
  WHERE id = v_ville_id;

  -- Si changement de ville (UPDATE), recalculer l'ancienne ville aussi
  IF TG_OP = 'UPDATE' AND OLD.ville_id IS DISTINCT FROM NEW.ville_id THEN
    UPDATE villes
    SET associations_count = (
      SELECT COUNT(*) FROM associations
      WHERE associations.ville_id = OLD.ville_id AND actif = true
    )
    WHERE id = OLD.ville_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_associations_count ON associations;
CREATE TRIGGER trg_sync_associations_count
  AFTER INSERT OR UPDATE OR DELETE ON associations
  FOR EACH ROW EXECUTE FUNCTION fn_sync_associations_count();

-- Compteur événements publiés par ville
CREATE OR REPLACE FUNCTION fn_sync_evenements_count()
RETURNS TRIGGER AS $$
DECLARE
  v_ville_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ville_id := OLD.ville_id;
  ELSE
    v_ville_id := NEW.ville_id;
  END IF;

  UPDATE villes
  SET evenements_count = (
    SELECT COUNT(*) FROM evenements
    WHERE evenements.ville_id = v_ville_id AND statut = 'publie'
  )
  WHERE id = v_ville_id;

  IF TG_OP = 'UPDATE' AND OLD.ville_id IS DISTINCT FROM NEW.ville_id THEN
    UPDATE villes
    SET evenements_count = (
      SELECT COUNT(*) FROM evenements
      WHERE evenements.ville_id = OLD.ville_id AND statut = 'publie'
    )
    WHERE id = OLD.ville_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_evenements_count ON evenements;
CREATE TRIGGER trg_sync_evenements_count
  AFTER INSERT OR UPDATE OR DELETE ON evenements
  FOR EACH ROW EXECUTE FUNCTION fn_sync_evenements_count();

-- Compteur projets actifs par ville
CREATE OR REPLACE FUNCTION fn_sync_projets_actifs_count()
RETURNS TRIGGER AS $$
DECLARE
  v_ville_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_ville_id := OLD.ville_id;
  ELSE
    v_ville_id := NEW.ville_id;
  END IF;

  UPDATE villes
  SET projets_actifs_count = (
    SELECT COUNT(*) FROM projets
    WHERE projets.ville_id = v_ville_id AND statut = 'actif'
  )
  WHERE id = v_ville_id;

  IF TG_OP = 'UPDATE' AND OLD.ville_id IS DISTINCT FROM NEW.ville_id THEN
    UPDATE villes
    SET projets_actifs_count = (
      SELECT COUNT(*) FROM projets
      WHERE projets.ville_id = OLD.ville_id AND statut = 'actif'
    )
    WHERE id = OLD.ville_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_projets_actifs_count ON projets;
CREATE TRIGGER trg_sync_projets_actifs_count
  AFTER INSERT OR UPDATE OR DELETE ON projets
  FOR EACH ROW EXECUTE FUNCTION fn_sync_projets_actifs_count();

-- ════════════════════════════════════════════════════════════════
-- FONCTIONS RPC
-- ════════════════════════════════════════════════════════════════

-- get_dashboard_stats(p_ville_id)
-- Retourne les KPIs pour le dashboard mairie
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_ville_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'residents_count',
    (SELECT COUNT(*) FROM profiles WHERE ville_id = p_ville_id),

    'commerces_count',
    (SELECT COUNT(*) FROM commerces WHERE ville_id = p_ville_id AND actif = true),

    'associations_count',
    (SELECT COUNT(*) FROM associations WHERE ville_id = p_ville_id AND actif = true),

    'evenements_count',
    (SELECT COUNT(*) FROM evenements WHERE ville_id = p_ville_id AND statut = 'publie'),

    'projets_actifs_count',
    (SELECT COUNT(*) FROM projets WHERE ville_id = p_ville_id AND statut = 'actif'),

    'offres_actives_count',
    (SELECT COUNT(*) FROM offres
     WHERE active = true
       AND commerce_id IN (SELECT id FROM commerces WHERE ville_id = p_ville_id AND actif = true)),

    'visites_total',
    (SELECT COALESCE(visites_total, 0) FROM villes WHERE id = p_ville_id),

    'cartes_actives_count',
    (SELECT COALESCE(SUM(cartes_actives), 0) FROM villes WHERE id = p_ville_id),

    'soutiens_total',
    (SELECT COALESCE(SUM(montant), 0) FROM soutiens
     WHERE projet_id IN (SELECT id FROM projets WHERE ville_id = p_ville_id)),

    'parrainages_valides',
    (SELECT COUNT(*) FROM parrainages
     WHERE statut = 'valide'
       AND parrain_id IN (SELECT id FROM profiles WHERE ville_id = p_ville_id))
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_projets_ville(p_ville_id)
-- Retourne les projets actifs d'une ville avec détails association et progression
CREATE OR REPLACE FUNCTION get_projets_ville(p_ville_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(projet ORDER BY projet.created_at DESC), '[]'::json)
  FROM (
    SELECT
      p.id,
      p.titre,
      p.description,
      p.objectif_montant,
      p.montant_collecte,
      p.objectif_description,
      p.paliers,
      p.image_url,
      p.date_limite,
      p.statut,
      p.source,
      p.created_at,
      json_build_object(
        'id', a.id,
        'nom', a.nom,
        'categorie', a.categorie,
        'logo_url', a.logo_url
      ) AS association,
      CASE
        WHEN p.objectif_montant > 0
        THEN ROUND((p.montant_collecte / p.objectif_montant * 100)::numeric, 1)
        ELSE 0
      END AS progression_pct,
      (SELECT COUNT(*) FROM soutiens WHERE projet_id = p.id) AS nb_soutiens
    FROM projets p
    JOIN associations a ON a.id = p.association_id
    WHERE p.ville_id = p_ville_id
      AND p.statut IN ('actif', 'atteint')
  ) AS projet
  INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
-- POLICIES DIFFÉRÉES (dépendent de tables créées plus haut)
-- ════════════════════════════════════════════════════════════════

-- La mairie voit les profils de sa ville (lecture seule)
DROP POLICY IF EXISTS "profiles_mairie_select" ON profiles;
CREATE POLICY "profiles_mairie_select"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mairie_profiles
      WHERE mairie_profiles.id = auth.uid()
        AND mairie_profiles.ville_id = profiles.ville_id
    )
  );

-- L'association gère ses propres événements
DROP POLICY IF EXISTS "evenements_asso_manage" ON evenements;
CREATE POLICY "evenements_asso_manage"
  ON evenements FOR ALL TO authenticated
  USING (
    organisateur_type IN ('association', 'club') AND
    EXISTS (
      SELECT 1 FROM association_profiles
      WHERE association_profiles.id = auth.uid()
        AND association_profiles.association_id = evenements.organisateur_id
    )
  );

-- La mairie gère les événements de sa ville
DROP POLICY IF EXISTS "evenements_mairie_manage" ON evenements;
CREATE POLICY "evenements_mairie_manage"
  ON evenements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mairie_profiles
      WHERE mairie_profiles.id = auth.uid()
        AND mairie_profiles.ville_id = evenements.ville_id
    )
  );

-- L'association gère ses propres actualités
DROP POLICY IF EXISTS "actualites_asso_manage" ON actualites;
CREATE POLICY "actualites_asso_manage"
  ON actualites FOR ALL TO authenticated
  USING (
    auteur_type IN ('association', 'club') AND
    EXISTS (
      SELECT 1 FROM association_profiles
      WHERE association_profiles.id = auth.uid()
        AND association_profiles.association_id = actualites.auteur_id
    )
  );

-- La mairie gère les actualités de sa ville
DROP POLICY IF EXISTS "actualites_mairie_manage" ON actualites;
CREATE POLICY "actualites_mairie_manage"
  ON actualites FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mairie_profiles
      WHERE mairie_profiles.id = auth.uid()
        AND mairie_profiles.ville_id = actualites.ville_id
    )
  );

-- Policy INSERT notifications pour service_role (serverless functions)
-- Le service_role bypasse RLS par défaut, cette policy couvre les cas admin
DROP POLICY IF EXISTS "notifications_service_insert" ON notifications;
CREATE POLICY "notifications_service_insert"
  ON notifications FOR INSERT TO service_role
  WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRATION
-- ════════════════════════════════════════════════════════════════

COMMIT;
