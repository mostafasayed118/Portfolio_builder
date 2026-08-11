-- ============================================================================
-- 043_fix_missing_rls_policies.sql
-- Fixes missing RLS policies for analytics_events, users,
-- content_health_reports, and section_variants.
-- Also adds an explicit authorization check to the reorder_sections RPC function.
-- ============================================================================

-- 1. users table policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_users" ON users;
  CREATE POLICY "admin_all_users" ON users FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 2. analytics_events table policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "public_insert_analytics" ON analytics_events;
  CREATE POLICY "public_insert_analytics" ON analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);

  DROP POLICY IF EXISTS "admin_all_analytics" ON analytics_events;
  CREATE POLICY "admin_all_analytics" ON analytics_events FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 3. content_health_reports table policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_content_health_reports" ON content_health_reports;
  CREATE POLICY "admin_all_content_health_reports" ON content_health_reports FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 4. section_variants table policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "public_read_section_variants" ON section_variants;
  CREATE POLICY "public_read_section_variants" ON section_variants FOR SELECT TO anon, authenticated USING (true);

  DROP POLICY IF EXISTS "admin_all_section_variants" ON section_variants;
  CREATE POLICY "admin_all_section_variants" ON section_variants FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 5. reorder_sections authorization check
CREATE OR REPLACE FUNCTION reorder_sections(section_ids UUID[], sort_orders INTEGER[])
RETURNS VOID AS $$
DECLARE
  i INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  FOR i IN 1 .. array_length(section_ids, 1) LOOP
    UPDATE section_settings
    SET sort_order = sort_orders[i], updated_at = NOW()
    WHERE id = section_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql;
