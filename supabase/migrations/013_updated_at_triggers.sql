-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to image_metadata table (if updated_at column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'image_metadata'
    AND column_name = 'updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_image_metadata_updated_at ON image_metadata;
    CREATE TRIGGER update_image_metadata_updated_at
      BEFORE UPDATE ON image_metadata
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Apply to any other tables missing the trigger
-- (check which tables have updated_at but no trigger)
