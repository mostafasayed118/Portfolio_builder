-- ============================================================================
-- 065_tenant_columns_backfill.sql — portfolio_id everywhere + backfill
-- Spec: 2026-09-16-multi-tenancy-design.md §4.2, §7
-- Idempotent: IF NOT EXISTS / WHERE ... IS NULL guards; safe to re-run.
-- ============================================================================

-- 1. Portfolio #1 (legacy single-tenant data). Owner is a placeholder unless a
-- superadmin user exists (true on the hosted DB); production runbook replaces
-- 'legacy-owner' with the real Clerk id when unknown.
INSERT INTO public.portfolios (owner_user_id, slug, title, is_published)
SELECT COALESCE(
         (SELECT u.clerk_id FROM public.users u WHERE u.role = 'superadmin' ORDER BY u.created_at LIMIT 1),
         'legacy-owner'),
       'mustafa', 'Mustafa Sayed', true
WHERE NOT EXISTS (SELECT 1 FROM public.portfolios WHERE slug = 'mustafa');

-- 2. Add portfolio_id + backfill on every tenanted table.
-- image_variants is backfilled from its parent image_metadata row afterwards.
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
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET portfolio_id = (SELECT id FROM public.portfolios WHERE slug = ''mustafa'') WHERE portfolio_id IS NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_portfolio ON public.%I(portfolio_id)', t, t);
  END LOOP;
END $$;

-- image_variants: inherit from parent image_metadata (overrides the blanket backfill above)
UPDATE public.image_variants v
SET portfolio_id = p.portfolio_id
FROM public.image_metadata p
WHERE v.parent_image_id = p.id AND v.portfolio_id IS DISTINCT FROM p.portfolio_id;

-- 3. Singleton tables: replace the global ((true)) guard with a per-portfolio
-- guard. COALESCE maps legacy NULL-portfolio rows onto the nil UUID so at most
-- one legacy row can exist, same guarantee as 057.
DROP INDEX IF EXISTS public.theme_settings_singleton_idx;
DROP INDEX IF EXISTS public.typography_settings_singleton_idx;
DROP INDEX IF EXISTS public.site_settings_singleton_idx;
DROP INDEX IF EXISTS public.seo_settings_singleton_idx;
DROP INDEX IF EXISTS public.hero_content_singleton_idx;
DROP INDEX IF EXISTS public.about_content_singleton_idx;
DROP INDEX IF EXISTS public.contact_info_singleton_idx;
DROP INDEX IF EXISTS public.cv_settings_singleton_idx;

CREATE UNIQUE INDEX IF NOT EXISTS theme_settings_portfolio_singleton_idx
  ON public.theme_settings ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS typography_settings_portfolio_singleton_idx
  ON public.typography_settings ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_portfolio_singleton_idx
  ON public.site_settings ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS seo_settings_portfolio_singleton_idx
  ON public.seo_settings ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS hero_content_portfolio_singleton_idx
  ON public.hero_content ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS about_content_portfolio_singleton_idx
  ON public.about_content ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS contact_info_portfolio_singleton_idx
  ON public.contact_info ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS cv_settings_portfolio_singleton_idx
  ON public.cv_settings ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));

-- 4. section_settings: global key uniqueness becomes per-portfolio; the
-- analytics_events.section_key FK must follow (composite).
ALTER TABLE public.section_settings DROP CONSTRAINT IF EXISTS section_settings_key;
ALTER TABLE public.section_settings DROP CONSTRAINT IF EXISTS section_settings_portfolio_key_unique;
ALTER TABLE public.section_settings
  ADD CONSTRAINT section_settings_portfolio_key_unique UNIQUE (portfolio_id, key);

ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS fk_analytics_section;
ALTER TABLE public.analytics_events
  ADD CONSTRAINT fk_analytics_section
  FOREIGN KEY (portfolio_id, section_key)
  REFERENCES public.section_settings(portfolio_id, key)
  ON DELETE SET NULL NOT VALID;
ALTER TABLE public.analytics_events VALIDATE CONSTRAINT fk_analytics_section;

-- 5. blog_posts: slug uniqueness moves from (user_id, slug) to portfolio scope.
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_user_slug_unique;
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_portfolio_slug_unique
  ON public.blog_posts ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)), slug);

-- 6. Drop the legacy contact_messages table (data consolidated into messages by 023).
DROP TABLE IF EXISTS public.contact_messages;
