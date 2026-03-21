-- ============================================================
-- PATCH v2.3 — Validation automatique des commerces
-- Quand tu changes statut → "valide" dans commercants_inscrits,
-- le commerce est créé automatiquement dans la table commerces
-- + la ville est créée si elle n'existe pas encore
-- ============================================================

CREATE OR REPLACE FUNCTION on_commercant_valide()
RETURNS TRIGGER AS $$
DECLARE
  v_ville_id UUID;
BEGIN
  -- Seulement quand le statut passe à 'valide'
  IF NEW.statut = 'valide' AND (OLD.statut IS DISTINCT FROM 'valide') THEN

    -- 1. Trouver ou créer la ville
    SELECT id INTO v_ville_id FROM villes
    WHERE lower(nom) = lower(NEW.nom_ville)
    LIMIT 1;

    IF v_ville_id IS NULL THEN
      -- Créer la ville automatiquement
      INSERT INTO villes (slug, nom, departement, statut, description)
      VALUES (
        lower(replace(replace(replace(replace(replace(replace(
          NEW.nom_ville, ' ', '-'), '''', ''), 'é', 'e'), 'è', 'e'), 'ê', 'e'), 'à', 'a')),
        NEW.nom_ville,
        NEW.departement,
        'bientot',
        'Activée automatiquement par le premier commerce partenaire.'
      )
      ON CONFLICT (slug) DO UPDATE SET nom = EXCLUDED.nom
      RETURNING id INTO v_ville_id;
    END IF;

    -- 2. Créer le commerce dans la table commerces
    INSERT INTO commerces (ville_id, nom, categorie, avantage, adresse, telephone, email, actif)
    VALUES (
      v_ville_id,
      NEW.nom_commerce,
      NEW.categorie,
      NEW.avantage_propose,
      NEW.adresse,
      NEW.telephone,
      NEW.email,
      TRUE
    );
    -- Le trigger auto_activer_ville passera la ville en "actif" automatiquement

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_commercant_valide ON commercants_inscrits;
CREATE TRIGGER trg_on_commercant_valide
  AFTER UPDATE ON commercants_inscrits
  FOR EACH ROW EXECUTE FUNCTION on_commercant_valide();

-- Permettre l'update du statut par les admins depuis le dashboard
DROP POLICY IF EXISTS "commercants_update_admin" ON commercants_inscrits;
CREATE POLICY "commercants_update_admin" ON commercants_inscrits FOR UPDATE
  TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Permettre aussi via service_role (pour le Table Editor Supabase)
-- (déjà couvert par commercants_all_service)

SELECT 'Patch v2.3 appliqué — validation automatique des commerces' AS status;
