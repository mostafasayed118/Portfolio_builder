-- Add Facebook channel fields (mirrors 049's YouTube fields).
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE contact_info ADD COLUMN IF NOT EXISTS facebook TEXT;

-- Correct the outdated GitHub/LinkedIn handles on existing rows. Only rows
-- still holding the old placeholder values are touched, so anything an admin
-- has already set by hand is left alone.
UPDATE hero_content
SET github_url = 'https://github.com/mostafasayed118'
WHERE github_url IN ('https://github.com/mustafasayed', 'https://github.com/mustafa-sayed');

UPDATE hero_content
SET linkedin_url = 'https://www.linkedin.com/in/mustafa-sayed11'
WHERE linkedin_url IN (
  'https://linkedin.com/in/mustafasayed',
  'https://linkedin.com/in/mustafa-sayed',
  'https://www.linkedin.com/in/mustafa-sayed'
);

UPDATE contact_info
SET github = 'https://github.com/mostafasayed118'
WHERE github IN ('https://github.com/mustafasayed', 'https://github.com/mustafa-sayed');

UPDATE contact_info
SET linkedin = 'https://www.linkedin.com/in/mustafa-sayed11'
WHERE linkedin IN (
  'https://linkedin.com/in/mustafasayed',
  'https://linkedin.com/in/mustafa-sayed',
  'https://www.linkedin.com/in/mustafa-sayed'
);

-- Keep the corrected URLs as defaults for fresh installs.
ALTER TABLE hero_content ALTER COLUMN github_url SET DEFAULT 'https://github.com/mostafasayed118';
ALTER TABLE hero_content ALTER COLUMN linkedin_url SET DEFAULT 'https://www.linkedin.com/in/mustafa-sayed11';
ALTER TABLE contact_info ALTER COLUMN github SET DEFAULT 'https://github.com/mostafasayed118';
ALTER TABLE contact_info ALTER COLUMN linkedin SET DEFAULT 'https://www.linkedin.com/in/mustafa-sayed11';
