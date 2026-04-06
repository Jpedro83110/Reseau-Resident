-- ============================================================
-- FIX RLS — Correction "permission denied for table users"
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================
-- CAUSE : les policies utilisent (SELECT email FROM auth.users ...)
--         mais le rôle authenticated ne peut pas lire auth.users
-- FIX : utiliser auth.jwt() ->> 'email' qui lit le JWT directement

BEGIN;

-- ══════════════════════════════════════════════════════════
-- FIX CARTES — la policy qui cause l'erreur
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "cartes_select_own" ON cartes;
CREATE POLICY "cartes_select_own" ON cartes
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Garder la policy admin existante intacte
-- cartes_select_auth : USING (is_admin())  — pas toucher

-- ══════════════════════════════════════════════════════════
-- FIX PROFILES (si la table existe)
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
    DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
    DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
    DROP POLICY IF EXISTS "profiles_all_service" ON profiles;

    CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
    CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
    CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
    CREATE POLICY "profiles_all_service" ON profiles FOR ALL TO service_role USING (TRUE);
    RAISE NOTICE 'OK: policies profiles recréées';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- FIX OFFRES — s'assurer que le commerçant authentifié peut INSERT/UPDATE ses offres
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offres' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "offres_insert_auth" ON offres;
    CREATE POLICY "offres_insert_auth" ON offres FOR INSERT TO authenticated WITH CHECK (TRUE);
    DROP POLICY IF EXISTS "offres_update_auth" ON offres;
    CREATE POLICY "offres_update_auth" ON offres FOR UPDATE TO authenticated USING (TRUE);
    DROP POLICY IF EXISTS "offres_delete_auth" ON offres;
    CREATE POLICY "offres_delete_auth" ON offres FOR DELETE TO authenticated USING (TRUE);
    RAISE NOTICE 'OK: policies offres ajoutées';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- FIX EVENEMENTS — commerçant/mairie authentifié peut INSERT/UPDATE
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evenements' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "evenements_insert_auth" ON evenements;
    CREATE POLICY "evenements_insert_auth" ON evenements FOR INSERT TO authenticated WITH CHECK (TRUE);
    DROP POLICY IF EXISTS "evenements_update_auth" ON evenements;
    CREATE POLICY "evenements_update_auth" ON evenements FOR UPDATE TO authenticated USING (TRUE);
    DROP POLICY IF EXISTS "evenements_delete_auth" ON evenements;
    CREATE POLICY "evenements_delete_auth" ON evenements FOR DELETE TO authenticated USING (is_admin());
    RAISE NOTICE 'OK: policies evenements ajoutées';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- FIX ACTUALITES — mairie authentifié peut INSERT/UPDATE
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'actualites' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "actualites_insert_auth" ON actualites;
    CREATE POLICY "actualites_insert_auth" ON actualites FOR INSERT TO authenticated WITH CHECK (TRUE);
    DROP POLICY IF EXISTS "actualites_update_auth" ON actualites;
    CREATE POLICY "actualites_update_auth" ON actualites FOR UPDATE TO authenticated USING (TRUE);
    DROP POLICY IF EXISTS "actualites_delete_auth" ON actualites;
    CREATE POLICY "actualites_delete_auth" ON actualites FOR DELETE TO authenticated USING (is_admin());
    RAISE NOTICE 'OK: policies actualites ajoutées';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- FIX MAIRIE_PROFILES — ajouter policy SELECT admin
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mairie_profiles' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "mairie_select_own" ON mairie_profiles;
    CREATE POLICY "mairie_select_own" ON mairie_profiles FOR SELECT TO authenticated USING (id = auth.uid());
    DROP POLICY IF EXISTS "mairie_insert_own" ON mairie_profiles;
    CREATE POLICY "mairie_insert_own" ON mairie_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
    DROP POLICY IF EXISTS "mairie_all_service" ON mairie_profiles;
    CREATE POLICY "mairie_all_service" ON mairie_profiles FOR ALL TO service_role USING (TRUE);
    RAISE NOTICE 'OK: policies mairie_profiles recréées';
  END IF;
END $$;

COMMIT;
