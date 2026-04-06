-- fix-rls-final.sql
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Corrige les policies manquantes pour que TOUT fonctionne

BEGIN;

-- ═══ FIX mairies_inscrites — l'admin doit pouvoir UPDATE et DELETE ═══
DROP POLICY IF EXISTS "mairies_i_update_admin" ON mairies_inscrites;
CREATE POLICY "mairies_i_update_admin" ON mairies_inscrites
  FOR UPDATE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "mairies_i_delete_admin" ON mairies_inscrites;
CREATE POLICY "mairies_i_delete_admin" ON mairies_inscrites
  FOR DELETE TO authenticated USING (is_admin());

-- ═══ FIX villes — l'admin doit pouvoir INSERT de nouvelles villes ═══
-- (la policy villes_admin_write existe normalement, mais vérifions)
DROP POLICY IF EXISTS "villes_admin_insert" ON villes;
CREATE POLICY "villes_admin_insert" ON villes
  FOR INSERT TO authenticated WITH CHECK (is_admin());

-- ═══ FIX mairie_profiles — l'admin doit pouvoir INSERT pour d'autres users ═══
DROP POLICY IF EXISTS "mairie_insert_admin" ON mairie_profiles;
CREATE POLICY "mairie_insert_admin" ON mairie_profiles
  FOR INSERT TO authenticated WITH CHECK (is_admin());

-- ═══ FIX commercant_profiles — l'admin doit pouvoir INSERT pour d'autres users ═══
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commercant_profiles') THEN
    DROP POLICY IF EXISTS "cp_insert_admin" ON commercant_profiles;
    CREATE POLICY "cp_insert_admin" ON commercant_profiles
      FOR INSERT TO authenticated WITH CHECK (is_admin());
  END IF;
END $$;

-- ═══ FIX commerces — l'admin doit pouvoir UPDATE (owner_id, actif, etc.) ═══
DROP POLICY IF EXISTS "commerces_update_admin" ON commerces;
CREATE POLICY "commerces_update_admin" ON commerces
  FOR UPDATE TO authenticated USING (is_admin());

-- ═══ FIX profiles — SELECT pour admin (pour chercher un user par email) ═══
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT TO authenticated USING (is_admin());

-- ═══ FIX cartes — résident voit SES propres cartes ═══
DROP POLICY IF EXISTS "cartes_select_own" ON cartes;
CREATE POLICY "cartes_select_own" ON cartes
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- ═══ FIX commercants_inscrits — l'admin doit pouvoir UPDATE (valider/refuser) ═══
DROP POLICY IF EXISTS "commercants_update_admin" ON commercants_inscrits;
CREATE POLICY "commercants_update_admin" ON commercants_inscrits
  FOR UPDATE TO authenticated USING (is_admin());

COMMIT;
