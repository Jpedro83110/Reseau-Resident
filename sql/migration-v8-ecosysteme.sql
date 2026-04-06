-- migration-v8-ecosysteme.sql
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Crée les tables manquantes pour l'écosystème complet

BEGIN;

-- ═══ AVIS CLIENTS (NOUVELLE TABLE) ═══
CREATE TABLE IF NOT EXISTS avis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  note INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire TEXT,
  reponse_commerce TEXT,
  publie BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE avis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "avis_select_public" ON avis;
CREATE POLICY "avis_select_public" ON avis FOR SELECT TO anon, authenticated USING (publie = TRUE);
DROP POLICY IF EXISTS "avis_insert_auth" ON avis;
CREATE POLICY "avis_insert_auth" ON avis FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
DROP POLICY IF EXISTS "avis_update_own" ON avis;
CREATE POLICY "avis_update_own" ON avis FOR UPDATE TO authenticated USING (profile_id = auth.uid());
DROP POLICY IF EXISTS "avis_all_service" ON avis;
CREATE POLICY "avis_all_service" ON avis FOR ALL TO service_role USING (TRUE);
CREATE INDEX IF NOT EXISTS idx_avis_commerce ON avis(commerce_id);
CREATE INDEX IF NOT EXISTS idx_avis_profile ON avis(profile_id);

-- ═══ MESSAGES / CONTACT (NOUVELLE TABLE) ═══
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expediteur_id UUID NOT NULL REFERENCES auth.users(id),
  expediteur_type TEXT NOT NULL CHECK (expediteur_type IN ('resident','commerce','association','mairie')),
  sujet TEXT NOT NULL,
  contenu TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  reponse TEXT,
  repondu_le TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select_own" ON messages;
CREATE POLICY "messages_select_own" ON messages FOR SELECT TO authenticated USING (expediteur_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "messages_insert_auth" ON messages;
CREATE POLICY "messages_insert_auth" ON messages FOR INSERT TO authenticated WITH CHECK (expediteur_id = auth.uid());
DROP POLICY IF EXISTS "messages_update_admin" ON messages;
CREATE POLICY "messages_update_admin" ON messages FOR UPDATE TO authenticated USING (is_admin());
DROP POLICY IF EXISTS "messages_all_service" ON messages;
CREATE POLICY "messages_all_service" ON messages FOR ALL TO service_role USING (TRUE);
CREATE INDEX IF NOT EXISTS idx_messages_expediteur ON messages(expediteur_id);

-- ═══ EXTENSIONS COMMERCES (colonnes manquantes) ═══
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS note_moyenne DECIMAL DEFAULT 0;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS avis_count INTEGER DEFAULT 0;
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;

-- ═══ EXTENSIONS ASSOCIATIONS ═══
ALTER TABLE associations ADD COLUMN IF NOT EXISTS nombre_membres INTEGER DEFAULT 0;

-- ═══ TRIGGER : sync note_moyenne quand avis ajouté ═══
CREATE OR REPLACE FUNCTION sync_note_commerce()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE commerces SET
    note_moyenne = (SELECT ROUND(AVG(note)::numeric, 1) FROM avis WHERE commerce_id = COALESCE(NEW.commerce_id, OLD.commerce_id) AND publie = TRUE),
    avis_count = (SELECT COUNT(*) FROM avis WHERE commerce_id = COALESCE(NEW.commerce_id, OLD.commerce_id) AND publie = TRUE)
  WHERE id = COALESCE(NEW.commerce_id, OLD.commerce_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_sync_note_commerce ON avis;
CREATE TRIGGER trg_sync_note_commerce AFTER INSERT OR UPDATE OR DELETE ON avis FOR EACH ROW EXECUTE FUNCTION sync_note_commerce();

-- ═══ Policy pour que le commerçant puisse répondre aux avis ═══
DROP POLICY IF EXISTS "avis_update_commerce" ON avis;
CREATE POLICY "avis_update_commerce" ON avis FOR UPDATE TO authenticated USING (TRUE);

COMMIT;
