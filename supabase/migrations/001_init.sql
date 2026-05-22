-- ============================================================================
-- 001_init.sql — Full Supabase Schema Migration
-- Translated from Convex schema definitions
-- ============================================================================

-- 2a. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM types
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE theme_mode AS ENUM ('light', 'dark');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE msg_status AS ENUM ('unread', 'read', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE exp_type AS ENUM ('internship', 'certification', 'volunteer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2b. Tables (in dependency order)
-- ============================================================================

-- 1. theme_settings (singleton)
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

-- 2. typography_settings (singleton)
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

-- 3. site_settings (singleton)
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'Mustafa Sayed',
  site_tagline TEXT NOT NULL DEFAULT 'Data Engineer',
  footer_text TEXT NOT NULL DEFAULT 'Built with passion and a lot of coffee.',
  copyright_text TEXT NOT NULL DEFAULT '© Mustafa Sayed. All rights reserved.',
  logo_text TEXT NOT NULL DEFAULT 'MS',
  default_theme theme_mode NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. seo_settings (singleton)
CREATE TABLE IF NOT EXISTS seo_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Mustafa Sayed — Data Engineer',
  description TEXT NOT NULL DEFAULT 'Data Engineer specializing in ETL pipelines, data warehouses, and BI dashboards. Based in Cairo, Egypt.',
  keywords TEXT NOT NULL DEFAULT 'data engineer, ETL, Apache Spark, Kafka, Snowflake, BigQuery, Python, SQL',
  og_title TEXT NOT NULL DEFAULT 'Mustafa Sayed — Data Engineer',
  og_description TEXT NOT NULL DEFAULT 'Building scalable data pipelines and transforming raw data into actionable insights.',
  og_image TEXT,
  canonical_url TEXT NOT NULL DEFAULT 'https://mustafasayed.replit.app',
  twitter_card TEXT NOT NULL DEFAULT 'summary_large_image',
  twitter_creator TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. hero_content (singleton)
CREATE TABLE IF NOT EXISTS hero_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  heading TEXT NOT NULL DEFAULT 'Hi, I''m',
  name TEXT NOT NULL DEFAULT 'Mustafa Sayed',
  roles TEXT[] NOT NULL DEFAULT '{"Data Engineer","ETL Developer","Pipeline Architect","BI Developer"}',
  description TEXT NOT NULL DEFAULT 'Passionate about building scalable data pipelines, transforming raw data into actionable insights, and architecting robust ETL solutions.',
  github_url TEXT NOT NULL DEFAULT 'https://github.com/mustafasayed',
  linkedin_url TEXT NOT NULL DEFAULT 'https://linkedin.com/in/mustafasayed',
  email TEXT NOT NULL DEFAULT 'admin@example.com',
  available BOOLEAN NOT NULL DEFAULT true,
  cv_file_name TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. about_content (singleton)
CREATE TABLE IF NOT EXISTS about_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bio1 TEXT NOT NULL DEFAULT 'Data Engineer with 1+ years of hands-on experience building production ETL pipelines, data warehouses, and BI dashboards.',
  bio2 TEXT NOT NULL DEFAULT 'Skilled in transforming complex data into actionable insights using modern data stack tools.',
  location TEXT NOT NULL DEFAULT 'Cairo, Egypt',
  years_of_experience INTEGER NOT NULL DEFAULT 1,
  degree TEXT NOT NULL DEFAULT 'B.Sc. Statistics & Computer Science',
  school TEXT NOT NULL DEFAULT 'Ain Shams University',
  grade TEXT NOT NULL DEFAULT 'Very Good',
  education_years TEXT NOT NULL DEFAULT '2020 – 2024',
  languages JSONB NOT NULL DEFAULT '[{"lang":"Arabic","level":"Native","pct":100},{"lang":"English","level":"Professional","pct":85},{"lang":"French","level":"Basic","pct":30}]',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. contact_info (singleton)
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

-- 8. cv_settings (singleton)
CREATE TABLE IF NOT EXISTS cv_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  object_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. skills (collection)
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  proficiency INTEGER NOT NULL,
  icon TEXT,
  sort_order INTEGER,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. projects (collection)
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tech_stack TEXT[] DEFAULT '{}',
  category TEXT,
  featured BOOLEAN DEFAULT false,
  github_url TEXT,
  live_url TEXT,
  slug TEXT,
  metrics TEXT[] DEFAULT '{}',
  sort_order INTEGER,
  is_published BOOLEAN DEFAULT false,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. experience (collection)
CREATE TABLE IF NOT EXISTS experience (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  period TEXT NOT NULL,
  description TEXT[] DEFAULT '{}',
  technologies TEXT[] DEFAULT '{}',
  type exp_type NOT NULL,
  sort_order INTEGER,
  is_published BOOLEAN DEFAULT false,
  current BOOLEAN DEFAULT false,
  order_num INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. certifications (collection)
CREATE TABLE IF NOT EXISTS certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issuer_logo TEXT,
  date TEXT NOT NULL,
  date_sort TEXT,
  category TEXT,
  credential_url TEXT,
  credential_id TEXT,
  sort_order INTEGER,
  is_published BOOLEAN DEFAULT false,
  skills TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. messages (collection)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status msg_status NOT NULL DEFAULT 'unread',
  reply_email_draft TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. section_settings (collection)
CREATE TABLE IF NOT EXISTS section_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. content_snapshots (collection)
CREATE TABLE IF NOT EXISTS content_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}',
  changed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. section_variants (collection)
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

-- 17. analytics_events (collection)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  path TEXT,
  section_key TEXT,
  project_id TEXT,
  preset_id TEXT,
  referrer TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. content_health_reports (collection)
CREATE TABLE IF NOT EXISTS content_health_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL,
  issues JSONB NOT NULL DEFAULT '[]',
  critical_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  suggestion_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2c. Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_section_settings_key ON section_settings(key);
CREATE INDEX IF NOT EXISTS idx_section_settings_sort ON section_settings(sort_order);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_snapshots_entity ON content_snapshots(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_content_snapshots_version ON content_snapshots(entity_type, entity_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_section_variants_section ON section_variants(section_key);
CREATE INDEX IF NOT EXISTS idx_section_variants_active ON section_variants(section_key, is_active);
CREATE INDEX IF NOT EXISTS idx_content_health_scope ON content_health_reports(scope);
CREATE INDEX IF NOT EXISTS idx_content_health_generated ON content_health_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_experience_sort ON experience(sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_sort ON projects(sort_order);
CREATE INDEX IF NOT EXISTS idx_certifications_sort ON certifications(sort_order);

-- ============================================================================
-- 2d. updated_at auto-update trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to every table that has updated_at column
DROP TRIGGER IF EXISTS trg_theme_settings_updated_at ON theme_settings;
CREATE TRIGGER trg_theme_settings_updated_at
  BEFORE UPDATE ON theme_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_typography_settings_updated_at ON typography_settings;
CREATE TRIGGER trg_typography_settings_updated_at
  BEFORE UPDATE ON typography_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_seo_settings_updated_at ON seo_settings;
CREATE TRIGGER trg_seo_settings_updated_at
  BEFORE UPDATE ON seo_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_hero_content_updated_at ON hero_content;
CREATE TRIGGER trg_hero_content_updated_at
  BEFORE UPDATE ON hero_content FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_about_content_updated_at ON about_content;
CREATE TRIGGER trg_about_content_updated_at
  BEFORE UPDATE ON about_content FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_contact_info_updated_at ON contact_info;
CREATE TRIGGER trg_contact_info_updated_at
  BEFORE UPDATE ON contact_info FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_cv_settings_updated_at ON cv_settings;
CREATE TRIGGER trg_cv_settings_updated_at
  BEFORE UPDATE ON cv_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_skills_updated_at ON skills;
CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_experience_updated_at ON experience;
CREATE TRIGGER trg_experience_updated_at
  BEFORE UPDATE ON experience FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_certifications_updated_at ON certifications;
CREATE TRIGGER trg_certifications_updated_at
  BEFORE UPDATE ON certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_section_settings_updated_at ON section_settings;
CREATE TRIGGER trg_section_settings_updated_at
  BEFORE UPDATE ON section_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_section_variants_updated_at ON section_variants;
CREATE TRIGGER trg_section_variants_updated_at
  BEFORE UPDATE ON section_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2e. RLS Policies
-- ============================================================================

-- Helper: function to check if the requesting user is an admin
-- Uses request.jwt.claims.email against app.admin_emails setting
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    current_setting('request.jwt.claims', true)::jsonb ->> 'email'
    = ANY(string_to_array(current_setting('app.admin_emails', true), ','))
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Public read tables (anyone can SELECT, only admins can modify)

-- hero_content
ALTER TABLE hero_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_hero" ON hero_content; CREATE POLICY "public_read_hero" ON hero_content FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_hero" ON hero_content; CREATE POLICY "admin_all_hero" ON hero_content FOR ALL USING (is_admin());

-- about_content
ALTER TABLE about_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_about" ON about_content; CREATE POLICY "public_read_about" ON about_content FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_about" ON about_content; CREATE POLICY "admin_all_about" ON about_content FOR ALL USING (is_admin());

-- skills
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_skills" ON skills; CREATE POLICY "public_read_skills" ON skills FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_skills" ON skills; CREATE POLICY "admin_all_skills" ON skills FOR ALL USING (is_admin());

-- projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_projects" ON projects; CREATE POLICY "public_read_projects" ON projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_projects" ON projects; CREATE POLICY "admin_all_projects" ON projects FOR ALL USING (is_admin());

-- experience
ALTER TABLE experience ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_experience" ON experience; CREATE POLICY "public_read_experience" ON experience FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_experience" ON experience; CREATE POLICY "admin_all_experience" ON experience FOR ALL USING (is_admin());

-- certifications
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_certifications" ON certifications; CREATE POLICY "public_read_certifications" ON certifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_certifications" ON certifications; CREATE POLICY "admin_all_certifications" ON certifications FOR ALL USING (is_admin());

-- contact_info
ALTER TABLE contact_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_contact" ON contact_info; CREATE POLICY "public_read_contact" ON contact_info FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_contact" ON contact_info; CREATE POLICY "admin_all_contact" ON contact_info FOR ALL USING (is_admin());

-- theme_settings
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_theme" ON theme_settings; CREATE POLICY "public_read_theme" ON theme_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_theme" ON theme_settings; CREATE POLICY "admin_all_theme" ON theme_settings FOR ALL USING (is_admin());

-- typography_settings
ALTER TABLE typography_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_typography" ON typography_settings; CREATE POLICY "public_read_typography" ON typography_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_typography" ON typography_settings; CREATE POLICY "admin_all_typography" ON typography_settings FOR ALL USING (is_admin());

-- site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_site" ON site_settings; CREATE POLICY "public_read_site" ON site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_site" ON site_settings; CREATE POLICY "admin_all_site" ON site_settings FOR ALL USING (is_admin());

-- seo_settings
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_seo" ON seo_settings; CREATE POLICY "public_read_seo" ON seo_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_seo" ON seo_settings; CREATE POLICY "admin_all_seo" ON seo_settings FOR ALL USING (is_admin());

-- section_settings
ALTER TABLE section_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_sections" ON section_settings; CREATE POLICY "public_read_sections" ON section_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_sections" ON section_settings; CREATE POLICY "admin_all_sections" ON section_settings FOR ALL USING (is_admin());

-- section_variants
ALTER TABLE section_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_variants" ON section_variants; CREATE POLICY "public_read_variants" ON section_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_all_variants" ON section_variants; CREATE POLICY "admin_all_variants" ON section_variants FOR ALL USING (is_admin());

-- Admin-only tables (no public read)

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_select_messages" ON messages; CREATE POLICY "admin_select_messages" ON messages FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_messages" ON messages; CREATE POLICY "admin_insert_messages" ON messages FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_messages" ON messages; CREATE POLICY "admin_update_messages" ON messages FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_messages" ON messages; CREATE POLICY "admin_delete_messages" ON messages FOR DELETE USING (is_admin());
DROP POLICY IF EXISTS "public_insert_messages" ON messages; CREATE POLICY "public_insert_messages" ON messages FOR INSERT WITH CHECK (true);

-- cv_settings
ALTER TABLE cv_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_select_cv" ON cv_settings; CREATE POLICY "admin_select_cv" ON cv_settings FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_cv" ON cv_settings; CREATE POLICY "admin_insert_cv" ON cv_settings FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_cv" ON cv_settings; CREATE POLICY "admin_update_cv" ON cv_settings FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_cv" ON cv_settings; CREATE POLICY "admin_delete_cv" ON cv_settings FOR DELETE USING (is_admin());

-- content_snapshots
ALTER TABLE content_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_select_snapshots" ON content_snapshots; CREATE POLICY "admin_select_snapshots" ON content_snapshots FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_snapshots" ON content_snapshots; CREATE POLICY "admin_insert_snapshots" ON content_snapshots FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_snapshots" ON content_snapshots; CREATE POLICY "admin_update_snapshots" ON content_snapshots FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_snapshots" ON content_snapshots; CREATE POLICY "admin_delete_snapshots" ON content_snapshots FOR DELETE USING (is_admin());

-- analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_select_analytics" ON analytics_events; CREATE POLICY "admin_select_analytics" ON analytics_events FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_analytics" ON analytics_events; CREATE POLICY "admin_insert_analytics" ON analytics_events FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_analytics" ON analytics_events; CREATE POLICY "admin_update_analytics" ON analytics_events FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_analytics" ON analytics_events; CREATE POLICY "admin_delete_analytics" ON analytics_events FOR DELETE USING (is_admin());
DROP POLICY IF EXISTS "public_insert_analytics" ON analytics_events; CREATE POLICY "public_insert_analytics" ON analytics_events FOR INSERT WITH CHECK (true);

-- content_health_reports
ALTER TABLE content_health_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_select_health" ON content_health_reports; CREATE POLICY "admin_select_health" ON content_health_reports FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_insert_health" ON content_health_reports; CREATE POLICY "admin_insert_health" ON content_health_reports FOR INSERT WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin_update_health" ON content_health_reports; CREATE POLICY "admin_update_health" ON content_health_reports FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_health" ON content_health_reports; CREATE POLICY "admin_delete_health" ON content_health_reports FOR DELETE USING (is_admin());

-- ============================================================================
-- 2f. Seed defaults
-- ============================================================================

-- Theme settings
INSERT INTO theme_settings (mode, light_primary, light_accent, light_background, light_foreground, light_card, light_border, light_muted, light_muted_foreground, light_ring, dark_primary, dark_accent, dark_background, dark_foreground, dark_card, dark_border, dark_muted, dark_muted_foreground, dark_ring, radius) VALUES
('light', '204 92% 42%', '189 90% 38%', '220 30% 97%', '222 40% 10%', '0 0% 100%', '220 18% 84%', '220 20% 91%', '220 15% 42%', '204 92% 45%', '204 92% 62%', '189 95% 53%', '222 48% 6%', '210 30% 96%', '222 40% 9%', '220 22% 18%', '222 32% 12%', '215 18% 72%', '204 92% 62%', '0.9rem')
ON CONFLICT DO NOTHING;

-- Typography settings
INSERT INTO typography_settings (body_font, display_font, base_font_size, line_height, letter_spacing, heading_scale, font_weight_body, font_weight_heading) VALUES
('Spline Sans', 'Unbounded', '16px', '1.6', '0em', '1.25', '400', '700')
ON CONFLICT DO NOTHING;

-- Site settings
INSERT INTO site_settings (site_name, site_tagline, footer_text, copyright_text, logo_text, default_theme) VALUES
('Your Name', 'Your Tagline', 'Built with passion and a lot of coffee.', '© 2025 Your Name. All rights reserved.', 'YN', 'dark')
ON CONFLICT DO NOTHING;

-- SEO settings
INSERT INTO seo_settings (title, description, keywords, og_title, og_description, canonical_url, twitter_card, twitter_creator) VALUES
('Your Name — Data Engineer', 'Data Engineer specializing in ETL pipelines, data warehouses, and BI dashboards.', 'data engineer, ETL, Python, SQL', 'Your Name — Data Engineer', 'Building scalable data pipelines and transforming raw data into actionable insights.', 'https://yourdomain.com', 'summary_large_image', '@yourusername')
ON CONFLICT DO NOTHING;

-- Hero content
INSERT INTO hero_content (heading, name, roles, description, github_url, linkedin_url, email, available, cv_file_name, is_published) VALUES
('Hi, I''m', 'Your Name', ARRAY['Data Engineer', 'ETL Developer', 'Pipeline Architect', 'BI Developer'], 'Passionate about building scalable data pipelines, transforming raw data into actionable insights, and architecting robust ETL solutions.', 'https://github.com/yourusername', 'https://linkedin.com/in/yourusername', 'admin@example.com', true, 'Your_Name_Resume.pdf', true)
ON CONFLICT DO NOTHING;

-- About content
INSERT INTO about_content (bio1, bio2, location, years_of_experience, degree, school, grade, education_years, languages, is_published) VALUES
('I''m a Data Engineer with 1+ years of hands-on experience building production ETL pipelines, data warehouses, and BI dashboards that power business decisions.', 'I enjoy the full data lifecycle — from raw ingestion through Apache Kafka and Airflow, to clean warehouse models in Snowflake, to interactive Tableau dashboards that tell the story clearly.', 'Cairo, Egypt', 1, 'B.Sc. Statistics & Computer Science', 'Ain Shams University', 'Very Good', '2020 – 2024', '[{"lang":"Arabic","level":"Native","pct":100},{"lang":"English","level":"Professional","pct":85},{"lang":"French","level":"Basic","pct":30}]', true)
ON CONFLICT DO NOTHING;

-- Contact info
INSERT INTO contact_info (email, phone, location, github, linkedin, availability_status) VALUES
('admin@example.com', '+1 000 000 0000', 'Your City, Country', 'https://github.com/yourusername', 'https://linkedin.com/in/yourusername', 'Open to opportunities')
ON CONFLICT DO NOTHING;

-- Section settings
INSERT INTO section_settings (key, label, is_visible, sort_order) VALUES
('hero', 'Hero', true, 1),
('about', 'About', true, 2),
('skills', 'Skills', true, 3),
('projects', 'Projects', true, 4),
('experience', 'Experience', true, 5),
('certifications', 'Certifications', true, 6),
('contact', 'Contact', true, 7)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2g. Supabase Storage bucket for CV
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv', 'cv', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to upload CV files
DROP POLICY IF EXISTS "admin_upload_cv" ON storage.objects;
CREATE POLICY "admin_upload_cv" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cv' AND auth.role() = 'authenticated');

-- Allow anyone to download CV files
DROP POLICY IF EXISTS "public_download_cv" ON storage.objects;
CREATE POLICY "public_download_cv" ON storage.objects FOR SELECT
USING (bucket_id = 'cv');

-- Allow authenticated admins to update/delete CV files
DROP POLICY IF EXISTS "admin_update_cv" ON storage.objects;
CREATE POLICY "admin_update_cv" ON storage.objects FOR UPDATE
USING (bucket_id = 'cv' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admin_delete_cv" ON storage.objects;
CREATE POLICY "admin_delete_cv" ON storage.objects FOR DELETE
USING (bucket_id = 'cv' AND auth.role() = 'authenticated');



