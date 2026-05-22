-- Fix critical database issues:
-- 1. Add UNIQUE constraint + index on projects.slug
-- 2. Add RLS policies for image_metadata and image_variants
-- 3. Consolidate duplicate update_updated_at functions
-- 4. Add missing updated_at columns and triggers

-- ============================================================================
-- 1. UNIQUE constraint + index on projects.slug
-- ============================================================================

-- First, ensure no duplicate slugs exist (keep the newest one)
DELETE FROM projects a USING projects b
WHERE a.id < b.id
  AND a.slug = b.slug
  AND a.slug IS NOT NULL;

-- Add UNIQUE constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS uq_projects_slug;
ALTER TABLE projects ADD CONSTRAINT uq_projects_slug UNIQUE (slug);

-- Add index for slug lookups
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

-- ============================================================================
-- 2. RLS policies for image_metadata
-- ============================================================================

ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_image_metadata" ON image_metadata;
CREATE POLICY "public_read_image_metadata" ON image_metadata
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_all_image_metadata" ON image_metadata;
CREATE POLICY "admin_all_image_metadata" ON image_metadata
  FOR ALL USING (is_admin());

-- ============================================================================
-- 3. RLS policies for image_variants
-- ============================================================================

ALTER TABLE image_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_image_variants" ON image_variants;
CREATE POLICY "public_read_image_variants" ON image_variants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_all_image_variants" ON image_variants;
CREATE POLICY "admin_all_image_variants" ON image_variants
  FOR ALL USING (is_admin());

-- ============================================================================
-- 4. Consolidate duplicate update_updated_at functions
-- ============================================================================

-- Drop the duplicate function from migration 014
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Keep the original update_updated_at() from migration 001
-- Re-apply triggers to any tables that might be missing them
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name NOT IN (
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
          AND action_timing = 'BEFORE'
          AND event_manipulation = 'UPDATE'
      )
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s;
       CREATE TRIGGER trg_%1$s_updated_at
         BEFORE UPDATE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t.table_name
    );
  END LOOP;
END $$;

-- ============================================================================
-- 5. Add missing updated_at columns
-- ============================================================================

-- messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_messages_updated_at ON messages;
CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- analytics_events table
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_analytics_events_updated_at ON analytics_events;
CREATE TRIGGER trg_analytics_events_updated_at
  BEFORE UPDATE ON analytics_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- content_health_reports table
ALTER TABLE content_health_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_content_health_reports_updated_at ON content_health_reports;
CREATE TRIGGER trg_content_health_reports_updated_at
  BEFORE UPDATE ON content_health_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- image_variants table
ALTER TABLE image_variants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_image_variants_updated_at ON image_variants;
CREATE TRIGGER trg_image_variants_updated_at
  BEFORE UPDATE ON image_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 6. Add missing indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_is_published ON projects(is_published);
CREATE INDEX IF NOT EXISTS idx_skills_is_visible ON skills(is_visible);
CREATE INDEX IF NOT EXISTS idx_experience_is_published ON experience(is_published);
CREATE INDEX IF NOT EXISTS idx_certifications_is_published ON certifications(is_published);
CREATE INDEX IF NOT EXISTS idx_messages_status_created ON messages(status, created_at DESC);
