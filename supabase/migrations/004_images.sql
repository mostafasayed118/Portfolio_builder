-- ============================================================================
-- 004_images.sql — Image Pipeline Infrastructure
-- Storage buckets, metadata tables, RLS policies
-- ============================================================================

-- 1. Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('project_images', 'project_images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('image_variants', 'image_variants', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: public read for public buckets
DROP POLICY IF EXISTS "public_read_project_images" ON storage.objects;
CREATE POLICY "public_read_project_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project_images');

DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "admin_all_images" ON storage.objects;
CREATE POLICY "admin_all_images"
  ON storage.objects FOR ALL
  USING (bucket_id IN ('project_images', 'image_variants', 'avatars'));

-- 2. Image metadata table
CREATE TABLE IF NOT EXISTS image_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size_bytes BIGINT NOT NULL,
  blur_hash TEXT,
  dominant_color TEXT,
  alt_text TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Image variants table
CREATE TABLE IF NOT EXISTS image_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_image_id UUID REFERENCES image_metadata(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_image_metadata_entity ON image_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_image_variants_parent ON image_variants(parent_image_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_storage ON image_metadata(storage_path);

-- 5. updated_at trigger
DROP TRIGGER IF EXISTS trg_image_metadata_updated_at ON image_metadata;
CREATE TRIGGER trg_image_metadata_updated_at
  BEFORE UPDATE ON image_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at();
