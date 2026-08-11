-- ============================================================================
-- 037_fix_storage_rls.sql — Fix overly permissive storage bucket policies
-- Problem: Migration 009 created auth_upload_all/auth_update_own/auth_delete_own
-- policies that allow ANY authenticated user to upload/update/delete files in
-- ALL storage buckets. This replaces them with admin-only policies.
--
-- Idempotent: every CREATE POLICY is preceded by a DROP POLICY IF EXISTS
-- so this migration can re-run on databases that already carry policies
-- created under the pre-renumbering file names.
-- ============================================================================

-- Drop the overly permissive policies from 009
DROP POLICY IF EXISTS "auth_upload_all" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_own" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_own" ON storage.objects;

-- Fix CV bucket policies from 001 (used auth.role() = 'authenticated' instead of is_admin())
DROP POLICY IF EXISTS "admin_upload_cv" ON storage.objects;
DROP POLICY IF EXISTS "admin_update_cv" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_cv" ON storage.objects;

-- Fix image bucket policy from 004 (FOR ALL without is_admin() check)
DROP POLICY IF EXISTS "admin_all_images" ON storage.objects;

-- Recreate per-bucket admin-only INSERT policies
DROP POLICY IF EXISTS "admin_upload_cv" ON storage.objects;
CREATE POLICY "admin_upload_cv" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cv' AND is_admin());

DROP POLICY IF EXISTS "admin_upload_projects" ON storage.objects;
CREATE POLICY "admin_upload_projects" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'projects' AND is_admin());

DROP POLICY IF EXISTS "admin_upload_certifications" ON storage.objects;
CREATE POLICY "admin_upload_certifications" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'certifications' AND is_admin());

DROP POLICY IF EXISTS "admin_upload_documents" ON storage.objects;
CREATE POLICY "admin_upload_documents" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND is_admin());

-- Recreate per-bucket admin-only UPDATE policies
DROP POLICY IF EXISTS "admin_update_cv" ON storage.objects;
CREATE POLICY "admin_update_cv" ON storage.objects FOR UPDATE
  USING (bucket_id = 'cv' AND is_admin());

DROP POLICY IF EXISTS "admin_update_projects" ON storage.objects;
CREATE POLICY "admin_update_projects" ON storage.objects FOR UPDATE
  USING (bucket_id = 'projects' AND is_admin());

DROP POLICY IF EXISTS "admin_update_certifications" ON storage.objects;
CREATE POLICY "admin_update_certifications" ON storage.objects FOR UPDATE
  USING (bucket_id = 'certifications' AND is_admin());

DROP POLICY IF EXISTS "admin_update_documents" ON storage.objects;
CREATE POLICY "admin_update_documents" ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND is_admin());

-- Recreate per-bucket admin-only DELETE policies
DROP POLICY IF EXISTS "admin_delete_cv" ON storage.objects;
CREATE POLICY "admin_delete_cv" ON storage.objects FOR DELETE
  USING (bucket_id = 'cv' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_projects" ON storage.objects;
CREATE POLICY "admin_delete_projects" ON storage.objects FOR DELETE
  USING (bucket_id = 'projects' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_certifications" ON storage.objects;
CREATE POLICY "admin_delete_certifications" ON storage.objects FOR DELETE
  USING (bucket_id = 'certifications' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_documents" ON storage.objects;
CREATE POLICY "admin_delete_documents" ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND is_admin());

-- Recreate admin-only policies for image buckets (from 004)
DROP POLICY IF EXISTS "admin_insert_project_images" ON storage.objects;
CREATE POLICY "admin_insert_project_images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project_images' AND is_admin());

DROP POLICY IF EXISTS "admin_insert_image_variants" ON storage.objects;
CREATE POLICY "admin_insert_image_variants" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'image_variants' AND is_admin());

DROP POLICY IF EXISTS "admin_insert_avatars" ON storage.objects;
CREATE POLICY "admin_insert_avatars" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND is_admin());

DROP POLICY IF EXISTS "admin_update_project_images" ON storage.objects;
CREATE POLICY "admin_update_project_images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'project_images' AND is_admin());

DROP POLICY IF EXISTS "admin_update_image_variants" ON storage.objects;
CREATE POLICY "admin_update_image_variants" ON storage.objects FOR UPDATE
  USING (bucket_id = 'image_variants' AND is_admin());

DROP POLICY IF EXISTS "admin_update_avatars" ON storage.objects;
CREATE POLICY "admin_update_avatars" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_project_images" ON storage.objects;
CREATE POLICY "admin_delete_project_images" ON storage.objects FOR DELETE
  USING (bucket_id = 'project_images' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_image_variants" ON storage.objects;
CREATE POLICY "admin_delete_image_variants" ON storage.objects FOR DELETE
  USING (bucket_id = 'image_variants' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_avatars" ON storage.objects;
CREATE POLICY "admin_delete_avatars" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND is_admin());