-- Add new fields to hero_content table
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS cv_url TEXT;
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT NULL;