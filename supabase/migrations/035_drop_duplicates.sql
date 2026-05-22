-- 035_drop_duplicates.sql
-- Drop duplicate constraints and indexes

-- ============================================================================
-- Drop duplicate UNIQUE constraint on projects.slug
-- Keep: uq_projects_slug (from migration 029)
-- Drop: projects_slug_key (from migration 025)
-- ============================================================================
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_slug_key;

-- ============================================================================
-- Drop duplicate CHECK constraint on messages.status
-- Keep: chk_messages_status (from migration 003)
-- Drop: messages_status_check (from migration 031)
-- ============================================================================
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;

-- ============================================================================
-- Drop duplicate sort_order indexes
-- Keep: idx_*_sort_order (from migration 015)
-- Drop: idx_*_sort (from migration 001)
-- ============================================================================
DROP INDEX IF EXISTS idx_projects_sort;
DROP INDEX IF EXISTS idx_experience_sort;
DROP INDEX IF EXISTS idx_certifications_sort;

-- Note: idx_skills_sort was not found as a duplicate (only idx_skills_sort_order exists)
