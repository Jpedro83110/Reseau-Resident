-- ============================================================
-- CARTE RÉSIDENT — Script SQL Supabase COMPLET v2.0
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

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


-- ════════════════════════════════════════════════════════════
-- INDEX
-- ════════════════════════════════════════════════════════════
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


-- ════════════════════════════════════════════════════════════
-- FONCTIONS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admins WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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

-- RPC: Stats mensuelles agrégées côté serveur
CREATE OR REPLACE FUNCTION get_stats_mensuelles(p_ville_id UUID)
RETURNS TABLE (mois TEXT, visites BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT to_char(date_trunc('month', v.date_visite), 'Mon') AS mois, count(*)::BIGINT AS visites
  FROM visites v
  WHERE v.ville_id = p_ville_id AND v.date_visite >= NOW() - INTERVAL '6 months'
  GROUP BY date_trunc('month', v.date_visite)
  ORDER BY date_trunc('month', v.date_visite);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RPC: Recherche carte par QR token (scan commerçant)
CREATE OR REPLACE FUNCTION get_carte_by_qr(p_qr_token TEXT)
RETURNS TABLE (id UUID, numero TEXT, prenom TEXT, nom_titulaire TEXT, ville_nom TEXT, statut TEXT, date_expiration TIMESTAMPTZ, formule TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.numero, c.prenom, c.nom_titulaire, v.nom, c.statut, c.date_expiration, c.formule
  FROM cartes c JOIN villes v ON v.id = c.ville_id
  WHERE c.qr_token = p_qr_token AND c.statut = 'active' AND c.date_expiration > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════
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

-- ADMINS
CREATE POLICY "admins_select_self" ON admins FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "admins_all_service" ON admins FOR ALL TO service_role USING (TRUE);

-- VILLES
CREATE POLICY "villes_select_public" ON villes FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "villes_admin_write" ON villes FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "villes_write_service" ON villes FOR ALL TO service_role USING (TRUE);

-- COMMERCES
CREATE POLICY "commerces_select_public" ON commerces FOR SELECT TO anon, authenticated USING (actif = TRUE OR is_admin());
CREATE POLICY "commerces_write_service" ON commerces FOR ALL TO service_role USING (TRUE);

-- CARTES
CREATE POLICY "cartes_insert_anon" ON cartes FOR INSERT TO anon, authenticated WITH CHECK (statut = 'en_attente_paiement');
CREATE POLICY "cartes_update_payment" ON cartes FOR UPDATE TO anon, authenticated USING (statut = 'en_attente_paiement') WITH CHECK (statut = 'active');
CREATE POLICY "cartes_select_auth" ON cartes FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "cartes_all_service" ON cartes FOR ALL TO service_role USING (TRUE);

-- VISITES
CREATE POLICY "visites_insert_public" ON visites FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "visites_select_admin" ON visites FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "visites_all_service" ON visites FOR ALL TO service_role USING (TRUE);

-- COMMERCANTS INSCRITS
CREATE POLICY "commercants_insert_public" ON commercants_inscrits FOR INSERT TO anon, authenticated WITH CHECK (statut = 'en_attente');
CREATE POLICY "commercants_select_admin" ON commercants_inscrits FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "commercants_all_service" ON commercants_inscrits FOR ALL TO service_role USING (TRUE);

-- LISTE ATTENTE
CREATE POLICY "attente_insert_public" ON liste_attente FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "attente_all_service" ON liste_attente FOR ALL TO service_role USING (TRUE);

-- CARTES CADEAUX
CREATE POLICY "cadeaux_insert_public" ON cartes_cadeaux FOR INSERT TO anon, authenticated WITH CHECK (statut = 'en_attente_paiement');
CREATE POLICY "cadeaux_update_payment" ON cartes_cadeaux FOR UPDATE TO anon, authenticated USING (statut = 'en_attente_paiement') WITH CHECK (statut = 'active');
CREATE POLICY "cadeaux_select_public" ON cartes_cadeaux FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "cadeaux_all_service" ON cartes_cadeaux FOR ALL TO service_role USING (TRUE);

-- UTILISATIONS CADEAUX
CREATE POLICY "util_insert_public" ON utilisations_cadeaux FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "util_select_admin" ON utilisations_cadeaux FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "util_all_service" ON utilisations_cadeaux FOR ALL TO service_role USING (TRUE);

-- CODES MENSUELS
CREATE POLICY "codes_select_public" ON codes_mensuels FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "codes_all_service" ON codes_mensuels FOR ALL TO service_role USING (TRUE);


-- ════════════════════════════════════════════════════════════
-- DONNÉES INITIALES
-- ════════════════════════════════════════════════════════════
INSERT INTO villes (slug, nom, departement, region, statut, description) VALUES
  ('sanary', 'Sanary-sur-Mer', 'Var', 'PACA', 'actif', 'Ville pilote du programme Carte Résident.'),
  ('bandol', 'Bandol', 'Var', 'PACA', 'bientot', 'Lancement prévu printemps 2026.'),
  ('six-fours', 'Six-Fours-les-Plages', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('ollioules', 'Ollioules', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('la-seyne', 'La Seyne-sur-Mer', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('toulon', 'Toulon', 'Var', 'PACA', 'bientot', 'Préfecture du Var — à venir.'),
  ('le-pradet', 'Le Pradet', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('la-valette', 'La Valette-du-Var', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('la-garde', 'La Garde', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('hyeres', 'Hyères', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('la-crau', 'La Crau', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('carqueiranne', 'Carqueiranne', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('le-revest', 'Le Revest-les-Eaux', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('evenos', 'Évenos', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('le-beausset', 'Le Beausset', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('saint-cyr', 'Saint-Cyr-sur-Mer', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('la-cadiere', 'La Cadière-d''Azur', 'Var', 'PACA', 'bientot', 'En cours de déploiement.'),
  ('le-castellet', 'Le Castellet', 'Var', 'PACA', 'bientot', 'En cours de déploiement.')
ON CONFLICT (slug) DO NOTHING;

-- NOTE: Pour créer un admin:
-- 1. Créez un user via Supabase Auth (email/password)
-- 2. INSERT INTO admins (id, email) VALUES ('uuid-from-auth', 'admin@carte-resident.fr');
