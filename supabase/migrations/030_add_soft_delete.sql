-- Add soft-delete support to collection tables
-- Instead of hard deleting, set deleted_at timestamp
-- Update RLS policies to exclude deleted rows from public view

-- Add deleted_at columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE experience ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for soft-deleted rows
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skills_deleted ON skills(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_experience_deleted ON experience(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_certifications_deleted ON certifications(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update RLS policies to exclude soft-deleted rows from public SELECT
DROP POLICY IF EXISTS "public_read_projects" ON projects;
CREATE POLICY "public_read_projects" ON projects FOR SELECT USING (is_published = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "public_read_skills" ON skills;
CREATE POLICY "public_read_skills" ON skills FOR SELECT USING (is_visible = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "public_read_experience" ON experience;
CREATE POLICY "public_read_experience" ON experience FOR SELECT USING (is_published = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "public_read_certifications" ON certifications;
CREATE POLICY "public_read_certifications" ON certifications FOR SELECT USING (is_published = true AND deleted_at IS NULL);
