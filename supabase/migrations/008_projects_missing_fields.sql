-- ============================================================================
-- 008_projects_missing_fields.sql
-- Adds full_description, challenges, outcome, completed_at to projects table
-- ============================================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS full_description TEXT,
  ADD COLUMN IF NOT EXISTS challenges TEXT,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TEXT;

COMMENT ON COLUMN projects.full_description IS 'Full project description shown on detail page';
COMMENT ON COLUMN projects.challenges IS 'Technical challenges faced during development';
COMMENT ON COLUMN projects.outcome IS 'Results, metrics, or impact of the project';
COMMENT ON COLUMN projects.completed_at IS 'Completion month in YYYY-MM format';
