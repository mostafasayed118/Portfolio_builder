-- Add index on image_variants.parent_image_id for faster joins
CREATE INDEX IF NOT EXISTS idx_image_variants_parent_image_id
  ON image_variants(parent_image_id);

COMMENT ON INDEX idx_image_variants_parent_image_id
  IS 'Speeds up queries joining image_variants to parent image_metadata';
