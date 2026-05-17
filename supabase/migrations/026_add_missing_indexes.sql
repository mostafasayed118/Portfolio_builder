-- Add missing indexes on foreign key columns for query performance

CREATE INDEX IF NOT EXISTS idx_analytics_events_section_key
  ON analytics_events(section_key);

CREATE INDEX IF NOT EXISTS idx_image_metadata_entity_id
  ON image_metadata(entity_id);
