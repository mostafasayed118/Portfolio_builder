-- ============================================================================
-- 066_tenant_rls.sql — owner + public policies on tenanted tables
-- Spec: 2026-09-16-multi-tenancy-design.md §5
--
-- ADDS owner policies and re-scopes public reads. Existing is_admin()-based
-- admin_all_* policies are intentionally KEPT this phase: the running API
-- writes with the service-role key (RLS bypass) and Phase 2 removes them.
-- Transition: public reads accept portfolio_id IS NULL rows (legacy writers).
-- Idempotent: DROP POLICY IF EXISTS before every CREATE.
-- ============================================================================

-- 1. Owner CRUD policies for every tenanted table.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'theme_settings','typography_settings','site_settings','seo_settings',
    'hero_content','about_content','contact_info','cv_settings',
    'skills','projects','experience','certifications','messages',
    'section_settings','content_snapshots','section_variants',
    'analytics_events','content_health_reports','image_metadata',
    'image_variants','blog_posts'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS owner_select_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE POLICY owner_select_%1$s ON public.%1$I FOR SELECT TO authenticated USING (public.owns_portfolio(portfolio_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_insert_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE POLICY owner_insert_%1$s ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.owns_portfolio(portfolio_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_update_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE POLICY owner_update_%1$s ON public.%1$I FOR UPDATE TO authenticated USING (public.owns_portfolio(portfolio_id)) WITH CHECK (public.owns_portfolio(portfolio_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_delete_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE POLICY owner_delete_%1$s ON public.%1$I FOR DELETE TO authenticated USING (public.owns_portfolio(portfolio_id))', t);
  END LOOP;
END $$;

-- 2. Public reads: existing per-table visibility predicates + portfolio gate.
--    (Predicate per table copied from 001/025/042/046.)

DROP POLICY IF EXISTS "public_read_hero" ON public.hero_content;
CREATE POLICY "public_read_hero" ON public.hero_content FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_about" ON public.about_content;
CREATE POLICY "public_read_about" ON public.about_content FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_skills" ON public.skills;
CREATE POLICY "public_read_skills" ON public.skills FOR SELECT
  TO anon, authenticated USING (is_visible = true AND deleted_at IS NULL
    AND (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id)));

DROP POLICY IF EXISTS "public_read_projects" ON public.projects;
CREATE POLICY "public_read_projects" ON public.projects FOR SELECT
  TO anon, authenticated USING (is_published = true AND deleted_at IS NULL
    AND (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id)));

DROP POLICY IF EXISTS "public_read_experience" ON public.experience;
CREATE POLICY "public_read_experience" ON public.experience FOR SELECT
  TO anon, authenticated USING (is_published = true AND deleted_at IS NULL
    AND (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id)));

DROP POLICY IF EXISTS "public_read_certifications" ON public.certifications;
CREATE POLICY "public_read_certifications" ON public.certifications FOR SELECT
  TO anon, authenticated USING (is_published = true AND deleted_at IS NULL
    AND (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id)));

DROP POLICY IF EXISTS "public_read_contact" ON public.contact_info;
CREATE POLICY "public_read_contact" ON public.contact_info FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_theme" ON public.theme_settings;
CREATE POLICY "public_read_theme" ON public.theme_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_typography" ON public.typography_settings;
CREATE POLICY "public_read_typography" ON public.typography_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_site" ON public.site_settings;
CREATE POLICY "public_read_site" ON public.site_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_seo" ON public.seo_settings;
CREATE POLICY "public_read_seo" ON public.seo_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_sections" ON public.section_settings;
CREATE POLICY "public_read_sections" ON public.section_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_variants" ON public.section_variants;
CREATE POLICY "public_read_variants" ON public.section_variants FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

-- 036 opened cv_settings to anon so public CV download works; now portfolio-gated.
DROP POLICY IF EXISTS "public_read_cv" ON public.cv_settings;
CREATE POLICY "public_read_cv" ON public.cv_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

-- 046 public blog read + portfolio gate.
DROP POLICY IF EXISTS "public_read_published_blog_posts" ON public.blog_posts;
CREATE POLICY "public_read_published_blog_posts" ON public.blog_posts FOR SELECT
  TO anon, authenticated USING (is_published = true AND deleted_at IS NULL
    AND (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id)));

-- 3. Scoped public INSERTs. messages: visitor writes reach RLS again (Phase 2
--    switches the API from service-role to the anon path); guards pin the
--    columns an anonymous writer must not control (059 rationale).
DROP POLICY IF EXISTS "public_insert_messages" ON public.messages;
CREATE POLICY "public_insert_messages" ON public.messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    public.is_published_portfolio(portfolio_id)
    AND status = 'unread'
    AND is_spam = false
    AND spam_score IS NULL
    AND spam_reason IS NULL
    AND reply_email_draft IS NULL
    AND replied_at IS NULL
    AND deleted_at IS NULL
  );

-- analytics_events: keep 059's event-type whitelist + length caps, add the
-- portfolio gate (NULL tolerated until the portfolio frontend sends its
-- portfolio_id — Phase 2 removes the NULL branch).
DROP POLICY IF EXISTS "public_insert_analytics" ON public.analytics_events;
CREATE POLICY "public_insert_analytics" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id))
    AND type IN ('page_view', 'project_view', 'cv_download', 'contact_click')
    AND char_length(COALESCE(path, '')) <= 512
    AND char_length(COALESCE(section_key, '')) <= 128
    AND char_length(COALESCE(preset_id, '')) <= 255
    AND char_length(COALESCE(referrer, '')) <= 1024
    AND char_length(COALESCE(device, '')) <= 64
  );

-- 4. Verify no tenanted table is left without an owner policy (fails loudly).
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'theme_settings','typography_settings','site_settings','seo_settings',
    'hero_content','about_content','contact_info','cv_settings',
    'skills','projects','experience','certifications','messages',
    'section_settings','content_snapshots','section_variants',
    'analytics_events','content_health_reports','image_metadata',
    'image_variants','blog_posts'
  ];
  missing INT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    SELECT COUNT(*) INTO missing FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t AND policyname = 'owner_select_' || t;
    IF missing = 0 THEN
      RAISE EXCEPTION 'owner_select policy missing for %', t;
    END IF;
  END LOOP;
END $$;
