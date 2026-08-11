-- Add dynamic branding fields to hero_content
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS site_name TEXT;
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS tagline TEXT;
