-- migration-v9-mairie-inscription.sql
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Crée la table pour les demandes d'inscription mairie

BEGIN;

CREATE TABLE IF NOT EXISTS mairies_inscrites (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom_commune         TEXT NOT NULL,
  code_postal         TEXT NOT NULL,
  departement         TEXT,
  population          INTEGER,
  nom_responsable     TEXT NOT NULL,
  prenom_responsable  TEXT NOT NULL,
  fonction            TEXT NOT NULL,
  email               TEXT NOT NULL,
  telephone           TEXT,
  motivation          TEXT,
  site_web            TEXT,
  statut              TEXT NOT NULL DEFAULT 'en_attente'
                      CHECK (statut IN ('en_attente','valide','refuse')),
  user_id             UUID,
  ville_id            UUID REFERENCES villes(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mairies_inscrites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mairies_i_insert" ON mairies_inscrites;
CREATE POLICY "mairies_i_insert" ON mairies_inscrites
  FOR INSERT TO anon, authenticated WITH CHECK (statut = 'en_attente');

DROP POLICY IF EXISTS "mairies_i_select_admin" ON mairies_inscrites;
CREATE POLICY "mairies_i_select_admin" ON mairies_inscrites
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "mairies_i_select_own" ON mairies_inscrites;
CREATE POLICY "mairies_i_select_own" ON mairies_inscrites
  FOR SELECT TO authenticated USING (email = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "mairies_i_all_service" ON mairies_inscrites;
CREATE POLICY "mairies_i_all_service" ON mairies_inscrites
  FOR ALL TO service_role USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_mairies_i_statut ON mairies_inscrites(statut);
CREATE INDEX IF NOT EXISTS idx_mairies_i_email ON mairies_inscrites(email);

COMMIT;
