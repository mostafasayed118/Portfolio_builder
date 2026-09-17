CREATE OR REPLACE FUNCTION public.is_published_storage_object(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE id::text = split_part(p_name, '/', 1)
      AND position('/' IN p_name) > 0
      AND is_published = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_published_storage_object(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_storage_object(TEXT) TO anon, authenticated, service_role;

UPDATE storage.buckets SET public = false
WHERE id IN ('cv', 'project_images', 'projects', 'certifications', 'avatars');

DROP POLICY IF EXISTS public_download_cv ON storage.objects;
CREATE POLICY public_download_cv ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'cv' AND public.is_published_storage_object(name));

DROP POLICY IF EXISTS public_read_project_images ON storage.objects;
DROP POLICY IF EXISTS public_read_projects ON storage.objects;
DROP POLICY IF EXISTS public_read_certifications ON storage.objects;
DROP POLICY IF EXISTS public_read_avatars ON storage.objects;
DROP POLICY IF EXISTS published_images_read ON storage.objects;
CREATE POLICY published_images_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id IN ('project_images', 'projects', 'certifications', 'avatars')
    AND public.is_published_storage_object(name)
  );
