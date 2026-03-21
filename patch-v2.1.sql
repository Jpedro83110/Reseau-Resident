-- ============================================================
-- PATCH SQL v2.1 — Exécuter APRÈS supabase-schema-v2.sql
-- Ou exécuter seul si la v2.0 est déjà en place
-- ============================================================

-- ══ FIX 1 : RLS cartes — permettre RETURNING après INSERT ═══
DROP POLICY IF EXISTS "cartes_insert_anon" ON cartes;
DROP POLICY IF EXISTS "cartes_update_payment" ON cartes;
DROP POLICY IF EXISTS "cartes_select_auth" ON cartes;
DROP POLICY IF EXISTS "cartes_select_anon" ON cartes;
DROP POLICY IF EXISTS "cartes_select_public" ON cartes;

CREATE POLICY "cartes_insert_public" ON cartes FOR INSERT
  TO anon, authenticated WITH CHECK (statut = 'en_attente_paiement');

CREATE POLICY "cartes_select_public" ON cartes FOR SELECT
  TO anon, authenticated USING (TRUE);

CREATE POLICY "cartes_update_payment" ON cartes FOR UPDATE
  TO anon, authenticated
  USING (statut = 'en_attente_paiement')
  WITH CHECK (statut IN ('active', 'annulee'));

-- ══ FIX 2 : RLS commercants_inscrits ════════════════════════
DROP POLICY IF EXISTS "commercants_insert_public" ON commercants_inscrits;
DROP POLICY IF EXISTS "commercants_select_admin" ON commercants_inscrits;
DROP POLICY IF EXISTS "commercants_select_public" ON commercants_inscrits;

CREATE POLICY "commercants_insert_public" ON commercants_inscrits FOR INSERT
  TO anon, authenticated WITH CHECK (statut = 'en_attente');

CREATE POLICY "commercants_select_public" ON commercants_inscrits FOR SELECT
  TO anon, authenticated USING (TRUE);

-- ══ FIX 3 : RLS visites ═════════════════════════════════════
DROP POLICY IF EXISTS "visites_insert_public" ON visites;
DROP POLICY IF EXISTS "visites_select_admin" ON visites;
DROP POLICY IF EXISTS "visites_select_public" ON visites;

CREATE POLICY "visites_insert_public" ON visites FOR INSERT
  TO anon, authenticated WITH CHECK (TRUE);

CREATE POLICY "visites_select_public" ON visites FOR SELECT
  TO anon, authenticated USING (TRUE);

-- ══ FIX 4 : RLS cadeaux ═════════════════════════════════════
DROP POLICY IF EXISTS "cadeaux_insert_public" ON cartes_cadeaux;
DROP POLICY IF EXISTS "cadeaux_select_public" ON cartes_cadeaux;
DROP POLICY IF EXISTS "cadeaux_update_payment" ON cartes_cadeaux;

CREATE POLICY "cadeaux_insert_public" ON cartes_cadeaux FOR INSERT
  TO anon, authenticated WITH CHECK (statut = 'en_attente_paiement');

CREATE POLICY "cadeaux_select_public" ON cartes_cadeaux FOR SELECT
  TO anon, authenticated USING (TRUE);

CREATE POLICY "cadeaux_update_payment" ON cartes_cadeaux FOR UPDATE
  TO anon, authenticated
  USING (statut = 'en_attente_paiement')
  WITH CHECK (statut = 'active');


-- ══ AJOUT 1 : Champ SIRET sur commercants_inscrits ══════════
-- Permet de vérifier que c'est bien le propriétaire
ALTER TABLE commercants_inscrits ADD COLUMN IF NOT EXISTS siret TEXT;

-- ══ AJOUT 2 : Champ email_contact sur commerces (pour retrait) ═
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS email_contact TEXT;

-- ══ AJOUT 3 : Permettre au commerce de se retirer ═══════════
-- Le commerce peut être désactivé via un token unique
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS desactivation_token TEXT
  DEFAULT encode(gen_random_bytes(16), 'hex');

-- Policy: anon peut update un commerce SEULEMENT pour le désactiver via son token
DROP POLICY IF EXISTS "commerces_self_deactivate" ON commerces;
CREATE POLICY "commerces_self_deactivate" ON commerces FOR UPDATE
  TO anon, authenticated
  USING (TRUE)
  WITH CHECK (actif = FALSE);

-- ══ AJOUT 4 : RPC pour résilier une carte ════════════════════
CREATE OR REPLACE FUNCTION resilier_carte(p_numero TEXT, p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_found BOOLEAN;
BEGIN
  UPDATE cartes
  SET statut = 'annulee', updated_at = NOW()
  WHERE numero = p_numero
    AND email = p_email
    AND statut = 'active';

  GET DIAGNOSTICS v_found = ROW_COUNT;
  RETURN v_found > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══ AJOUT 5 : RPC pour qu'un commerce se retire ═════════════
CREATE OR REPLACE FUNCTION retirer_commerce(p_commerce_id UUID, p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_found BOOLEAN;
BEGIN
  UPDATE commerces
  SET actif = FALSE
  WHERE id = p_commerce_id
    AND desactivation_token = p_token
    AND actif = TRUE;

  GET DIAGNOSTICS v_found = ROW_COUNT;
  RETURN v_found > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══ AJOUT 6 : RPC Dashboard admin enrichi ════════════════════
-- Stats par commerce avec nombre de visites + dernière visite
CREATE OR REPLACE FUNCTION get_admin_dashboard(p_ville_slug TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_ville_id UUID;
BEGIN
  SELECT id INTO v_ville_id FROM villes WHERE slug = p_ville_slug;
  IF v_ville_id IS NULL THEN RETURN NULL; END IF;

  SELECT json_build_object(
    'ville', json_build_object(
      'id', v.id, 'nom', v.nom, 'slug', v.slug,
      'cartes_actives', v.cartes_actives,
      'commerces_partenaires', v.commerces_partenaires,
      'visites_total', v.visites_total
    ),
    'commerces', COALESCE((
      SELECT json_agg(json_build_object(
        'id', c.id, 'nom', c.nom, 'categorie', c.categorie,
        'avantage', c.avantage, 'visites', c.visites, 'actif', c.actif
      ) ORDER BY c.visites DESC)
      FROM commerces c WHERE c.ville_id = v.id
    ), '[]'::json),
    'demandes_en_attente', (
      SELECT count(*)::INTEGER FROM commercants_inscrits WHERE statut = 'en_attente'
    ),
    'cartes_total', (
      SELECT count(*)::INTEGER FROM cartes WHERE ville_id = v.id AND statut = 'active'
    ),
    'cartes_annulees', (
      SELECT count(*)::INTEGER FROM cartes WHERE ville_id = v.id AND statut = 'annulee'
    ),
    'revenus_cartes', COALESCE((
      SELECT sum(CASE formule
        WHEN 'individuel' THEN 10
        WHEN 'couple' THEN 15
        WHEN 'secondaire' THEN 20
      END)::INTEGER
      FROM cartes WHERE ville_id = v.id AND statut = 'active'
    ), 0),
    'visites_par_source', COALESCE((
      SELECT json_agg(json_build_object('source', vis.source, 'count', vis.cnt))
      FROM (
        SELECT source, count(*)::INTEGER as cnt
        FROM visites WHERE ville_id = v.id
        GROUP BY source ORDER BY cnt DESC
      ) vis
    ), '[]'::json)
  ) INTO result
  FROM villes v WHERE v.id = v_ville_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Suppression de la formule famille dans la contrainte cartes
-- (on garde la colonne check mais on la recrée sans 'famille')
ALTER TABLE cartes DROP CONSTRAINT IF EXISTS cartes_formule_check;
ALTER TABLE cartes ADD CONSTRAINT cartes_formule_check
  CHECK (formule IN ('individuel', 'couple', 'secondaire'));

SELECT 'Patch v2.1 appliqué avec succès' AS status;
