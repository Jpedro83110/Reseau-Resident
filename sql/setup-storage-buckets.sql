-- ═══════════════════════════════════════════════════════════════
-- SETUP STORAGE BUCKETS — Réseaux-Résident
-- 100% idempotent — exécutable plusieurs fois sans erreur
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Créer les buckets (ou mettre à jour en public) ───────

INSERT INTO storage.buckets (id, name, public)
VALUES ('villes-logos', 'villes-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('actualites-images', 'actualites-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('associations-logos', 'associations-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('projets-images', 'projets-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ─── 2. Policies VILLES-LOGOS ────────────────────────────────
-- Tout le monde peut voir les logos (public)
DROP POLICY IF EXISTS "villes_logos_select" ON storage.objects;
CREATE POLICY "villes_logos_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'villes-logos');

-- Seules les mairies peuvent uploader
DROP POLICY IF EXISTS "villes_logos_insert" ON storage.objects;
CREATE POLICY "villes_logos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'villes-logos'
    AND EXISTS (SELECT 1 FROM mairie_profiles WHERE id = auth.uid())
  );

-- Seule la mairie proprietaire peut modifier (le fichier contient son ville_id)
DROP POLICY IF EXISTS "villes_logos_update" ON storage.objects;
CREATE POLICY "villes_logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'villes-logos'
    AND EXISTS (SELECT 1 FROM mairie_profiles WHERE id = auth.uid())
  );

-- Admin ou mairie peut supprimer
DROP POLICY IF EXISTS "villes_logos_delete" ON storage.objects;
CREATE POLICY "villes_logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'villes-logos'
    AND (
      EXISTS (SELECT 1 FROM mairie_profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
  );

-- ─── 3. Policies ACTUALITES-IMAGES ──────────────────────────
-- Tout le monde peut voir les images (public)
DROP POLICY IF EXISTS "actualites_img_select" ON storage.objects;
CREATE POLICY "actualites_img_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'actualites-images');

-- Mairies, commercants et associations peuvent uploader
DROP POLICY IF EXISTS "actualites_img_insert" ON storage.objects;
CREATE POLICY "actualites_img_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'actualites-images');

-- Modifier ses propres images
DROP POLICY IF EXISTS "actualites_img_update" ON storage.objects;
CREATE POLICY "actualites_img_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'actualites-images');

-- Supprimer ses propres images
DROP POLICY IF EXISTS "actualites_img_delete" ON storage.objects;
CREATE POLICY "actualites_img_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'actualites-images');

-- ─── 4. Policies ASSOCIATIONS-LOGOS ─────────────────────────
-- Tout le monde peut voir
DROP POLICY IF EXISTS "asso_logos_select" ON storage.objects;
CREATE POLICY "asso_logos_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'associations-logos');

-- Responsables d'association peuvent uploader
DROP POLICY IF EXISTS "asso_logos_insert" ON storage.objects;
CREATE POLICY "asso_logos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'associations-logos'
    AND EXISTS (SELECT 1 FROM association_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "asso_logos_update" ON storage.objects;
CREATE POLICY "asso_logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'associations-logos'
    AND EXISTS (SELECT 1 FROM association_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "asso_logos_delete" ON storage.objects;
CREATE POLICY "asso_logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'associations-logos'
    AND (
      EXISTS (SELECT 1 FROM association_profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
  );

-- ─── 5. Policies PROJETS-IMAGES ─────────────────────────────
-- Tout le monde peut voir
DROP POLICY IF EXISTS "projets_img_select" ON storage.objects;
CREATE POLICY "projets_img_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'projets-images');

-- Responsables d'association peuvent uploader
DROP POLICY IF EXISTS "projets_img_insert" ON storage.objects;
CREATE POLICY "projets_img_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'projets-images'
    AND EXISTS (SELECT 1 FROM association_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "projets_img_update" ON storage.objects;
CREATE POLICY "projets_img_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'projets-images'
    AND EXISTS (SELECT 1 FROM association_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "projets_img_delete" ON storage.objects;
CREATE POLICY "projets_img_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'projets-images'
    AND (
      EXISTS (SELECT 1 FROM association_profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
    )
  );

-- ─── 6. Supprimer les anciennes policies generiques ─────────
-- (celles créées manuellement avant cet audit)
DROP POLICY IF EXISTS "logos_select_public" ON storage.objects;
DROP POLICY IF EXISTS "logos_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "logos_update_auth" ON storage.objects;
