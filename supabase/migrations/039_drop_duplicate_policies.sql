-- 039_drop_duplicate_policies.sql
-- Drop duplicate RLS policies that serve the same purpose

-- section_variants has two admin ALL policies:
--   admin_all_variants       (from 001_init.sql)
--   admin_all_section_variants (from 022_image_rls.sql)
-- Keep the more descriptive one, drop the duplicate.
DROP POLICY IF EXISTS "admin_all_variants" ON section_variants;

-- content_snapshots has 4 granular admin policies (from 001) + 1 ALL policy (from 022).
-- The ALL policy covers everything the granular ones do, so drop the extras.
DROP POLICY IF EXISTS "admin_select_snapshots" ON content_snapshots;
DROP POLICY IF EXISTS "admin_insert_snapshots" ON content_snapshots;
DROP POLICY IF EXISTS "admin_update_snapshots" ON content_snapshots;
DROP POLICY IF EXISTS "admin_delete_snapshots" ON content_snapshots;
