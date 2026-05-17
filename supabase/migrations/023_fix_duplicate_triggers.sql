-- Fix duplicate trigger on image_metadata
-- 004_images.sql created trg_image_metadata_updated_at using update_updated_at()
-- 014_updated_at_triggers.sql created update_image_metadata_updated_at using update_updated_at_column()
-- These are functionally identical — keep one, drop the other

DROP TRIGGER IF EXISTS update_image_metadata_updated_at ON image_metadata;

-- Consolidate trigger functions: keep update_updated_at() from 001,
-- drop the duplicate update_updated_at_column() from 014
DROP FUNCTION IF EXISTS update_updated_at_column();
