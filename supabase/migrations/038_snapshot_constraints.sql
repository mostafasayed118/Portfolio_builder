-- 038_snapshot_constraints.sql
-- Add CHECK constraint on content_snapshots.entity_type
-- and document why full FK constraints are not used (polymorphic references)

-- Add CHECK constraint to limit entity_type to known values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_entity_type'
  ) THEN
    ALTER TABLE content_snapshots
      ADD CONSTRAINT chk_entity_type
      CHECK (entity_type IN (
        'project', 'skill', 'experience', 'certification',
        'hero', 'about', 'contact_info', 'theme_settings',
        'typography_settings', 'seo_settings', 'site_settings',
        'section_settings', 'cv_settings'
      ));
  END IF;
END $$;

-- Document the polymorphic design
COMMENT ON TABLE content_snapshots IS
  'Polymorphic content version history.
   entity_type + entity_id reference different tables by design.
   FK constraints not added intentionally — referential integrity
   enforced at application layer. Cascade cleanup handled by app code.';

COMMENT ON COLUMN content_snapshots.entity_type IS
  'Type of entity being versioned. Must match a value in chk_entity_type constraint.';

COMMENT ON COLUMN content_snapshots.entity_id IS
  'UUID of the entity being versioned. References the id column of the table specified by entity_type.';
