-- migration-v11-securite.sql
-- Description : Correction des failles de sécurité RLS identifiées lors de l'audit
-- Date : 2026-04-06
-- À exécuter dans : Supabase Dashboard > SQL Editor
--
-- Corrections :
-- 1. Offres : restreindre INSERT/UPDATE/DELETE au propriétaire du commerce
-- 2. Événements : restreindre INSERT/UPDATE à l'organisateur
-- 3. Actualités : restreindre INSERT/UPDATE à l'auteur
-- 4. Soutiens : ajouter policy INSERT pour les utilisateurs authentifiés
-- 5. Notifications : remplacer CASCADE par SET NULL sur auth.users
-- 6. Cartes : supprimer anon de la policy update_payment
-- 7. Visites : restreindre INSERT aux utilisateurs authentifiés
-- 8. RPC mairie : ajouter vérification de rôle

BEGIN;

-- ══════════════════════════════════════════════════════════
-- 1. OFFRES — Restreindre au propriétaire du commerce
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offres' AND table_schema = 'public') THEN
    -- Supprimer les anciennes policies trop permissives
    DROP POLICY IF EXISTS "offres_insert_auth" ON offres;
    DROP POLICY IF EXISTS "offres_update_auth" ON offres;
    DROP POLICY IF EXISTS "offres_delete_auth" ON offres;

    -- Le commerçant ne peut créer des offres que pour son propre commerce
    CREATE POLICY "offres_insert_owner" ON offres
      FOR INSERT TO authenticated
      WITH CHECK (
        commerce_id IN (
          SELECT cp.commerce_id FROM commercant_profiles cp WHERE cp.id = auth.uid()
        )
        OR is_admin()
      );

    -- Le commerçant ne peut modifier que les offres de son commerce
    CREATE POLICY "offres_update_owner" ON offres
      FOR UPDATE TO authenticated
      USING (
        commerce_id IN (
          SELECT cp.commerce_id FROM commercant_profiles cp WHERE cp.id = auth.uid()
        )
        OR is_admin()
      );

    -- Le commerçant ne peut supprimer que les offres de son commerce
    CREATE POLICY "offres_delete_owner" ON offres
      FOR DELETE TO authenticated
      USING (
        commerce_id IN (
          SELECT cp.commerce_id FROM commercant_profiles cp WHERE cp.id = auth.uid()
        )
        OR is_admin()
      );

    RAISE NOTICE 'OK: policies offres corrigées (ownership)';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- 2. ÉVÉNEMENTS — Restreindre INSERT/UPDATE à l'organisateur
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evenements' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "evenements_insert_auth" ON evenements;
    DROP POLICY IF EXISTS "evenements_update_auth" ON evenements;
    DROP POLICY IF EXISTS "evenements_delete_auth" ON evenements;

    -- INSERT : l'organisateur doit être lié à l'utilisateur (via commerce, asso, ou mairie)
    CREATE POLICY "evenements_insert_owner" ON evenements
      FOR INSERT TO authenticated
      WITH CHECK (
        -- Commerçant : l'organisateur_id est son commerce
        (organisateur_type = 'commerce' AND organisateur_id IN (
          SELECT cp.commerce_id FROM commercant_profiles cp WHERE cp.id = auth.uid()
        ))
        OR
        -- Association/Club : l'organisateur_id est son association
        (organisateur_type IN ('association', 'club') AND organisateur_id IN (
          SELECT ap.association_id FROM association_profiles ap WHERE ap.id = auth.uid()
        ))
        OR
        -- Mairie : l'utilisateur a un profil mairie
        (organisateur_type = 'mairie' AND EXISTS (
          SELECT 1 FROM mairie_profiles mp WHERE mp.id = auth.uid()
        ))
        OR is_admin()
      );

    -- UPDATE : même logique
    CREATE POLICY "evenements_update_owner" ON evenements
      FOR UPDATE TO authenticated
      USING (
        (organisateur_type = 'commerce' AND organisateur_id IN (
          SELECT cp.commerce_id FROM commercant_profiles cp WHERE cp.id = auth.uid()
        ))
        OR
        (organisateur_type IN ('association', 'club') AND organisateur_id IN (
          SELECT ap.association_id FROM association_profiles ap WHERE ap.id = auth.uid()
        ))
        OR
        (organisateur_type = 'mairie' AND EXISTS (
          SELECT 1 FROM mairie_profiles mp WHERE mp.id = auth.uid()
        ))
        OR is_admin()
      );

    -- DELETE : admin uniquement
    CREATE POLICY "evenements_delete_admin" ON evenements
      FOR DELETE TO authenticated
      USING (is_admin());

    RAISE NOTICE 'OK: policies evenements corrigées (ownership)';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- 3. ACTUALITÉS — Restreindre INSERT/UPDATE à l'auteur
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'actualites' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "actualites_insert_auth" ON actualites;
    DROP POLICY IF EXISTS "actualites_update_auth" ON actualites;
    DROP POLICY IF EXISTS "actualites_delete_auth" ON actualites;

    CREATE POLICY "actualites_insert_owner" ON actualites
      FOR INSERT TO authenticated
      WITH CHECK (
        (auteur_type = 'commerce' AND auteur_id IN (
          SELECT cp.commerce_id FROM commercant_profiles cp WHERE cp.id = auth.uid()
        ))
        OR
        (auteur_type IN ('association', 'club') AND auteur_id IN (
          SELECT ap.association_id FROM association_profiles ap WHERE ap.id = auth.uid()
        ))
        OR
        (auteur_type = 'mairie' AND EXISTS (
          SELECT 1 FROM mairie_profiles mp WHERE mp.id = auth.uid()
        ))
        OR is_admin()
      );

    CREATE POLICY "actualites_update_owner" ON actualites
      FOR UPDATE TO authenticated
      USING (
        (auteur_type = 'commerce' AND auteur_id IN (
          SELECT cp.commerce_id FROM commercant_profiles cp WHERE cp.id = auth.uid()
        ))
        OR
        (auteur_type IN ('association', 'club') AND auteur_id IN (
          SELECT ap.association_id FROM association_profiles ap WHERE ap.id = auth.uid()
        ))
        OR
        (auteur_type = 'mairie' AND EXISTS (
          SELECT 1 FROM mairie_profiles mp WHERE mp.id = auth.uid()
        ))
        OR is_admin()
      );

    CREATE POLICY "actualites_delete_admin" ON actualites
      FOR DELETE TO authenticated
      USING (is_admin());

    RAISE NOTICE 'OK: policies actualites corrigées (ownership)';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- 4. SOUTIENS — Ajouter policy INSERT pour les résidents
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'soutiens' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "soutiens_insert_auth" ON soutiens;

    -- Un utilisateur authentifié peut soutenir un projet (son soutien_id = son auth.uid)
    CREATE POLICY "soutiens_insert_auth" ON soutiens
      FOR INSERT TO authenticated
      WITH CHECK (
        soutien_id = auth.uid()
        OR is_admin()
      );

    -- Un utilisateur peut voir ses propres soutiens
    DROP POLICY IF EXISTS "soutiens_select_own" ON soutiens;
    CREATE POLICY "soutiens_select_own" ON soutiens
      FOR SELECT TO authenticated
      USING (
        soutien_id = auth.uid()
        OR is_admin()
        OR TRUE  -- Les soutiens publics sont visibles par tous (sauf anonymes gérés côté app)
      );

    RAISE NOTICE 'OK: policy INSERT soutiens ajoutée';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- 5. ASSOCIATIONS — Restreindre INSERT
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'associations' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "associations_insert_auth" ON associations;

    -- Seuls les admins et le service_role peuvent créer des associations
    -- Les utilisateurs passent par le formulaire d'inscription qui utilise service_role
    CREATE POLICY "associations_insert_admin" ON associations
      FOR INSERT TO authenticated
      WITH CHECK (is_admin());

    RAISE NOTICE 'OK: policy INSERT associations restreinte';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- 6. CARTES — Supprimer anon de la policy update_payment
-- ══════════════════════════════════════════════════════════
-- L'activation après paiement passe par le webhook Stripe (service_role)
-- Pas besoin que anon puisse modifier le statut
DROP POLICY IF EXISTS "cartes_update_payment" ON cartes;
CREATE POLICY "cartes_update_payment" ON cartes
  FOR UPDATE TO authenticated
  USING (statut = 'en_attente_paiement' AND email = (auth.jwt() ->> 'email'))
  WITH CHECK (statut = 'active');

-- ══════════════════════════════════════════════════════════
-- 7. VISITES — Restreindre INSERT aux authentifiés
-- ══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "visites_insert_public" ON visites;
CREATE POLICY "visites_insert_authenticated" ON visites
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- Note : le service_role peut toujours insérer (bypass RLS)
-- Si des scans publics via QR sont nécessaires, ajouter une policy anon restreinte

-- ══════════════════════════════════════════════════════════
-- 8. NOTIFICATIONS — Remplacer CASCADE par SET NULL
-- ══════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    -- Vérifier si la FK existe avec CASCADE
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = 'notifications' AND rc.delete_rule = 'CASCADE'
    ) THEN
      -- Supprimer l'ancienne FK
      ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_destinataire_id_fkey;
      -- Recréer avec SET NULL
      ALTER TABLE notifications
        ALTER COLUMN destinataire_id DROP NOT NULL,
        ADD CONSTRAINT notifications_destinataire_id_fkey
          FOREIGN KEY (destinataire_id) REFERENCES auth.users(id) ON DELETE SET NULL;
      RAISE NOTICE 'OK: FK notifications → auth.users changée de CASCADE à SET NULL';
    END IF;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════
-- 9. RPC DASHBOARD MAIRIE — Ajouter vérification de rôle
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_dashboard_mairie(p_ville_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  is_authorized BOOLEAN;
BEGIN
  -- Vérifier que l'appelant est admin ou agent mairie de cette ville
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE id = auth.uid()
    UNION ALL
    SELECT 1 FROM mairie_profiles WHERE id = auth.uid() AND ville_id = p_ville_id
  ) INTO is_authorized;

  IF NOT is_authorized THEN
    RAISE EXCEPTION 'Accès non autorisé au dashboard mairie.';
  END IF;

  SELECT json_build_object(
    'residents', (SELECT COUNT(*) FROM profiles WHERE ville_id = p_ville_id),
    'commerces', (SELECT COUNT(*) FROM commerces WHERE ville_id = p_ville_id AND actif = true),
    'associations', (SELECT COUNT(*) FROM associations WHERE ville_id = p_ville_id AND actif = true),
    'evenements_mois', (SELECT COUNT(*) FROM evenements WHERE ville_id = p_ville_id AND date_debut >= date_trunc('month', NOW())),
    'projets_actifs', (SELECT COUNT(*) FROM projets WHERE ville_id = p_ville_id AND statut = 'actif'),
    'offres_actives', (SELECT COUNT(*) FROM offres o JOIN commerces c ON o.commerce_id = c.id WHERE c.ville_id = p_ville_id AND o.active = true),
    'visites_mois', (SELECT COUNT(*) FROM visites v JOIN commerces c ON v.commerce_id = c.id WHERE c.ville_id = p_ville_id AND v.date >= date_trunc('month', NOW()))
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Alias get_dashboard_stats avec la même vérification
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_ville_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN get_dashboard_mairie(p_ville_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;
