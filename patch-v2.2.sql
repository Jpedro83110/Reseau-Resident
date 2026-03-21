-- ============================================================
-- PATCH v2.2 — Activation automatique des villes
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ══ 1. Trigger : quand un commerce est activé dans une ville,
--       la ville passe automatiquement en "actif" ══════════════

CREATE OR REPLACE FUNCTION auto_activer_ville()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand un commerce passe à actif dans une ville "bientot"
  IF NEW.actif = TRUE THEN
    UPDATE villes
    SET statut = 'actif'
    WHERE id = NEW.ville_id
      AND statut = 'bientot';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_activer_ville ON commerces;
CREATE TRIGGER trg_auto_activer_ville
  AFTER INSERT OR UPDATE ON commerces
  FOR EACH ROW EXECUTE FUNCTION auto_activer_ville();


-- ══ 2. RPC pour créer une ville à la volée si elle n'existe pas
--       (appelée quand un admin valide un commerce d'une nouvelle ville) ══

CREATE OR REPLACE FUNCTION get_or_create_ville(
  p_nom TEXT,
  p_departement TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_slug TEXT;
BEGIN
  -- Chercher la ville existante par nom (insensible à la casse)
  SELECT id INTO v_id FROM villes
  WHERE lower(nom) = lower(p_nom)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Créer un slug propre
  v_slug := lower(p_nom);
  v_slug := replace(v_slug, ' ', '-');
  v_slug := replace(v_slug, '''', '');
  v_slug := replace(v_slug, 'é', 'e');
  v_slug := replace(v_slug, 'è', 'e');
  v_slug := replace(v_slug, 'ê', 'e');
  v_slug := replace(v_slug, 'ë', 'e');
  v_slug := replace(v_slug, 'à', 'a');
  v_slug := replace(v_slug, 'â', 'a');
  v_slug := replace(v_slug, 'î', 'i');
  v_slug := replace(v_slug, 'ï', 'i');
  v_slug := replace(v_slug, 'ô', 'o');
  v_slug := replace(v_slug, 'ù', 'u');
  v_slug := replace(v_slug, 'û', 'u');
  v_slug := replace(v_slug, 'ç', 'c');

  -- Insérer la nouvelle ville en statut "bientot"
  -- Elle passera en "actif" automatiquement via le trigger quand un commerce sera activé
  INSERT INTO villes (slug, nom, departement, region, statut, description)
  VALUES (v_slug, p_nom, p_departement, p_region, 'bientot', 'En attente du premier commerce partenaire.')
  ON CONFLICT (slug) DO UPDATE SET nom = EXCLUDED.nom
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ══ 3. Nettoyer les villes "bientot" sans commerce ══════════
-- On garde seulement les villes qui ont au moins un commerce OU qui sont "actif"
-- Les villes bientot sans commerce ne seront plus affichées côté front
-- (on ne les supprime pas de la BDD, on les masque côté code)


-- ══ 4. Supprimer les villes bientot actuelles qui n'ont aucun commerce
--       (elles seront recréées automatiquement quand un commerce s'inscrit) ══

DELETE FROM villes
WHERE statut = 'bientot'
  AND id NOT IN (SELECT DISTINCT ville_id FROM commerces WHERE actif = TRUE);


SELECT 'Patch v2.2 appliqué — les villes s''activent automatiquement' AS status;
