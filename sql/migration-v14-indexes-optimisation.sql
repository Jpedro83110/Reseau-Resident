-- migration-v14-indexes-optimisation.sql
-- Description : Indexes supplémentaires pour les nouvelles tables et requêtes
-- Date : 2026-04-06
-- À exécuter dans : Supabase Dashboard > SQL Editor

BEGIN;

CREATE INDEX IF NOT EXISTS idx_utilisations_offres_profile ON utilisations_offres(profile_id);
CREATE INDEX IF NOT EXISTS idx_utilisations_offres_commerce ON utilisations_offres(commerce_id);
CREATE INDEX IF NOT EXISTS idx_notifications_non_lu ON notifications(destinataire_id, lu) WHERE lu = FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_ville ON profiles(ville_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_offres_commerce_active ON offres(commerce_id, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_visites_commerce_date ON visites(commerce_id, date);

COMMIT;
