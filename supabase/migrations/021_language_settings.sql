-- Language control settings for bilingual portfolio
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS language_mode TEXT DEFAULT 'en_only'
    CHECK (language_mode IN ('en_only', 'ar_only', 'both')),
  ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en'
    CHECK (default_language IN ('en', 'ar')),
  ADD COLUMN IF NOT EXISTS show_language_toggle BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rtl_enabled BOOLEAN DEFAULT false;

-- Update existing row with defaults if it exists
UPDATE site_settings
SET
  language_mode = COALESCE(language_mode, 'en_only'),
  default_language = COALESCE(default_language, 'en'),
  show_language_toggle = COALESCE(show_language_toggle, false),
  rtl_enabled = COALESCE(rtl_enabled, false)
WHERE language_mode IS NULL;
