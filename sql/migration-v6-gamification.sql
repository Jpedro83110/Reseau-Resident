-- migration-v6-gamification.sql
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Compatible avec la table badges existante (migration-v3 utilise "slug" pas "code")

BEGIN;

-- Points et niveau sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niveau INTEGER NOT NULL DEFAULT 1;

-- La table badges existe déjà (migration-v3) avec : slug, nom, description, icone, condition_type, condition_value
-- On ajoute juste la colonne manquante
ALTER TABLE badges ADD COLUMN IF NOT EXISTS points_gagnes INTEGER NOT NULL DEFAULT 10;

-- RLS badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_select_public" ON badges;
CREATE POLICY "badges_select_public" ON badges FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS "badges_all_service" ON badges;
CREATE POLICY "badges_all_service" ON badges FOR ALL TO service_role USING (TRUE);

-- Badges débloqués par les utilisateurs
CREATE TABLE IF NOT EXISTS badges_utilisateurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id),
  obtenu_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, badge_id)
);
ALTER TABLE badges_utilisateurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bu_select_own" ON badges_utilisateurs;
CREATE POLICY "bu_select_own" ON badges_utilisateurs FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "bu_all_service" ON badges_utilisateurs;
CREATE POLICY "bu_all_service" ON badges_utilisateurs FOR ALL TO service_role USING (TRUE);

-- Défis créés par la mairie
CREATE TABLE IF NOT EXISTS defis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id UUID NOT NULL REFERENCES villes(id),
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'exploration' CHECK (type IN ('exploration','commerce','social','culture','sport','eco')),
  points_recompense INTEGER NOT NULL DEFAULT 20,
  objectif_description TEXT NOT NULL,
  objectif_nombre INTEGER NOT NULL DEFAULT 1,
  date_debut TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin TIMESTAMPTZ,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  participants_count INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE defis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "defis_select_public" ON defis;
CREATE POLICY "defis_select_public" ON defis FOR SELECT TO anon, authenticated USING (actif = TRUE);
DROP POLICY IF EXISTS "defis_all_admin" ON defis;
CREATE POLICY "defis_all_admin" ON defis FOR ALL TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "defis_all_service" ON defis;
CREATE POLICY "defis_all_service" ON defis FOR ALL TO service_role USING (TRUE);
DROP POLICY IF EXISTS "defis_insert_auth" ON defis;
CREATE POLICY "defis_insert_auth" ON defis FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Participation aux défis
CREATE TABLE IF NOT EXISTS defis_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  defi_id UUID NOT NULL REFERENCES defis(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  progression INTEGER NOT NULL DEFAULT 0,
  complete BOOLEAN NOT NULL DEFAULT FALSE,
  complete_le TIMESTAMPTZ,
  inscrit_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(defi_id, profile_id)
);
ALTER TABLE defis_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dp_select_own" ON defis_participants;
CREATE POLICY "dp_select_own" ON defis_participants FOR SELECT TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "dp_insert_own" ON defis_participants;
CREATE POLICY "dp_insert_own" ON defis_participants FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "dp_update_own" ON defis_participants;
CREATE POLICY "dp_update_own" ON defis_participants FOR UPDATE TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "dp_all_service" ON defis_participants;
CREATE POLICY "dp_all_service" ON defis_participants FOR ALL TO service_role USING (TRUE);

-- Badges par défaut — colonnes de la table existante : slug, condition_type, condition_value
INSERT INTO badges (slug, nom, description, icone, condition_type, condition_value, points_gagnes) VALUES
  ('bienvenue', 'Bienvenue !', 'Créez votre compte résident', '👋', 'inscrit', 1, 10),
  ('premiere_visite', 'Première visite', 'Visitez votre premier commerce', '🏪', 'visites_count', 1, 15),
  ('habitue', 'Habitué', 'Visitez 10 commerces', '⭐', 'visites_count', 10, 30),
  ('ambassadeur', 'Ambassadeur', 'Parrainez 3 personnes', '🤝', 'inscrit', 3, 50),
  ('explorateur', 'Explorateur', 'Visitez 5 commerces différents', '🧭', 'commerces_count', 5, 25),
  ('premier_defi', 'Challenger', 'Complétez votre premier défi', '🏆', 'missions_complete', 1, 20),
  ('assidu', 'Assidu', 'Visitez 50 commerces', '💎', 'visites_count', 50, 100),
  ('festivalier', 'Festivalier', 'Participez à 3 événements', '🎉', 'visites_count', 30, 30)
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_defis_ville ON defis(ville_id);
CREATE INDEX IF NOT EXISTS idx_dp_defi ON defis_participants(defi_id);
CREATE INDEX IF NOT EXISTS idx_dp_profile ON defis_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_bu_profile ON badges_utilisateurs(profile_id);

COMMIT;
