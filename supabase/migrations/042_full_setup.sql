-- ============================================================================
-- Portfolio-Fixer — Full Supabase Setup Script
-- Run this in Supabase Dashboard → SQL Editor.
-- Idempotent: safe to run multiple times (all statements use IF NOT EXISTS).
-- ============================================================================

-- ============================================================================
-- 1. Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. ENUM types
-- ============================================================================
DO $$
BEGIN
  EXECUTE 'CREATE TYPE theme_mode AS ENUM (''light'', ''dark'')';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'CREATE TYPE msg_status AS ENUM (''unread'', ''read'', ''archived'')';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'CREATE TYPE exp_type AS ENUM (''internship'', ''certification'', ''volunteer'')';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. The is_admin() RLS function (v2 — uses Supabase-native auth.jwt())
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  allowlist TEXT;
  allow_guc_fallback TEXT;
BEGIN
  -- Prefer the Supabase-native JWT claim accessor.
  BEGIN
    user_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN
    user_email := NULL;
  END;

  -- Fall back to the legacy Hasura/Convex-style GUC ONLY when explicitly enabled.
  IF user_email IS NULL OR user_email = '' THEN
    BEGIN
      allow_guc_fallback := current_setting('app.allow_guc_admin_fallback', true);
    EXCEPTION WHEN OTHERS THEN
      allow_guc_fallback := NULL;
    END;
    IF allow_guc_fallback = 'on' THEN
      BEGIN
        user_email := current_setting('request.jwt.claims', true)::jsonb ->> 'email';
      EXCEPTION WHEN OTHERS THEN
        user_email := NULL;
      END;
    END IF;
  END IF;

  IF user_email IS NULL OR user_email = '' THEN
    RETURN FALSE;
  END IF;

  allowlist := current_setting('app.admin_emails', true);
  IF allowlist IS NULL OR allowlist = '' THEN
    RETURN FALSE;
  END IF;

  RETURN lower(user_email) = ANY(string_to_array(lower(allowlist), ','));
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_admin()
  IS 'Returns true when the calling user email is in app.admin_emails. Reads email from auth.jwt().';

-- ============================================================================
-- 4. Admin authorization model
-- ============================================================================
-- Admin RLS authorization is resolved from the `users` table (see
-- 045_admin_is_admin_users_table.sql): a signed-in email is admin when
-- a matching row exists in `users`. The `users` table is populated by
-- the API server when it syncs Clerk users whose email is in the
-- ADMIN_EMAILS allowlist, so no database-level GUC is required.
--
-- NOTE: Supabase managed Postgres forbids `ALTER DATABASE ... SET` for
-- custom parameters ("permission denied to set parameter"), so the
-- former app.admin_emails database setting is intentionally not set here.
-- The legacy GUC fallback in is_admin() only activates for local dev
-- when explicitly enabled per-session:
--   SET app.allow_guc_admin_fallback = 'on';
--   SELECT set_config('app.admin_emails', 'admin@example.com', false);

-- ============================================================================
-- 5. Singleton tables
-- ============================================================================

-- 5a. theme_settings
CREATE TABLE IF NOT EXISTS theme_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mode theme_mode NOT NULL DEFAULT 'light',
  light_primary TEXT NOT NULL DEFAULT '204 92% 42%',
  light_accent TEXT NOT NULL DEFAULT '189 90% 38%',
  light_background TEXT NOT NULL DEFAULT '220 30% 97%',
  light_foreground TEXT NOT NULL DEFAULT '222 40% 10%',
  light_card TEXT NOT NULL DEFAULT '0 0% 100%',
  light_border TEXT NOT NULL DEFAULT '220 18% 84%',
  light_muted TEXT NOT NULL DEFAULT '220 20% 91%',
  light_muted_foreground TEXT NOT NULL DEFAULT '220 15% 42%',
  light_ring TEXT NOT NULL DEFAULT '204 92% 45%',
  dark_primary TEXT NOT NULL DEFAULT '204 92% 62%',
  dark_accent TEXT NOT NULL DEFAULT '189 95% 53%',
  dark_background TEXT NOT NULL DEFAULT '222 48% 6%',
  dark_foreground TEXT NOT NULL DEFAULT '210 30% 96%',
  dark_card TEXT NOT NULL DEFAULT '222 40% 9%',
  dark_border TEXT NOT NULL DEFAULT '220 22% 18%',
  dark_muted TEXT NOT NULL DEFAULT '222 32% 12%',
  dark_muted_foreground TEXT NOT NULL DEFAULT '215 18% 72%',
  dark_ring TEXT NOT NULL DEFAULT '204 92% 62%',
  radius TEXT NOT NULL DEFAULT '0.9rem',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5b. typography_settings
CREATE TABLE IF NOT EXISTS typography_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  body_font TEXT NOT NULL DEFAULT 'Spline Sans',
  display_font TEXT NOT NULL DEFAULT 'Unbounded',
  body_font_url TEXT,
  display_font_url TEXT,
  base_font_size TEXT NOT NULL DEFAULT '16px',
  line_height TEXT NOT NULL DEFAULT '1.6',
  letter_spacing TEXT NOT NULL DEFAULT '0em',
  heading_scale TEXT NOT NULL DEFAULT '1.25',
  font_weight_body TEXT NOT NULL DEFAULT '400',
  font_weight_heading TEXT NOT NULL DEFAULT '700',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5c. site_settings
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'Mustafa Sayed',
  site_tagline TEXT NOT NULL DEFAULT 'Data Engineer',
  footer_text TEXT NOT NULL DEFAULT 'Built with passion and a lot of coffee.',
  copyright_text TEXT NOT NULL DEFAULT '(c) Mustafa Sayed. All rights reserved.',
  logo_text TEXT NOT NULL DEFAULT 'MS',
  default_theme theme_mode NOT NULL DEFAULT 'dark',
  language_mode TEXT CHECK (language_mode IN ('en_only','ar_only','both')),
  default_language TEXT CHECK (default_language IN ('en','ar')),
  show_language_toggle BOOLEAN DEFAULT false,
  rtl_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5d. seo_settings
CREATE TABLE IF NOT EXISTS seo_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Mustafa Sayed — Data Engineer',
  description TEXT NOT NULL DEFAULT 'Data Engineer from Cairo. Python, Azure, ETL, full-stack.',
  keywords TEXT NOT NULL DEFAULT 'data engineer, ETL, Python, Azure, portfolio',
  og_title TEXT NOT NULL DEFAULT 'Mustafa Sayed — Data Engineer',
  og_description TEXT NOT NULL DEFAULT 'Building scalable data pipelines and full-stack solutions.',
  og_image TEXT,
  canonical_url TEXT NOT NULL DEFAULT 'https://mustafasayed.replit.app',
  twitter_card TEXT NOT NULL DEFAULT 'summary_large_image',
  twitter_creator TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5e. hero_content
CREATE TABLE IF NOT EXISTS hero_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  heading TEXT NOT NULL DEFAULT 'Hi, I''m',
  name TEXT NOT NULL DEFAULT 'Mustafa Sayed',
  roles TEXT[] NOT NULL DEFAULT '{"Data Engineer","ETL Developer","Python Developer","Full-Stack Developer"}',
  description TEXT NOT NULL DEFAULT 'Data Engineer passionate about building scalable web platforms and robust ETL pipelines.',
  heading_ar TEXT,
  name_ar TEXT,
  description_ar TEXT,
  github_url TEXT NOT NULL DEFAULT 'https://github.com/mustafasayed',
  linkedin_url TEXT NOT NULL DEFAULT 'https://linkedin.com/in/mustafasayed',
  twitter_url TEXT,
  email TEXT NOT NULL DEFAULT 'admin@example.com',
  avatar_url TEXT,
  cv_url TEXT,
  stats JSONB,
  available BOOLEAN NOT NULL DEFAULT true,
  site_name TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  tagline TEXT,
  cv_file_name TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5f. about_content
CREATE TABLE IF NOT EXISTS about_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bio1 TEXT NOT NULL DEFAULT 'Data Engineer with hands-on experience building production ETL pipelines.',
  bio2 TEXT NOT NULL DEFAULT 'Experienced in Python, SQL, Azure, and modern data stack technologies.',
  bio TEXT,
  bio1_ar TEXT,
  bio2_ar TEXT,
  bio_ar TEXT,
  location TEXT NOT NULL DEFAULT 'Cairo, Egypt',
  years_of_experience INTEGER NOT NULL DEFAULT 1,
  degree TEXT NOT NULL DEFAULT 'B.Sc. Statistics & Computer Science',
  school TEXT NOT NULL DEFAULT 'Ain Shams University',
  grade TEXT NOT NULL DEFAULT 'Very Good',
  education_years TEXT NOT NULL DEFAULT '2020 – 2024',
  education JSONB,
  languages JSONB NOT NULL DEFAULT '[{"name":"Arabic","level":100,"pct":100},{"name":"English","level":85,"pct":85}]',
  languages_ar JSONB,
  interests JSONB,
  interests_ar TEXT[],
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5g. contact_info
CREATE TABLE IF NOT EXISTS contact_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  phone TEXT,
  location TEXT,
  address TEXT,
  github TEXT,
  linkedin TEXT,
  whatsapp TEXT,
  map_embed_url TEXT,
  availability_status TEXT DEFAULT 'Open to opportunities',
  working_hours TEXT,
  social_links JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5h. cv_settings (stores the path to the uploaded CV PDF)
CREATE TABLE IF NOT EXISTS cv_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  object_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. Collection tables
-- ============================================================================

-- 6a. users (synced from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 6b. skills
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  category_ar TEXT,
  proficiency INTEGER NOT NULL CHECK (proficiency >= 0 AND proficiency <= 100),
  icon TEXT,
  sort_order INTEGER DEFAULT 999,
  is_visible BOOLEAN DEFAULT true,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_sort_order ON skills(sort_order);
CREATE INDEX IF NOT EXISTS idx_skills_is_visible ON skills(is_visible);
CREATE INDEX IF NOT EXISTS idx_skills_deleted ON skills(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skills_user ON skills(user_id);

-- 6c. projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  full_description TEXT,
  challenges TEXT,
  outcome TEXT,
  title_ar TEXT,
  description_ar TEXT,
  full_description_ar TEXT,
  challenges_ar TEXT,
  outcome_ar TEXT,
  completed_at TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  category TEXT,
  featured BOOLEAN DEFAULT false,
  github_url TEXT,
  live_url TEXT,
  slug TEXT NOT NULL,
  metrics TEXT[] DEFAULT '{}',
  sort_order INTEGER,
  is_published BOOLEAN DEFAULT false,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects(sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_projects_is_published ON projects(is_published);
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

-- 6d. experience
CREATE TABLE IF NOT EXISTS experience (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  period TEXT NOT NULL,
  description TEXT[] DEFAULT '{}',
  technologies TEXT[] DEFAULT '{}',
  title_ar TEXT,
  company_ar TEXT,
  location_ar TEXT,
  description_ar TEXT[],
  type exp_type NOT NULL,
  sort_order INTEGER,
  is_published BOOLEAN DEFAULT false,
  current BOOLEAN DEFAULT false,
  order_num INTEGER,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_experience_sort_order ON experience(sort_order);
CREATE INDEX IF NOT EXISTS idx_experience_is_published ON experience(is_published);
CREATE INDEX IF NOT EXISTS idx_experience_deleted ON experience(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_experience_user ON experience(user_id);

-- 6e. certifications
CREATE TABLE IF NOT EXISTS certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  title_ar TEXT,
  issuer_ar TEXT,
  issuer_logo TEXT,
  date TEXT NOT NULL,
  date_sort TEXT,
  category TEXT,
  credential_url TEXT,
  credential_id TEXT,
  sort_order INTEGER,
  is_published BOOLEAN DEFAULT false,
  skills TEXT[] DEFAULT '{}',
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certifications_sort_order ON certifications(sort_order);
CREATE INDEX IF NOT EXISTS idx_certifications_is_published ON certifications(is_published);
CREATE INDEX IF NOT EXISTS idx_certifications_deleted ON certifications(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_certifications_user ON certifications(user_id);

-- 6f. messages (contact form submissions)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status msg_status NOT NULL DEFAULT 'unread',
  reply_email_draft TEXT,
  replied_at TIMESTAMPTZ,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);

-- 6g. section_settings
CREATE TABLE IF NOT EXISTS section_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6h. content_snapshots (audit trail for changes)
CREATE TABLE IF NOT EXISTS content_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}',
  changed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_entity ON content_snapshots(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON content_snapshots(created_at DESC);

-- 6i. section_variants (A/B testing support)
CREATE TABLE IF NOT EXISTS section_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  preview_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_section_key ON section_variants(section_key, variant_key);

-- 6j. image_metadata
CREATE TABLE IF NOT EXISTS image_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size_bytes INTEGER NOT NULL,
  blur_hash TEXT,
  dominant_color TEXT,
  alt_text TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_image_entity ON image_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_image_entity_type ON image_metadata(entity_type);

-- 6k. image_variants
CREATE TABLE IF NOT EXISTS image_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_image_id UUID NOT NULL REFERENCES image_metadata(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_image_variants_parent ON image_variants(parent_image_id);

-- 6l. analytics_events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  path TEXT,
  section_key TEXT,
  project_id UUID,
  preset_id TEXT,
  referrer TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);

-- 6m. content_health_reports
CREATE TABLE IF NOT EXISTS content_health_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL,
  issues JSONB NOT NULL DEFAULT '[]',
  critical_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  suggestion_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. RLS policies
-- ============================================================================

-- 7a. Enable RLS on all tables
ALTER TABLE IF EXISTS theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS typography_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hero_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS about_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cv_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS section_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS content_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS section_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS content_health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS image_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS image_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- 7b. Public read policies (for the portfolio SPA using anon key)
-- Singleton settings tables: public read, admin write
DROP POLICY IF EXISTS "public_read_theme_settings" ON theme_settings;
CREATE POLICY "public_read_theme_settings" ON theme_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_read_typography_settings" ON typography_settings;
CREATE POLICY "public_read_typography_settings" ON typography_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_read_site_settings" ON site_settings;
CREATE POLICY "public_read_site_settings" ON site_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_read_seo_settings" ON seo_settings;
CREATE POLICY "public_read_seo_settings" ON seo_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_read_hero_content" ON hero_content;
CREATE POLICY "public_read_hero_content" ON hero_content FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_read_about_content" ON about_content;
CREATE POLICY "public_read_about_content" ON about_content FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_read_contact_info" ON contact_info;
CREATE POLICY "public_read_contact_info" ON contact_info FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_read_cv" ON cv_settings;
CREATE POLICY "public_read_cv" ON cv_settings FOR SELECT TO anon, authenticated USING (true);

-- Collection tables: public read (only published, not deleted)
DROP POLICY IF EXISTS "public_read_skills" ON skills;
CREATE POLICY "public_read_skills" ON skills FOR SELECT TO anon, authenticated
  USING (is_visible = true AND deleted_at IS NULL);
DROP POLICY IF EXISTS "public_read_projects" ON projects;
CREATE POLICY "public_read_projects" ON projects FOR SELECT TO anon, authenticated
  USING (is_published = true AND deleted_at IS NULL);
DROP POLICY IF EXISTS "public_read_experience" ON experience;
CREATE POLICY "public_read_experience" ON experience FOR SELECT TO anon, authenticated
  USING (is_published = true AND deleted_at IS NULL);
DROP POLICY IF EXISTS "public_read_certifications" ON certifications;
CREATE POLICY "public_read_certifications" ON certifications FOR SELECT TO anon, authenticated
  USING (is_published = true AND deleted_at IS NULL);

-- Section settings: public read (only visible sections)
DROP POLICY IF EXISTS "public_read_section_settings" ON section_settings;
CREATE POLICY "public_read_section_settings" ON section_settings FOR SELECT TO anon, authenticated
  USING (is_visible = true);

-- Image metadata: public read
DROP POLICY IF EXISTS "public_read_image_metadata" ON image_metadata;
CREATE POLICY "public_read_image_metadata" ON image_metadata FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_read_image_variants" ON image_variants;
CREATE POLICY "public_read_image_variants" ON image_variants FOR SELECT TO anon, authenticated USING (true);

-- 7c. Admin ALL policies (bypass RLS via is_admin())
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_theme_settings" ON theme_settings;
  CREATE POLICY "admin_all_theme_settings" ON theme_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_site_settings" ON site_settings;
  CREATE POLICY "admin_all_site_settings" ON site_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_hero_content" ON hero_content;
  CREATE POLICY "admin_all_hero_content" ON hero_content FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_about_content" ON about_content;
  CREATE POLICY "admin_all_about_content" ON about_content FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Collection tables: admin ALL (bypass user_id scope — api-server handles scoping)
DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_skills" ON skills;
  CREATE POLICY "admin_all_skills" ON skills FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_projects" ON projects;
  CREATE POLICY "admin_all_projects" ON projects FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_experience" ON experience;
  CREATE POLICY "admin_all_experience" ON experience FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_certifications" ON certifications;
  CREATE POLICY "admin_all_certifications" ON certifications FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_messages" ON messages;
  CREATE POLICY "admin_all_messages" ON messages FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_contact_info" ON contact_info;
  CREATE POLICY "admin_all_contact_info" ON contact_info FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_section_settings" ON section_settings;
  CREATE POLICY "admin_all_section_settings" ON section_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_content_snapshots" ON content_snapshots;
  CREATE POLICY "admin_all_content_snapshots" ON content_snapshots FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_image_metadata" ON image_metadata;
  CREATE POLICY "admin_all_image_metadata" ON image_metadata FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "admin_all_image_variants" ON image_variants;
  CREATE POLICY "admin_all_image_variants" ON image_variants FOR ALL USING (is_admin()) WITH CHECK (is_admin());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- 8. Storage bucket policies
-- ============================================================================
-- These control access to Supabase Storage buckets for images + CV uploads.

-- CV bucket: public download, admin upload/update/delete
DROP POLICY IF EXISTS "public_download_cv" ON storage.objects;
CREATE POLICY "public_download_cv" ON storage.objects FOR SELECT
  USING (bucket_id = 'cv');

DROP POLICY IF EXISTS "admin_upload_cv" ON storage.objects;
CREATE POLICY "admin_upload_cv" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cv' AND is_admin());

DROP POLICY IF EXISTS "admin_update_cv" ON storage.objects;
CREATE POLICY "admin_update_cv" ON storage.objects FOR UPDATE
  USING (bucket_id = 'cv' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_cv" ON storage.objects;
CREATE POLICY "admin_delete_cv" ON storage.objects FOR DELETE
  USING (bucket_id = 'cv' AND is_admin());

-- project_images bucket: public read, admin write
DROP POLICY IF EXISTS "public_read_project_images" ON storage.objects;
CREATE POLICY "public_read_project_images" ON storage.objects FOR SELECT
  USING (bucket_id = 'project_images');

DROP POLICY IF EXISTS "admin_insert_project_images" ON storage.objects;
CREATE POLICY "admin_insert_project_images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project_images' AND is_admin());

DROP POLICY IF EXISTS "admin_update_project_images" ON storage.objects;
CREATE POLICY "admin_update_project_images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'project_images' AND is_admin());

DROP POLICY IF EXISTS "admin_delete_project_images" ON storage.objects;
CREATE POLICY "admin_delete_project_images" ON storage.objects FOR DELETE
  USING (bucket_id = 'project_images' AND is_admin());

-- ============================================================================
-- 9. RPC functions
-- ============================================================================
CREATE OR REPLACE FUNCTION reorder_sections(section_ids UUID[], sort_orders INTEGER[])
RETURNS VOID AS $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1 .. array_length(section_ids, 1) LOOP
    UPDATE section_settings
    SET sort_order = sort_orders[i], updated_at = NOW()
    WHERE id = section_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. Updated_at triggers (automatically update updated_at on any row change)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables that have updated_at
DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'theme_settings', 'typography_settings', 'site_settings', 'seo_settings',
    'hero_content', 'about_content', 'contact_info', 'cv_settings',
    'skills', 'projects', 'experience', 'certifications',
    'messages', 'section_settings', 'section_variants',
    'image_metadata', 'image_variants', 'users'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS update_%I_updated_at ON %I; CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- Done. Verify with:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT proname FROM pg_proc WHERE proname IN ('is_admin', 'reorder_sections', 'update_updated_at_column');
-- ============================================================================
