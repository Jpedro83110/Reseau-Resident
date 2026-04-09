-- migration-v15-fix-commerces-rls.sql
-- Description : Corriger les RLS sur commerces pour permettre :
--   1. La mairie de créer/modifier des commerces dans sa ville
--   2. Le commerçant de modifier sa propre fiche
--   3. La mairie de supprimer un commerce
-- Date : 2026-04-09
-- À exécuter dans : Supabase Dashboard > SQL Editor

BEGIN;

-- ══════════════════════════════════════════════════════════
-- 1. COMMERCES — Permettre à la mairie d'insérer des commerces
-- ══════════════════════════════════════════════════════════

-- Supprimer les anciennes policies write
DROP POLICY IF EXISTS "commerces_insert_mairie" ON commerces;
DROP POLICY IF EXISTS "commerces_update_mairie" ON commerces;
DROP POLICY IF EXISTS "commerces_delete_mairie" ON commerces;
DROP POLICY IF EXISTS "commerces_update_owner" ON commerces;
DROP POLICY IF EXISTS "commerces_insert_admin" ON commerces;
DROP POLICY IF EXISTS "commerces_update_admin" ON commerces;
DROP POLICY IF EXISTS "commerces_delete_admin" ON commerces;

-- La mairie peut créer des commerces dans sa ville
CREATE POLICY "commerces_insert_mairie" ON commerces
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mairie_profiles mp
      WHERE mp.id = auth.uid() AND mp.ville_id = commerces.ville_id
    )
    OR is_admin()
  );

-- La mairie peut modifier les commerces de sa ville
-- Le commerçant propriétaire peut modifier sa fiche
CREATE POLICY "commerces_update_auth" ON commerces
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mairie_profiles mp
      WHERE mp.id = auth.uid() AND mp.ville_id = commerces.ville_id
    )
    OR is_admin()
  );

-- La mairie et l'admin peuvent supprimer des commerces
CREATE POLICY "commerces_delete_auth" ON commerces
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mairie_profiles mp
      WHERE mp.id = auth.uid() AND mp.ville_id = commerces.ville_id
    )
    OR is_admin()
  );

-- ══════════════════════════════════════════════════════════
-- 2. COMMERCES — Élargir le SELECT pour que le propriétaire voie son commerce même inactif
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "commerces_select_public" ON commerces;
CREATE POLICY "commerces_select_public" ON commerces
  FOR SELECT TO anon, authenticated
  USING (
    actif = TRUE
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mairie_profiles mp
      WHERE mp.id = auth.uid() AND mp.ville_id = commerces.ville_id
    )
    OR is_admin()
  );

-- ══════════════════════════════════════════════════════════
-- 3. COMMERCANT_PROFILES — Permettre à la mairie d'insérer le lien
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "commercant_profiles_insert_mairie" ON commercant_profiles;
CREATE POLICY "commercant_profiles_insert_mairie" ON commercant_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id  -- le commerçant lui-même
    OR EXISTS (SELECT 1 FROM mairie_profiles WHERE id = auth.uid())  -- une mairie
    OR is_admin()
  );

-- ══════════════════════════════════════════════════════════
-- 4. COMMERCANTS_INSCRITS — Permettre à la mairie de voir et modifier les demandes
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "commercants_select_admin" ON commercants_inscrits;
CREATE POLICY "commercants_select_mairie_admin" ON commercants_inscrits
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM mairie_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "commercants_update_mairie" ON commercants_inscrits;
CREATE POLICY "commercants_update_mairie" ON commercants_inscrits
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM mairie_profiles WHERE id = auth.uid())
  );

COMMIT;
