-- ============================================================================
-- 009_storage_buckets.sql — Additional storage buckets for uploads
-- Creates buckets for certifications badges, CV documents, and projects
-- Existing buckets from 004_images: project_images, image_variants, avatars
-- ============================================================================

-- Projects screenshots bucket (separate from legacy project_images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('projects', 'projects', true)
ON CONFLICT (id) DO NOTHING;

-- Certifications badge images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certifications', 'certifications', true)
ON CONFLICT (id) DO NOTHING;

-- Documents bucket (private — for CV files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: public read for public buckets
DROP POLICY IF EXISTS "public_read_projects" ON storage.objects;
CREATE POLICY "public_read_projects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'projects');

DROP POLICY IF EXISTS "public_read_certifications" ON storage.objects;
CREATE POLICY "public_read_certifications"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certifications');

-- RLS: authenticated users can upload to all buckets
DROP POLICY IF EXISTS "auth_upload_all" ON storage.objects;
CREATE POLICY "auth_upload_all"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_update_own" ON storage.objects;
CREATE POLICY "auth_update_own"
  ON storage.objects FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_delete_own" ON storage.objects;
CREATE POLICY "auth_delete_own"
  ON storage.objects FOR DELETE
  USING (auth.role() = 'authenticated');
