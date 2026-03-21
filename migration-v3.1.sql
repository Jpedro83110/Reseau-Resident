-- ============================================================
-- MIGRATION v3.1 — RPCs pour espace résident & commerçant
-- Exécuter APRÈS migration-v3.sql
-- ============================================================

-- 1. Profil résident complet (passeport)
CREATE OR REPLACE FUNCTION get_resident_profile(p_numero TEXT, p_email TEXT)
RETURNS JSON AS $$
DECLARE
  v_carte RECORD;
  result JSON;
BEGIN
  SELECT c.*, v.nom AS ville_nom, v.slug AS ville_slug
  INTO v_carte FROM cartes c JOIN villes v ON v.id = c.ville_id
  WHERE c.numero = p_numero AND c.email = p_email AND c.statut = 'active'
  LIMIT 1;

  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;

  SELECT json_build_object(
    'carte', json_build_object(
      'id', v_carte.id, 'numero', v_carte.numero, 'prenom', v_carte.prenom,
      'nom', v_carte.nom_titulaire, 'formule', v_carte.formule, 'type_carte', v_carte.type_carte,
      'ville_nom', v_carte.ville_nom, 'ville_slug', v_carte.ville_slug,
      'qr_token', v_carte.qr_token, 'date_expiration', v_carte.date_expiration,
      'created_at', v_carte.created_at
    ),
    'stats', json_build_object(
      'total_visites', (SELECT count(*)::INTEGER FROM visites WHERE carte_id = v_carte.id),
      'commerces_visites', (SELECT count(DISTINCT commerce_id)::INTEGER FROM visites WHERE carte_id = v_carte.id),
      'mois_actif', (SELECT count(DISTINCT date_trunc('month', date_visite))::INTEGER FROM visites WHERE carte_id = v_carte.id)
    ),
    'badges', COALESCE((
      SELECT json_agg(json_build_object('slug', b.slug, 'nom', b.nom, 'description', b.description, 'icone', b.icone, 'earned_at', cb.earned_at))
      FROM carte_badges cb JOIN badges b ON b.id = cb.badge_id WHERE cb.carte_id = v_carte.id
    ), '[]'::json),
    'missions', COALESCE((
      SELECT json_agg(json_build_object('titre', m.titre, 'description', m.description, 'type', m.type, 'progression', cm.progression, 'complete', cm.complete, 'reward_text', m.reward_text))
      FROM carte_missions cm JOIN missions m ON m.id = cm.mission_id WHERE cm.carte_id = v_carte.id AND m.actif = TRUE
    ), '[]'::json),
    'visites_recentes', COALESCE((
      SELECT json_agg(json_build_object('commerce_nom', co.nom, 'categorie', co.categorie, 'date', vis.date_visite))
      FROM (SELECT * FROM visites WHERE carte_id = v_carte.id ORDER BY date_visite DESC LIMIT 10) vis
      JOIN commerces co ON co.id = vis.commerce_id
    ), '[]'::json),
    'parrainage', json_build_object(
      'code', (SELECT code_parrainage FROM parrainages WHERE parrain_carte_id = v_carte.id LIMIT 1),
      'filleuls', (SELECT count(*)::INTEGER FROM parrainages WHERE parrain_carte_id = v_carte.id AND statut IN ('utilise', 'recompense'))
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Créer un code parrainage pour un résident
CREATE OR REPLACE FUNCTION create_parrainage_code(p_carte_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
BEGIN
  SELECT code_parrainage INTO v_code FROM parrainages WHERE parrain_carte_id = p_carte_id LIMIT 1;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;

  INSERT INTO parrainages (parrain_carte_id)
  VALUES (p_carte_id)
  RETURNING code_parrainage INTO v_code;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recommandations (commerces non visités dans la ville)
CREATE OR REPLACE FUNCTION get_recommendations(p_carte_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS JSON AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(row_data) FROM (
      SELECT co.id, co.nom, co.categorie, co.avantage, co.adresse
      FROM commerces co
      JOIN cartes c ON c.id = p_carte_id AND co.ville_id = c.ville_id
      WHERE co.actif = TRUE
        AND co.id NOT IN (SELECT commerce_id FROM visites WHERE carte_id = p_carte_id)
      ORDER BY co.visites DESC
      LIMIT p_limit
    ) row_data
  ), '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Espace commerçant (stats pour un commerce)
CREATE OR REPLACE FUNCTION get_commerce_stats(p_commerce_id UUID, p_token TEXT)
RETURNS JSON AS $$
DECLARE
  v_commerce RECORD;
BEGIN
  SELECT * INTO v_commerce FROM commerces WHERE id = p_commerce_id AND desactivation_token = p_token;
  IF NOT FOUND THEN RETURN json_build_object('error', 'not_found'); END IF;

  RETURN json_build_object(
    'commerce', json_build_object(
      'id', v_commerce.id, 'nom', v_commerce.nom, 'categorie', v_commerce.categorie,
      'avantage', v_commerce.avantage, 'adresse', v_commerce.adresse, 'actif', v_commerce.actif,
      'visites_total', v_commerce.visites
    ),
    'visites_30j', (
      SELECT count(*)::INTEGER FROM visites WHERE commerce_id = p_commerce_id AND date_visite > NOW() - INTERVAL '30 days'
    ),
    'visites_7j', (
      SELECT count(*)::INTEGER FROM visites WHERE commerce_id = p_commerce_id AND date_visite > NOW() - INTERVAL '7 days'
    ),
    'clients_uniques', (
      SELECT count(DISTINCT carte_id)::INTEGER FROM visites WHERE commerce_id = p_commerce_id
    ),
    'visites_par_mois', COALESCE((
      SELECT json_agg(json_build_object('mois', to_char(m, 'Mon'), 'count', c))
      FROM (
        SELECT date_trunc('month', date_visite) AS m, count(*)::INTEGER AS c
        FROM visites WHERE commerce_id = p_commerce_id AND date_visite > NOW() - INTERVAL '6 months'
        GROUP BY date_trunc('month', date_visite) ORDER BY m
      ) sub
    ), '[]'::json),
    'offres_actives', COALESCE((
      SELECT json_agg(json_build_object('id', o.id, 'titre', o.titre, 'type', o.type, 'date_debut', o.date_debut, 'date_fin', o.date_fin))
      FROM offres o WHERE o.commerce_id = p_commerce_id AND o.actif = TRUE
    ), '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Auto-award badges après chaque visite
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_commerces INTEGER;
  v_badge RECORD;
BEGIN
  SELECT count(*) INTO v_total FROM visites WHERE carte_id = NEW.carte_id;
  SELECT count(DISTINCT commerce_id) INTO v_commerces FROM visites WHERE carte_id = NEW.carte_id;

  FOR v_badge IN SELECT * FROM badges WHERE condition_type IN ('visites_count', 'commerces_count') LOOP
    IF (v_badge.condition_type = 'visites_count' AND v_total >= v_badge.condition_value)
    OR (v_badge.condition_type = 'commerces_count' AND v_commerces >= v_badge.condition_value) THEN
      INSERT INTO carte_badges (carte_id, badge_id) VALUES (NEW.carte_id, v_badge.id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_badges ON visites;
CREATE TRIGGER trg_check_badges AFTER INSERT ON visites FOR EACH ROW EXECUTE FUNCTION check_and_award_badges();

SELECT 'Migration v3.1 — RPCs espace résident & commerçant OK' AS status;
