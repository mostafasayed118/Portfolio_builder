-- ============================================================================
-- 002_fix_rls_policies.sql — Fix RLS policies that use FOR ALL
-- Supabase doesn't properly combine FOR ALL with operation-specific policies
-- ============================================================================

-- Fix messages: replace FOR ALL with per-operation policies
DROP POLICY IF EXISTS "admin_all_messages" ON messages;
DROP POLICY IF EXISTS "public_insert_messages" ON messages;
DROP POLICY IF EXISTS "admin_select_messages" ON messages;
CREATE POLICY "admin_select_messages" ON messages FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_messages" ON messages;
CREATE POLICY "admin_insert_messages" ON messages FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_messages" ON messages;
CREATE POLICY "admin_update_messages" ON messages FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_messages" ON messages;
CREATE POLICY "admin_delete_messages" ON messages FOR DELETE USING (is_admin());
DROP POLICY IF EXISTS "public_insert_messages" ON messages;
CREATE POLICY "public_insert_messages" ON messages FOR INSERT WITH CHECK (true);

-- Fix cv_settings: replace FOR ALL with per-operation policies
DROP POLICY IF EXISTS "admin_all_cv" ON cv_settings;
DROP POLICY IF EXISTS "admin_select_cv" ON cv_settings;
CREATE POLICY "admin_select_cv" ON cv_settings FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_cv" ON cv_settings;
CREATE POLICY "admin_insert_cv" ON cv_settings FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_cv" ON cv_settings;
CREATE POLICY "admin_update_cv" ON cv_settings FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_cv" ON cv_settings;
CREATE POLICY "admin_delete_cv" ON cv_settings FOR DELETE USING (is_admin());

-- Fix content_snapshots: replace FOR ALL with per-operation policies
DROP POLICY IF EXISTS "admin_all_snapshots" ON content_snapshots;
DROP POLICY IF EXISTS "admin_select_snapshots" ON content_snapshots;
CREATE POLICY "admin_select_snapshots" ON content_snapshots FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_snapshots" ON content_snapshots;
CREATE POLICY "admin_insert_snapshots" ON content_snapshots FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_snapshots" ON content_snapshots;
CREATE POLICY "admin_update_snapshots" ON content_snapshots FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_snapshots" ON content_snapshots;
CREATE POLICY "admin_delete_snapshots" ON content_snapshots FOR DELETE USING (is_admin());

-- Fix analytics_events: replace FOR ALL with per-operation policies
DROP POLICY IF EXISTS "admin_all_analytics" ON analytics_events;
DROP POLICY IF EXISTS "admin_select_analytics" ON analytics_events;
CREATE POLICY "admin_select_analytics" ON analytics_events FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_analytics" ON analytics_events;
CREATE POLICY "admin_insert_analytics" ON analytics_events FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_analytics" ON analytics_events;
CREATE POLICY "admin_update_analytics" ON analytics_events FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_analytics" ON analytics_events;
CREATE POLICY "admin_delete_analytics" ON analytics_events FOR DELETE USING (is_admin());
-- Keep the public insert policy
DROP POLICY IF EXISTS "public_insert_analytics" ON analytics_events;
CREATE POLICY "public_insert_analytics" ON analytics_events FOR INSERT WITH CHECK (true);

-- Fix content_health_reports: replace FOR ALL with per-operation policies
DROP POLICY IF EXISTS "admin_all_health" ON content_health_reports;
DROP POLICY IF EXISTS "admin_select_health" ON content_health_reports;
CREATE POLICY "admin_select_health" ON content_health_reports FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_health" ON content_health_reports;
CREATE POLICY "admin_insert_health" ON content_health_reports FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_health" ON content_health_reports;
CREATE POLICY "admin_update_health" ON content_health_reports FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_health" ON content_health_reports;
CREATE POLICY "admin_delete_health" ON content_health_reports FOR DELETE USING (is_admin());
