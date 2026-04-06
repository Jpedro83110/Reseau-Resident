-- migration-v13bis-signalements.sql
-- Description : Table des signalements résidents → mairie
-- Date : 2026-04-06
-- À exécuter dans : Supabase Dashboard > SQL Editor

BEGIN;

CREATE TABLE IF NOT EXISTS signalements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id UUID NOT NULL REFERENCES villes(id),
  auteur_id UUID NOT NULL REFERENCES auth.users(id),
  categorie TEXT NOT NULL CHECK (categorie IN ('voirie', 'proprete', 'securite', 'bruit', 'autre')),
  titre TEXT NOT NULL,
  description TEXT,
  adresse TEXT,
  photo_url TEXT,
  statut TEXT NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'en_cours', 'resolu', 'rejete')),
  reponse_mairie TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE signalements ENABLE ROW LEVEL SECURITY;

-- Lecture : auteur voit les siens, mairie voit ceux de sa ville, admin voit tout
CREATE POLICY "signalements_select_own" ON signalements
  FOR SELECT TO authenticated
  USING (
    auteur_id = auth.uid()
    OR EXISTS (SELECT 1 FROM mairie_profiles WHERE id = auth.uid() AND ville_id = signalements.ville_id)
    OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- Insertion : tout résident authentifié
CREATE POLICY "signalements_insert_auth" ON signalements
  FOR INSERT TO authenticated
  WITH CHECK (auteur_id = auth.uid());

-- Mise à jour : mairie de la ville ou admin
CREATE POLICY "signalements_update_mairie" ON signalements
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mairie_profiles WHERE id = auth.uid() AND ville_id = signalements.ville_id)
    OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

CREATE POLICY "signalements_all_service" ON signalements
  FOR ALL TO service_role USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_signalements_ville ON signalements(ville_id);
CREATE INDEX IF NOT EXISTS idx_signalements_statut ON signalements(ville_id, statut);
CREATE INDEX IF NOT EXISTS idx_signalements_auteur ON signalements(auteur_id);

COMMIT;
