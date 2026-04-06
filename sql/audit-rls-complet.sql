-- ═══════════════════════════════════════════════════════════════
-- AUDIT RLS COMPLET — Réseaux-Résident
-- Date : 2026-04-05
-- 100% idempotent — exécutable plusieurs fois sans erreur
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. ACTIVER RLS SUR TOUTES LES TABLES (si pas déjà fait)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'admins','villes','commerces','cartes','visites',
      'commercants_inscrits','liste_attente','profiles',
      'commercant_profiles','association_profiles','mairie_profiles',
      'offres','utilisations_offres','evenements','actualites',
      'associations','projets','soutiens','favoris','notifications',
      'parrainages','campagnes','badges','badges_utilisateurs',
      'defis','defis_participants','mairies_inscrites',
      'codes_mensuels','cartes_cadeaux','utilisations_cadeaux',
      'inscriptions_evenements','avis','messages',
      'carte_badges','carte_missions','missions',
      'stripe_webhook_events'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. FIX CRITIQUE : Supprimer les policies trop permissives
--    (fix-rls-permissions.sql a créé des WITH CHECK (TRUE) dangereux)
-- ═══════════════════════════════════════════════════════════════

-- OFFRES : supprimer les policies ouvertes et les remplacer
DROP POLICY IF EXISTS "offres_insert_auth" ON offres;
DROP POLICY IF EXISTS "offres_update_auth" ON offres;
DROP POLICY IF EXISTS "offres_delete_auth" ON offres;

-- Un commerçant ne peut gérer QUE les offres de SON commerce
DROP POLICY IF EXISTS "offres_commercant_manage" ON offres;
CREATE POLICY "offres_commercant_manage" ON offres
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM commercant_profiles cp
    WHERE cp.id = auth.uid() AND cp.commerce_id = offres.commerce_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM commercant_profiles cp
    WHERE cp.id = auth.uid() AND cp.commerce_id = offres.commerce_id
  ));

-- EVENEMENTS : supprimer les policies ouvertes
DROP POLICY IF EXISTS "evenements_insert_auth" ON evenements;
DROP POLICY IF EXISTS "evenements_update_auth" ON evenements;
DROP POLICY IF EXISTS "evenements_delete_auth" ON evenements;

-- Une mairie ne peut gérer QUE les événements de SA ville
DROP POLICY IF EXISTS "evenements_mairie_manage" ON evenements;
CREATE POLICY "evenements_mairie_manage" ON evenements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mairie_profiles mp
    WHERE mp.id = auth.uid() AND mp.ville_id = evenements.ville_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM mairie_profiles mp
    WHERE mp.id = auth.uid() AND mp.ville_id = evenements.ville_id
  ));

-- ACTUALITES : supprimer les policies ouvertes
DROP POLICY IF EXISTS "actualites_insert_auth" ON actualites;
DROP POLICY IF EXISTS "actualites_update_auth" ON actualites;
DROP POLICY IF EXISTS "actualites_delete_auth" ON actualites;

-- Une mairie ne peut gérer QUE les actualités de SA ville
DROP POLICY IF EXISTS "actualites_mairie_manage" ON actualites;
CREATE POLICY "actualites_mairie_manage" ON actualites
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mairie_profiles mp
    WHERE mp.id = auth.uid() AND mp.ville_id = actualites.ville_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM mairie_profiles mp
    WHERE mp.id = auth.uid() AND mp.ville_id = actualites.ville_id
  ));

-- Commerçants peuvent publier des actualités pour leur commerce
DROP POLICY IF EXISTS "actualites_commercant_manage" ON actualites;
CREATE POLICY "actualites_commercant_manage" ON actualites
  FOR ALL TO authenticated
  USING (
    auteur_type = 'commerce' AND EXISTS (
      SELECT 1 FROM commercant_profiles cp
      WHERE cp.id = auth.uid() AND cp.commerce_id::text = actualites.auteur_id::text
    )
  )
  WITH CHECK (
    auteur_type = 'commerce' AND EXISTS (
      SELECT 1 FROM commercant_profiles cp
      WHERE cp.id = auth.uid() AND cp.commerce_id::text = actualites.auteur_id::text
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 3. FIX CRITIQUE : Cartes — supprimer activation sans paiement
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "cartes_update_payment" ON cartes;
-- L'activation des cartes se fait UNIQUEMENT via le webhook Stripe (service_role)

DROP POLICY IF EXISTS "cadeaux_update_payment" ON cartes_cadeaux;
-- Idem pour les cartes cadeaux

-- ═══════════════════════════════════════════════════════════════
-- 4. FIX IMPORTANT : Données sensibles exposées publiquement
-- ═══════════════════════════════════════════════════════════════

-- commercants_inscrits : ne pas exposer les emails/téléphones au public
DROP POLICY IF EXISTS "ci_read" ON commercants_inscrits;
-- Seuls les admins et le demandeur lui-même peuvent voir
DROP POLICY IF EXISTS "commercants_select_own" ON commercants_inscrits;
CREATE POLICY "commercants_select_own" ON commercants_inscrits
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email') OR is_admin());

-- codes_mensuels : ne pas exposer les codes au public
DROP POLICY IF EXISTS "codes_select_public" ON codes_mensuels;
DROP POLICY IF EXISTS "cm2_read" ON codes_mensuels;
DROP POLICY IF EXISTS "codes_select_commerce" ON codes_mensuels;
CREATE POLICY "codes_select_commerce" ON codes_mensuels
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM commercant_profiles cp
    WHERE cp.id = auth.uid() AND cp.commerce_id = codes_mensuels.commerce_id
  ) OR is_admin());

-- cartes_cadeaux : ne pas exposer les codes au public
DROP POLICY IF EXISTS "cadeaux_select_public" ON cartes_cadeaux;
DROP POLICY IF EXISTS "cc_read" ON cartes_cadeaux;
DROP POLICY IF EXISTS "cadeaux_select_own" ON cartes_cadeaux;
CREATE POLICY "cadeaux_select_own" ON cartes_cadeaux
  FOR SELECT TO authenticated
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- 5. FIX IMPORTANT : Avis — empêcher modification par d'autres
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "avis_update_commerce" ON avis;
-- Seul l'auteur peut modifier son avis
DROP POLICY IF EXISTS "avis_update_own" ON avis;
CREATE POLICY "avis_update_own" ON avis
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid());

-- Le commerçant peut répondre (via champ reponse_commerce uniquement — à gérer côté app)
DROP POLICY IF EXISTS "avis_commercant_reply" ON avis;
CREATE POLICY "avis_commercant_reply" ON avis
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM commercant_profiles cp
    WHERE cp.id = auth.uid() AND cp.commerce_id = avis.commerce_id
  ));

-- ═══════════════════════════════════════════════════════════════
-- 6. FIX : Campagnes — restreindre au commerçant propriétaire
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "camp_insert_auth" ON campagnes;
DROP POLICY IF EXISTS "camp_select_auth" ON campagnes;

-- ═══════════════════════════════════════════════════════════════
-- 7. FIX : Défis — restreindre création à la mairie
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "defis_insert_auth" ON defis;
DROP POLICY IF EXISTS "defis_mairie_manage" ON defis;
CREATE POLICY "defis_mairie_manage" ON defis
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mairie_profiles mp
    WHERE mp.id = auth.uid() AND mp.ville_id = defis.ville_id
  ) OR is_admin())
  WITH CHECK (EXISTS (
    SELECT 1 FROM mairie_profiles mp
    WHERE mp.id = auth.uid() AND mp.ville_id = defis.ville_id
  ) OR is_admin());

-- ═══════════════════════════════════════════════════════════════
-- 8. POLICIES DELETE MANQUANTES (RGPD — droit à l'effacement)
-- ═══════════════════════════════════════════════════════════════

-- Un utilisateur peut supprimer son propre profil
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "cp_delete_own" ON commercant_profiles;
CREATE POLICY "cp_delete_own" ON commercant_profiles
  FOR DELETE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "ap_delete_own" ON association_profiles;
CREATE POLICY "ap_delete_own" ON association_profiles
  FOR DELETE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "mp_delete_own" ON mairie_profiles;
CREATE POLICY "mp_delete_own" ON mairie_profiles
  FOR DELETE TO authenticated USING (id = auth.uid());

-- Favoris, notifications, soutiens : suppression par le propriétaire
DROP POLICY IF EXISTS "favoris_delete_own" ON favoris;
CREATE POLICY "favoris_delete_own" ON favoris
  FOR DELETE TO authenticated USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE TO authenticated USING (destinataire_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- 9. POLICIES ADMIN manquantes (pour le back-office)
-- ═══════════════════════════════════════════════════════════════

-- Admin peut tout faire sur les tables métier
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN VALUES
    ('offres'),('evenements'),('actualites'),('associations'),
    ('projets'),('campagnes'),('defis'),('avis'),('messages')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_admin_all" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_admin_all" ON %I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())',
      t, t
    );
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 10. SERVICE_ROLE policies (pour les serverless functions)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN VALUES
    ('profiles'),('commercant_profiles'),('association_profiles'),
    ('mairie_profiles'),('offres'),('evenements'),('actualites'),
    ('associations'),('projets'),('soutiens'),('favoris'),
    ('notifications'),('parrainages'),('campagnes'),('badges'),
    ('badges_utilisateurs'),('defis'),('defis_participants'),
    ('inscriptions_evenements'),('avis'),('messages'),
    ('stripe_webhook_events')
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "%s_service_all" ON %I', t, t);
      EXECUTE format(
        'CREATE POLICY "%s_service_all" ON %I FOR ALL TO service_role USING (true)',
        t, t
      );
    EXCEPTION WHEN undefined_table THEN
      -- Table n'existe pas, on skip
      NULL;
    END;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 11. COLONNES BRANDING (si pas déjà ajoutées)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE villes ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE villes ADD COLUMN IF NOT EXISTS couleur_primaire TEXT DEFAULT '#1a3a5c';
ALTER TABLE villes ADD COLUMN IF NOT EXISTS couleur_secondaire TEXT DEFAULT '#c8963e';

COMMIT;
