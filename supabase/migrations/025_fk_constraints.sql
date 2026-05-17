-- Add missing foreign key constraints

-- Add unique constraint on projects.slug for fetchProjectBySlug
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_slug_key;
ALTER TABLE projects ADD CONSTRAINT projects_slug_key UNIQUE (slug);

-- Add FK on analytics_events.section_key (TEXT) -> section_settings.key (TEXT)
-- Both are TEXT type so this is compatible
ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS fk_analytics_section;
ALTER TABLE analytics_events ADD CONSTRAINT fk_analytics_section
  FOREIGN KEY (section_key) REFERENCES section_settings(key) ON DELETE SET NULL
  NOT VALID;

-- Add FK on image_metadata.entity_id (UUID) -> projects.id (UUID)
-- Both are UUID type so this is compatible
ALTER TABLE image_metadata DROP CONSTRAINT IF EXISTS fk_image_metadata_entity;
ALTER TABLE image_metadata ADD CONSTRAINT fk_image_metadata_entity
  FOREIGN KEY (entity_id) REFERENCES projects(id) ON DELETE SET NULL
  NOT VALID;

-- Note: analytics_events.project_id is TEXT and projects.id is UUID.
-- Incompatible types — FK constraint cannot be added without migrating the column type.
-- Skipping this constraint. Consider changing project_id to UUID in a future migration.
