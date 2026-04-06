-- migration-v13-scan-workflow.sql
-- Description : RPC améliorée pour le workflow de scan complet
-- Date : 2026-04-06
-- À exécuter dans : Supabase Dashboard > SQL Editor

BEGIN;

-- Ajouter points au profil après scan
CREATE OR REPLACE FUNCTION award_points_after_visit()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_carte_email TEXT;
BEGIN
  -- Trouver le profil lié à la carte scannée
  SELECT email INTO v_carte_email FROM cartes WHERE id = NEW.carte_id;
  IF v_carte_email IS NOT NULL THEN
    UPDATE profiles SET points = COALESCE(points, 0) + 10
    WHERE email = v_carte_email
    RETURNING id INTO v_profile_id;

    -- Insérer notification de points gagnés
    IF v_profile_id IS NOT NULL THEN
      INSERT INTO notifications (destinataire_id, titre, message, type, lien)
      VALUES (v_profile_id, '+10 points !', 'Vous avez gagné 10 points pour votre visite.', 'systeme', '/mon-espace');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_points ON visites;
CREATE TRIGGER trg_award_points
  AFTER INSERT ON visites
  FOR EACH ROW EXECUTE FUNCTION award_points_after_visit();

COMMIT;
