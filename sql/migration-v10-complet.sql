-- migration-v10-complet.sql
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Ajoute le système d'inscription aux événements

BEGIN;

-- ═══ TABLE INSCRIPTIONS ÉVÉNEMENTS ═══
CREATE TABLE IF NOT EXISTS inscriptions_evenements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evenement_id UUID NOT NULL REFERENCES evenements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  prenom TEXT,
  nom TEXT,
  nb_places INTEGER NOT NULL DEFAULT 1,
  statut TEXT NOT NULL DEFAULT 'confirme' CHECK (statut IN ('confirme','annule','en_attente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(evenement_id, user_id)
);

ALTER TABLE inscriptions_evenements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ie_select_public" ON inscriptions_evenements;
CREATE POLICY "ie_select_public" ON inscriptions_evenements
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "ie_insert_auth" ON inscriptions_evenements;
CREATE POLICY "ie_insert_auth" ON inscriptions_evenements
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ie_update_own" ON inscriptions_evenements;
CREATE POLICY "ie_update_own" ON inscriptions_evenements
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ie_all_service" ON inscriptions_evenements;
CREATE POLICY "ie_all_service" ON inscriptions_evenements
  FOR ALL TO service_role USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_ie_evenement ON inscriptions_evenements(evenement_id);
CREATE INDEX IF NOT EXISTS idx_ie_user ON inscriptions_evenements(user_id);

-- ═══ EXTENSIONS TABLE ÉVÉNEMENTS ═══
ALTER TABLE evenements ADD COLUMN IF NOT EXISTS capacite INTEGER;
ALTER TABLE evenements ADD COLUMN IF NOT EXISTS type_acces TEXT DEFAULT 'libre';
ALTER TABLE evenements ADD COLUMN IF NOT EXISTS heure_debut TEXT;
ALTER TABLE evenements ADD COLUMN IF NOT EXISTS heure_fin TEXT;
ALTER TABLE evenements ADD COLUMN IF NOT EXISTS inscrits_count INTEGER DEFAULT 0;

-- ═══ TRIGGER : sync inscrits_count ═══
CREATE OR REPLACE FUNCTION sync_inscrits_count()
RETURNS TRIGGER AS $$
DECLARE v_evt_id UUID;
BEGIN
  v_evt_id := COALESCE(NEW.evenement_id, OLD.evenement_id);
  UPDATE evenements SET inscrits_count = (
    SELECT COUNT(*) FROM inscriptions_evenements
    WHERE evenement_id = v_evt_id AND statut = 'confirme'
  ) WHERE id = v_evt_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_inscrits ON inscriptions_evenements;
CREATE TRIGGER trg_sync_inscrits
  AFTER INSERT OR UPDATE OR DELETE ON inscriptions_evenements
  FOR EACH ROW EXECUTE FUNCTION sync_inscrits_count();

COMMIT;
