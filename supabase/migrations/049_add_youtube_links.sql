-- Add YouTube channel fields to the hero and contact singleton tables.
-- hero_content already carries twitter_url; youtube_url follows the same pattern.
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- contact_info already carries github/linkedin; youtube follows the same pattern.
ALTER TABLE contact_info ADD COLUMN IF NOT EXISTS youtube TEXT;
