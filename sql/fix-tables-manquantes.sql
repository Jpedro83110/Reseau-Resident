-- ============================================================
-- FIX TABLES MANQUANTES
-- À exécuter dans Supabase Dashboard > SQL Editor
-- APRÈS migration-v5-fix.sql et fix-rls-permissions.sql
-- ============================================================

BEGIN;

-- 1. COMMERCANT_PROFILES
CREATE TABLE IF NOT EXISTS commercant_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','manager','staff')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE commercant_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cp_select_own" ON commercant_profiles;
CREATE POLICY "cp_select_own" ON commercant_profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "cp_insert_own" ON commercant_profiles;
CREATE POLICY "cp_insert_own" ON commercant_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "cp_all_service" ON commercant_profiles;
CREATE POLICY "cp_all_service" ON commercant_profiles FOR ALL TO service_role USING (TRUE);
CREATE INDEX IF NOT EXISTS idx_cp_commerce ON commercant_profiles(commerce_id);

-- 2. ASSOCIATION_PROFILES
CREATE TABLE IF NOT EXISTS association_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('president','admin','membre')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE association_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ap_select_own" ON association_profiles;
CREATE POLICY "ap_select_own" ON association_profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "ap_insert_own" ON association_profiles;
CREATE POLICY "ap_insert_own" ON association_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "ap_all_service" ON association_profiles;
CREATE POLICY "ap_all_service" ON association_profiles FOR ALL TO service_role USING (TRUE);
CREATE INDEX IF NOT EXISTS idx_ap_asso ON association_profiles(association_id);

-- 3. UTILISATIONS_OFFRES
CREATE TABLE IF NOT EXISTS utilisations_offres (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offre_id         UUID NOT NULL REFERENCES offres(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  commerce_id      UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  date_utilisation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE utilisations_offres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "uo_select_own" ON utilisations_offres;
CREATE POLICY "uo_select_own" ON utilisations_offres FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "uo_insert_own" ON utilisations_offres;
CREATE POLICY "uo_insert_own" ON utilisations_offres FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "uo_all_service" ON utilisations_offres;
CREATE POLICY "uo_all_service" ON utilisations_offres FOR ALL TO service_role USING (TRUE);

-- 4. PARRAINAGES
CREATE TABLE IF NOT EXISTS parrainages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parrain_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filleul_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  statut     TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','valide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parrain_id, filleul_id)
);
ALTER TABLE parrainages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parr_select_own" ON parrainages;
CREATE POLICY "parr_select_own" ON parrainages FOR SELECT TO authenticated USING (parrain_id = auth.uid() OR filleul_id = auth.uid());
DROP POLICY IF EXISTS "parr_insert_own" ON parrainages;
CREATE POLICY "parr_insert_own" ON parrainages FOR INSERT TO authenticated WITH CHECK (filleul_id = auth.uid());
DROP POLICY IF EXISTS "parr_all_service" ON parrainages;
CREATE POLICY "parr_all_service" ON parrainages FOR ALL TO service_role USING (TRUE);

-- 5. CAMPAGNES
CREATE TABLE IF NOT EXISTS campagnes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  ville_id    UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL CHECK (type IN ('mise_en_avant','notification_push','banniere')),
  date_debut  TIMESTAMPTZ,
  date_fin    TIMESTAMPTZ,
  budget      DECIMAL(10,2),
  statut      TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','active','terminee')),
  impressions INTEGER NOT NULL DEFAULT 0,
  clics       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE campagnes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "camp_select_auth" ON campagnes;
CREATE POLICY "camp_select_auth" ON campagnes FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "camp_insert_auth" ON campagnes;
CREATE POLICY "camp_insert_auth" ON campagnes FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "camp_all_service" ON campagnes;
CREATE POLICY "camp_all_service" ON campagnes FOR ALL TO service_role USING (TRUE);

COMMIT;
