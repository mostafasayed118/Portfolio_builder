-- Fix FK constraints: ON DELETE CASCADE for image_metadata, migrate analytics_events.project_id to UUID

-- image_metadata.entity_id -> projects.id: CASCADE delete metadata when project is deleted
ALTER TABLE image_metadata DROP CONSTRAINT IF EXISTS fk_image_metadata_entity;
ALTER TABLE image_metadata ADD CONSTRAINT fk_image_metadata_entity
  FOREIGN KEY (entity_id) REFERENCES projects(id) ON DELETE CASCADE
  NOT VALID;

-- Migrate analytics_events.project_id from TEXT to UUID so FK can be added
-- 1. Add a new UUID column
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS project_uuid UUID;

-- 2. Copy valid UUIDs from project_id (cast with validation)
UPDATE analytics_events
SET project_uuid = project_id::UUID
WHERE project_id IS NOT NULL
  AND project_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Drop old TEXT column and rename new one
ALTER TABLE analytics_events DROP COLUMN IF EXISTS project_id;
ALTER TABLE analytics_events RENAME COLUMN project_uuid TO project_id;

-- 4. Add FK constraint
ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS fk_analytics_project;
ALTER TABLE analytics_events ADD CONSTRAINT fk_analytics_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
  NOT VALID;

-- 5. Index the new column for joins
CREATE INDEX IF NOT EXISTS idx_analytics_events_project_id
  ON analytics_events(project_id);
