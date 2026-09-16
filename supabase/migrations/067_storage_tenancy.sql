-- ============================================================================
-- 067_storage_tenancy.sql — per-tenant storage paths + storage RLS
-- Spec: 2026-09-16-multi-tenancy-design.md §4.4
-- Idempotent: prefix step guards with a leading-UUID regex; policies IF EXISTS.
-- ============================================================================

-- 1. Helper: does the caller own the portfolio encoded in the object path?
CREATE OR REPLACE FUNCTION public.owns_storage_object(p_bucket TEXT, p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE id::text = split_part(p_name, '/', 1)
      AND owner_user_id = NULLIF(auth.jwt() ->> 'sub', '')
  );
$$;

COMMENT ON FUNCTION public.owns_storage_object(TEXT, TEXT) IS 'True when the first path segment of the object name is a portfolio owned by the JWT sub.';

-- 2. Prefix every existing (flat, unprefixed) object in the tenanted buckets
--    with portfolio #1's id.
DO $$
DECLARE
  p1 TEXT;
  b TEXT;
BEGIN
  SELECT id::text INTO p1 FROM public.portfolios WHERE slug = 'mustafa';
  IF p1 IS NULL THEN
    RAISE EXCEPTION 'portfolio #1 (slug mustafa) missing — run 065 first';
  END IF;
  FOREACH b IN ARRAY ARRAY['cv','project_images','image_variants','avatars','projects','certifications','documents'] LOOP
    UPDATE storage.objects
    SET name = p1 || '/' || name
    WHERE bucket_id = b
      AND name !~ ('^' || p1 || '/');
  END LOOP;
END $$;

-- 3. Point DB path columns at the renamed objects (skip already-prefixed).
DO $$
DECLARE
  p1 TEXT;
BEGIN
  SELECT id::text INTO p1 FROM public.portfolios WHERE slug = 'mustafa';

  UPDATE public.cv_settings
  SET object_path = p1 || '/' || object_path
  WHERE object_path NOT LIKE p1 || '/%';

  UPDATE public.image_metadata
  SET storage_path = p1 || '/' || storage_path
  WHERE storage_path NOT LIKE p1 || '/%';

  UPDATE public.image_variants
  SET storage_path = p1 || '/' || storage_path
  WHERE storage_path NOT LIKE p1 || '/%';

  -- Public URLs embed the object path after /object/public/<bucket>/.
  UPDATE public.projects
  SET image_url = regexp_replace(
        image_url,
        '(/object/public/(project_images|projects|certifications)/)(?!' || p1 || ')',
        '\1' || p1 || '/')
  WHERE image_url IS NOT NULL
    AND image_url LIKE '%/object/public/%'
    AND image_url NOT LIKE '%/object/public/%' || p1 || '/%';

  UPDATE public.blog_posts
  SET cover_image_url = regexp_replace(
        cover_image_url,
        '(/object/public/(project_images|projects|certifications)/)(?!' || p1 || ')',
        '\1' || p1 || '/')
  WHERE cover_image_url IS NOT NULL
    AND cover_image_url LIKE '%/object/public/%'
    AND cover_image_url NOT LIKE '%/object/public/%' || p1 || '/%';

  UPDATE public.seo_settings
  SET og_image = regexp_replace(
        og_image,
        '(/object/public/(project_images|projects|certifications)/)(?!' || p1 || ')',
        '\1' || p1 || '/')
  WHERE og_image IS NOT NULL
    AND og_image LIKE '%/object/public/%'
    AND og_image NOT LIKE '%/object/public/%' || p1 || '/%';
END $$;

-- 4. Owner write policies per bucket (public reads are unchanged: public
--    buckets already allow anon SELECT; cv allows public download per 001).
DROP POLICY IF EXISTS "owner_all_project_images" ON storage.objects;
CREATE POLICY "owner_all_project_images" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'project_images' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'project_images' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_image_variants" ON storage.objects;
CREATE POLICY "owner_all_image_variants" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'image_variants' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'image_variants' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_avatars" ON storage.objects;
CREATE POLICY "owner_all_avatars" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'avatars' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_cv" ON storage.objects;
CREATE POLICY "owner_all_cv" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'cv' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'cv' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_projects_bucket" ON storage.objects;
CREATE POLICY "owner_all_projects_bucket" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'projects' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'projects' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_certifications_bucket" ON storage.objects;
CREATE POLICY "owner_all_certifications_bucket" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'certifications' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'certifications' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_documents" ON storage.objects;
CREATE POLICY "owner_all_documents" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'documents' AND public.owns_storage_object(bucket_id, name));
