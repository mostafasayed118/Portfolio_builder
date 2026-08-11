-- Enable RLS on image_metadata and image_variants
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_image_metadata" ON image_metadata;
CREATE POLICY "public_read_image_metadata"
  ON image_metadata FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_all_image_metadata" ON image_metadata;
CREATE POLICY "admin_all_image_metadata"
  ON image_metadata FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public_read_image_variants" ON image_variants;
CREATE POLICY "public_read_image_variants"
  ON image_variants FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_all_image_variants" ON image_variants;
CREATE POLICY "admin_all_image_variants"
  ON image_variants FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Ensure content_snapshots and section_variants also have RLS
ALTER TABLE content_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_content_snapshots" ON content_snapshots;
CREATE POLICY "admin_all_content_snapshots"
  ON content_snapshots FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_all_section_variants" ON section_variants;
CREATE POLICY "admin_all_section_variants"
  ON section_variants FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
