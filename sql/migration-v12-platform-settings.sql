-- migration-v12-platform-settings.sql
-- Description : Table paramètres globaux de la plateforme
-- Date : 2026-04-06
-- À exécuter dans : Supabase Dashboard > SQL Editor

BEGIN;

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps_select_auth" ON platform_settings
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "ps_all_admin" ON platform_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));

CREATE POLICY "ps_all_service" ON platform_settings
  FOR ALL TO service_role USING (TRUE);

COMMIT;
