-- Fix FK constraints: ON DELETE CASCADE for image_metadata
-- and add FK for analytics_events.project_id (already UUID)

-- ============================================
-- 1. image_metadata: CASCADE delete
-- ============================================
ALTER TABLE image_metadata DROP CONSTRAINT IF EXISTS fk_image_metadata_entity;
ALTER TABLE image_metadata ADD CONSTRAINT fk_image_metadata_entity
  FOREIGN KEY (entity_id) REFERENCES projects(id) ON DELETE CASCADE
  NOT VALID;

-- ============================================
-- 2. analytics_events: Convert project_id to UUID, then add FK
-- ============================================
--
-- On a fresh replay analytics_events.project_id is TEXT (migration 001)
-- while projects.id is UUID, so a direct `project_id NOT IN (SELECT id ...)`
-- fails with "operator does not exist: text = uuid". This section casts
-- the comparison, promotes the column to UUID, and then adds the FK.

-- Clean up any orphaned rows first (where project_id doesn't exist in projects).
-- Compare as text because project_id is TEXT at this point in a fresh replay.
DELETE FROM analytics_events
WHERE project_id IS NOT NULL
  AND project_id NOT IN (SELECT id::text FROM projects);

-- Promote project_id TEXT -> UUID so the FK below can be added. Every
-- surviving value is a valid project id (the DELETE above removed anything
-- else), so the cast is safe.
ALTER TABLE analytics_events
  ALTER COLUMN project_id TYPE UUID USING (project_id::uuid);

-- Drop old constraint if exists
ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS fk_analytics_project;

-- Add FK constraint with ON DELETE SET NULL
ALTER TABLE analytics_events ADD CONSTRAINT fk_analytics_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
  NOT VALID;

-- Validate the constraint (checks existing rows)
ALTER TABLE analytics_events VALIDATE CONSTRAINT fk_analytics_project;

-- ============================================
-- 3. Index for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_analytics_events_project_id
  ON analytics_events(project_id);

-- ============================================
-- Verification
-- ============================================
-- Check the constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('image_metadata', 'analytics_events')
  AND tc.constraint_type = 'FOREIGN KEY';