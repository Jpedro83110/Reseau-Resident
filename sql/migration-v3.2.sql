-- migration-v3.2.sql
-- Description : Ajout de toutes les nouvelles tables Réseaux-Résident + extensions
-- Date : 2026-03-28
-- Prérequis : supabase-schema.sql v2.0 déjà exécuté (tables admins, villes,
--             commerces, cartes, visites, etc. existent déjà)
--             La fonction is_admin() (SECURITY DEFINER) doit exister.
-- À exécuter dans : Supabase Dashboard > SQL Editor

BEGIN;

-- ── FONCTION updated_at (idempotente) ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 1. PROFILES (résidents) ───────────────────────────────────
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

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin"
  ON profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_profiles_ville_id ON profiles(ville_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_code_parrainage ON profiles(code_parrainage)
  WHERE code_parrainage IS NOT NULL;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 2. COMMERCANT_PROFILES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS commercant_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'owner'
              CHECK (role IN ('owner', 'manager', 'staff')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commercant_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commercant_profiles_select_own"
  ON commercant_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "commercant_profiles_insert_own"
  ON commercant_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "commercant_profiles_update_own"
  ON commercant_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "commercant_profiles_admin"
  ON commercant_profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_commercant_profiles_commerce_id
  ON commercant_profiles(commerce_id);

-- ── 3. OFFRES ─────────────────────────────────────────────────
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

CREATE POLICY "offres_select_anon"
  ON offres FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "offres_select_auth"
  ON offres FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "offres_commercant_manage"
  ON offres FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commercant_profiles
      WHERE commercant_profiles.commerce_id = offres.commerce_id
        AND commercant_profiles.id = auth.uid()
    )
  );

CREATE POLICY "offres_admin"
  ON offres FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_offres_commerce_id ON offres(commerce_id);
CREATE INDEX IF NOT EXISTS idx_offres_active ON offres(active) WHERE active = true;

-- Trigger : incrémente utilisations_count
CREATE OR REPLACE FUNCTION fn_sync_utilisations_offre()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE offres SET utilisations_count = utilisations_count + 1
  WHERE id = NEW.offre_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. UTILISATIONS_OFFRES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisations_offres (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offre_id         UUID NOT NULL REFERENCES offres(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  commerce_id      UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  date_utilisation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE utilisations_offres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utilisations_offres_resident_select"
  ON utilisations_offres FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "utilisations_offres_resident_insert"
  ON utilisations_offres FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "utilisations_offres_admin"
  ON utilisations_offres FOR ALL TO authenticated
  USING (is_admin());

CREATE TRIGGER trg_sync_utilisations_offre
  AFTER INSERT ON utilisations_offres
  FOR EACH ROW EXECUTE FUNCTION fn_sync_utilisations_offre();

CREATE INDEX IF NOT EXISTS idx_utilisations_offres_profile_id ON utilisations_offres(profile_id);
CREATE INDEX IF NOT EXISTS idx_utilisations_offres_offre_id ON utilisations_offres(offre_id);
CREATE INDEX IF NOT EXISTS idx_utilisations_offres_commerce_id ON utilisations_offres(commerce_id);

-- ── 5. EVENEMENTS ─────────────────────────────────────────────
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

CREATE POLICY "evenements_select_publie_anon"
  ON evenements FOR SELECT TO anon
  USING (statut = 'publie');

CREATE POLICY "evenements_select_publie_auth"
  ON evenements FOR SELECT TO authenticated
  USING (statut = 'publie');

CREATE POLICY "evenements_admin"
  ON evenements FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_evenements_ville_id ON evenements(ville_id);
CREATE INDEX IF NOT EXISTS idx_evenements_date_debut ON evenements(date_debut);
CREATE INDEX IF NOT EXISTS idx_evenements_statut ON evenements(statut);

-- ── 6. ACTUALITES ─────────────────────────────────────────────
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

CREATE POLICY "actualites_select_publie_anon"
  ON actualites FOR SELECT TO anon
  USING (publie = true);

CREATE POLICY "actualites_select_publie_auth"
  ON actualites FOR SELECT TO authenticated
  USING (publie = true);

CREATE POLICY "actualites_admin"
  ON actualites FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_actualites_ville_id ON actualites(ville_id);
CREATE INDEX IF NOT EXISTS idx_actualites_publie ON actualites(publie) WHERE publie = true;
CREATE INDEX IF NOT EXISTS idx_actualites_epingle ON actualites(epingle) WHERE epingle = true;

-- ── 7. ASSOCIATIONS ───────────────────────────────────────────
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

CREATE POLICY "associations_select_actif_anon"
  ON associations FOR SELECT TO anon
  USING (actif = true);

CREATE POLICY "associations_select_actif_auth"
  ON associations FOR SELECT TO authenticated
  USING (actif = true);

CREATE POLICY "associations_admin"
  ON associations FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_associations_ville_id ON associations(ville_id);
CREATE INDEX IF NOT EXISTS idx_associations_actif ON associations(actif) WHERE actif = true;

-- ── 8. ASSOCIATION_PROFILES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS association_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'admin'
                 CHECK (role IN ('president', 'admin', 'membre')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE association_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "association_profiles_select_own"
  ON association_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "association_profiles_admin"
  ON association_profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_association_profiles_asso_id
  ON association_profiles(association_id);

-- ── 9. PROJETS ────────────────────────────────────────────────
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

CREATE POLICY "projets_select_actif_anon"
  ON projets FOR SELECT TO anon
  USING (statut = 'actif');

CREATE POLICY "projets_select_auth"
  ON projets FOR SELECT TO authenticated
  USING (statut IN ('actif', 'atteint'));

CREATE POLICY "projets_asso_manage"
  ON projets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM association_profiles
      WHERE association_profiles.association_id = projets.association_id
        AND association_profiles.id = auth.uid()
    )
  );

CREATE POLICY "projets_admin"
  ON projets FOR ALL TO authenticated
  USING (is_admin());

CREATE TRIGGER trg_projets_updated_at
  BEFORE UPDATE ON projets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_projets_ville_id ON projets(ville_id);
CREATE INDEX IF NOT EXISTS idx_projets_association_id ON projets(association_id);
CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);

-- ── 10. SOUTIENS ──────────────────────────────────────────────
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

CREATE POLICY "soutiens_select_public_anon"
  ON soutiens FOR SELECT TO anon
  USING (true);

CREATE POLICY "soutiens_select_public_auth"
  ON soutiens FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "soutiens_insert_auth"
  ON soutiens FOR INSERT TO authenticated
  WITH CHECK (soutien_id = auth.uid());

CREATE POLICY "soutiens_admin"
  ON soutiens FOR ALL TO authenticated
  USING (is_admin());

CREATE OR REPLACE FUNCTION fn_sync_montant_collecte()
RETURNS TRIGGER AS $$
DECLARE
  v_projet_id UUID;
BEGIN
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

CREATE TRIGGER trg_sync_montant_collecte
  AFTER INSERT OR UPDATE OR DELETE ON soutiens
  FOR EACH ROW EXECUTE FUNCTION fn_sync_montant_collecte();

CREATE INDEX IF NOT EXISTS idx_soutiens_projet_id ON soutiens(projet_id);

-- ── 11. MAIRIE_PROFILES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS mairie_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ville_id   UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'agent'
             CHECK (role IN ('elu', 'directeur', 'agent')),
  service    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mairie_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mairie_profiles_select_own"
  ON mairie_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "mairie_profiles_admin"
  ON mairie_profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_mairie_profiles_ville_id ON mairie_profiles(ville_id);

-- ── 12. FAVORIS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favoris (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  favori_type TEXT NOT NULL CHECK (favori_type IN ('commerce', 'association', 'evenement')),
  favori_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, favori_type, favori_id)
);

ALTER TABLE favoris ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favoris_own"
  ON favoris FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_favoris_profile_id ON favoris(profile_id);

-- ── 13. NOTIFICATIONS ─────────────────────────────────────────
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

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT TO authenticated
  USING (destinataire_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (destinataire_id = auth.uid());

CREATE POLICY "notifications_admin_insert"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_notifications_destinataire_id ON notifications(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_notifications_non_lu
  ON notifications(destinataire_id) WHERE lu = false;

-- ── 14. PARRAINAGES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parrainages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parrain_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filleul_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  statut     TEXT NOT NULL DEFAULT 'en_attente'
             CHECK (statut IN ('en_attente', 'valide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE parrainages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parrainages_select_own"
  ON parrainages FOR SELECT TO authenticated
  USING (parrain_id = auth.uid() OR filleul_id = auth.uid());

CREATE POLICY "parrainages_admin"
  ON parrainages FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_parrainages_parrain_id ON parrainages(parrain_id);
CREATE INDEX IF NOT EXISTS idx_parrainages_filleul_id ON parrainages(filleul_id);

-- ── 15. CAMPAGNES ─────────────────────────────────────────────
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

CREATE POLICY "campagnes_commercant_own"
  ON campagnes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commercant_profiles
      WHERE commercant_profiles.commerce_id = campagnes.commerce_id
        AND commercant_profiles.id = auth.uid()
    )
  );

CREATE POLICY "campagnes_admin"
  ON campagnes FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_campagnes_commerce_id ON campagnes(commerce_id);
CREATE INDEX IF NOT EXISTS idx_campagnes_ville_id ON campagnes(ville_id);

-- ── EXTENSIONS TABLE COMMERCES ────────────────────────────────
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
  ADD COLUMN IF NOT EXISTS owner_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commerces_owner_id
  ON commerces(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commerces_premium
  ON commerces(premium) WHERE premium = true;

-- ── EXTENSIONS TABLE VILLES ───────────────────────────────────
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

COMMIT;
