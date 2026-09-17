DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'theme_settings','typography_settings','site_settings','seo_settings',
    'hero_content','about_content','contact_info','cv_settings',
    'skills','projects','experience','certifications','messages',
    'section_settings','content_snapshots','section_variants',
    'analytics_events','content_health_reports','image_metadata',
    'image_variants','blog_posts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS user_id RESTRICT', t);
  END LOOP;
END $$;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE (schemaname = 'public' AND policyname LIKE 'admin_all_%')
      OR (schemaname = 'public' AND (tablename, policyname) IN (
        ('messages','admin_select_messages'),
        ('messages','admin_insert_messages'),
        ('messages','admin_update_messages'),
        ('messages','admin_delete_messages'),
        ('cv_settings','admin_select_cv'),
        ('cv_settings','admin_insert_cv'),
        ('cv_settings','admin_update_cv'),
        ('cv_settings','admin_delete_cv'),
        ('analytics_events','admin_select_analytics'),
        ('analytics_events','admin_insert_analytics'),
        ('analytics_events','admin_update_analytics'),
        ('analytics_events','admin_delete_analytics'),
        ('content_health_reports','admin_select_health'),
        ('content_health_reports','admin_insert_health'),
        ('content_health_reports','admin_update_health'),
        ('content_health_reports','admin_delete_health')
      ))
      OR (schemaname = 'storage' AND tablename = 'objects'
        AND (COALESCE(qual, '') || COALESCE(with_check, '')) ~ '\mis_admin\M')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

DROP POLICY IF EXISTS public_read_theme_settings ON public.theme_settings;
DROP POLICY IF EXISTS public_read_typography_settings ON public.typography_settings;
DROP POLICY IF EXISTS public_read_site_settings ON public.site_settings;
DROP POLICY IF EXISTS public_read_seo_settings ON public.seo_settings;
DROP POLICY IF EXISTS public_read_hero_content ON public.hero_content;
DROP POLICY IF EXISTS public_read_about_content ON public.about_content;
DROP POLICY IF EXISTS public_read_contact_info ON public.contact_info;
DROP POLICY IF EXISTS public_read_section_settings ON public.section_settings;
DROP POLICY IF EXISTS public_read_section_variants ON public.section_variants;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT p.tablename, p.policyname, p.qual FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.cmd = 'SELECT'
      AND p.policyname LIKE 'public_read_%'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = p.schemaname AND c.table_name = p.tablename
          AND c.column_name = 'portfolio_id'
      )
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)',
      pol.policyname, pol.tablename,
      replace(pol.qual, '(portfolio_id IS NULL) OR ', ''));
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.users
  WHERE clerk_id = NULLIF(auth.jwt() ->> 'sub', '');
$$;

REVOKE ALL ON FUNCTION public.current_app_user_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated, service_role;

CREATE POLICY owner_select_theme_presets ON public.theme_presets
  FOR SELECT TO authenticated
  USING (user_id = (SELECT public.current_app_user_id()));
CREATE POLICY owner_insert_theme_presets ON public.theme_presets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT public.current_app_user_id()));
CREATE POLICY owner_update_theme_presets ON public.theme_presets
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT public.current_app_user_id()))
  WITH CHECK (user_id = (SELECT public.current_app_user_id()));
CREATE POLICY owner_delete_theme_presets ON public.theme_presets
  FOR DELETE TO authenticated
  USING (user_id = (SELECT public.current_app_user_id()));

CREATE OR REPLACE FUNCTION public.theme_presets_enforce_cap()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  active_count INTEGER;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND OLD.user_id IS NOT DISTINCT FROM NEW.user_id THEN
      RETURN NEW;
    END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(NEW.user_id::text, 'theme_presets_global'), 69));
  SELECT count(*) INTO active_count FROM public.theme_presets
  WHERE user_id IS NOT DISTINCT FROM NEW.user_id AND deleted_at IS NULL
    AND id <> NEW.id;
  IF active_count >= 10 THEN
    RAISE EXCEPTION 'Template limit reached: at most 10 custom templates per user'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS theme_presets_enforce_cap_trigger ON public.theme_presets;
CREATE TRIGGER theme_presets_enforce_cap_trigger
  BEFORE INSERT OR UPDATE OF user_id, deleted_at ON public.theme_presets
  FOR EACH ROW EXECUTE FUNCTION public.theme_presets_enforce_cap();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_email TEXT;
BEGIN
  BEGIN
    user_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN user_email := NULL; END;
  IF user_email IS NULL OR user_email = '' THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE email = lower(user_email) AND role = 'superadmin'
  );
END;
$$;

ALTER FUNCTION public.cleanup_old_analytics() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.cleanup_old_analytics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_analytics() TO service_role;

DROP POLICY IF EXISTS "public_insert_analytics" ON public.analytics_events;
CREATE POLICY "public_insert_analytics" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    public.is_published_portfolio(portfolio_id)
    AND type IN ('page_view', 'project_view', 'cv_download', 'contact_click')
    AND char_length(COALESCE(path, '')) <= 512
    AND char_length(COALESCE(section_key, '')) <= 128
    AND char_length(COALESCE(preset_id, '')) <= 255
    AND char_length(COALESCE(referrer, '')) <= 1024
    AND char_length(COALESCE(device, '')) <= 64
  );

DO $$
DECLARE
  leftover INT;
BEGIN
  SELECT count(*) INTO leftover
  FROM pg_policies p
  WHERE (p.schemaname = 'public' AND p.policyname LIKE 'admin_all_%')
    OR (
      (COALESCE(p.qual, '') || COALESCE(p.with_check, '')) ~ '\mis_admin\M'
      AND (
        (p.schemaname = 'storage' AND p.tablename = 'objects')
        OR (p.schemaname = 'public' AND EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_schema = p.schemaname AND c.table_name = p.tablename
            AND c.column_name = 'portfolio_id'
        ))
      )
    );
  IF leftover > 0 THEN
    RAISE EXCEPTION '069 verification failed: % legacy tenant admin policies remain', leftover;
  END IF;

  SELECT count(*) INTO leftover FROM pg_policies p
  WHERE p.schemaname = 'public' AND p.permissive = 'PERMISSIVE'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = p.schemaname AND c.table_name = p.tablename
        AND c.column_name = 'portfolio_id'
    )
    AND NOT COALESCE((
      (p.roles = ARRAY['authenticated']::name[] AND (
        (p.cmd IN ('SELECT', 'DELETE') AND p.qual = 'owns_portfolio(portfolio_id)')
        OR (p.cmd = 'INSERT' AND p.with_check = 'owns_portfolio(portfolio_id)')
        OR (p.cmd = 'UPDATE' AND p.qual = 'owns_portfolio(portfolio_id)'
          AND p.with_check = 'owns_portfolio(portfolio_id)')
      ))
      OR (p.roles = ARRAY['anon','authenticated']::name[]
        AND p.cmd IN ('SELECT', 'INSERT')
        AND COALESCE(p.qual, p.with_check, '') LIKE '%is_published_portfolio(portfolio_id)%'
        AND COALESCE(p.qual, p.with_check, '') !~ '\mOR\M|portfolio_id IS NULL|\mis_admin\M')
    ), FALSE);
  IF leftover > 0 THEN
    RAISE EXCEPTION '069 verification failed: % permissive tenant policy bypasses remain', leftover;
  END IF;

  SELECT count(*) INTO leftover FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users'
    AND policyname IN ('admin_select_users','admin_insert_users','admin_update_users','admin_delete_users');
  IF leftover <> 4 THEN
    RAISE EXCEPTION '069 verification failed: global users authorization is incomplete';
  END IF;

  SELECT count(*) INTO leftover
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.column_name = 'user_id'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns tenant
      WHERE tenant.table_schema = c.table_schema AND tenant.table_name = c.table_name
        AND tenant.column_name = 'portfolio_id'
    );
  IF leftover > 0 THEN
    RAISE EXCEPTION '069 verification failed: % tenant user_id columns remain', leftover;
  END IF;
END $$;
