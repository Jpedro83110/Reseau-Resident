-- ============================================================
-- PATCH v2.4 — Fix commerces RLS + visites insert
-- ============================================================

-- Fix: commerces SELECT was broken by the deactivate policy
DROP POLICY IF EXISTS "commerces_select_public" ON commerces;
DROP POLICY IF EXISTS "commerces_admin_all" ON commerces;
DROP POLICY IF EXISTS "commerces_self_deactivate" ON commerces;

-- Anon + authenticated can read ALL commerces (actif or not — needed for admin dashboard)
CREATE POLICY "commerces_select_public" ON commerces FOR SELECT
  TO anon, authenticated USING (TRUE);

-- Only service_role can write (insert/update/delete)
-- The self-deactivation goes through the RPC retirer_commerce which uses SECURITY DEFINER
DROP POLICY IF EXISTS "commerces_write_service" ON commerces;
CREATE POLICY "commerces_write_service" ON commerces FOR ALL
  TO service_role USING (TRUE);

-- Also ensure visites INSERT works for anon
DROP POLICY IF EXISTS "visites_insert_public" ON visites;
CREATE POLICY "visites_insert_public" ON visites FOR INSERT
  TO anon, authenticated WITH CHECK (TRUE);

SELECT 'Patch v2.4 — commerces RLS fixé' AS status;
