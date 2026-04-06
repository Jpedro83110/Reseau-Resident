-- fix-rls-mairie-content.sql
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Fix : les mairies peuvent publier des actualités et événements dans leur ville
-- + colonnes branding (logo, couleurs) sur la table villes

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. POLICIES ACTUALITÉS — permettre aux mairies de gérer
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "actualites_mairie_manage" ON actualites;
CREATE POLICY "actualites_mairie_manage" ON actualites
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mairie_profiles
    WHERE mairie_profiles.id = auth.uid()
    AND mairie_profiles.ville_id = actualites.ville_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM mairie_profiles
    WHERE mairie_profiles.id = auth.uid()
    AND mairie_profiles.ville_id = actualites.ville_id
  ));

-- Mairies voient TOUTES les actualités de leur ville (y compris brouillons)
DROP POLICY IF EXISTS "actualites_select_mairie_all" ON actualites;
CREATE POLICY "actualites_select_mairie_all" ON actualites
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mairie_profiles
    WHERE mairie_profiles.id = auth.uid()
    AND mairie_profiles.ville_id = actualites.ville_id
  ));

-- ═══════════════════════════════════════════════════════════════
-- 2. POLICIES ÉVÉNEMENTS — permettre aux mairies de gérer
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "evenements_mairie_manage" ON evenements;
CREATE POLICY "evenements_mairie_manage" ON evenements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mairie_profiles
    WHERE mairie_profiles.id = auth.uid()
    AND mairie_profiles.ville_id = evenements.ville_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM mairie_profiles
    WHERE mairie_profiles.id = auth.uid()
    AND mairie_profiles.ville_id = evenements.ville_id
  ));

-- Mairies voient TOUS les événements de leur ville (y compris brouillons)
DROP POLICY IF EXISTS "evenements_select_mairie_all" ON evenements;
CREATE POLICY "evenements_select_mairie_all" ON evenements
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mairie_profiles
    WHERE mairie_profiles.id = auth.uid()
    AND mairie_profiles.ville_id = evenements.ville_id
  ));

-- ═══════════════════════════════════════════════════════════════
-- 3. POLICIES VILLES — permettre aux mairies de modifier leur ville
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "villes_mairie_update" ON villes;
CREATE POLICY "villes_mairie_update" ON villes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mairie_profiles
    WHERE mairie_profiles.id = auth.uid()
    AND mairie_profiles.ville_id = villes.id
  ));

-- ═══════════════════════════════════════════════════════════════
-- 4. COLONNES BRANDING SUR VILLES
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE villes ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE villes ADD COLUMN IF NOT EXISTS couleur_primaire TEXT DEFAULT '#1a3a5c';
ALTER TABLE villes ADD COLUMN IF NOT EXISTS couleur_secondaire TEXT DEFAULT '#c8963e';

-- Logo dans les demandes mairie (pour l'upload à l'inscription)
ALTER TABLE mairies_inscrites ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMIT;
