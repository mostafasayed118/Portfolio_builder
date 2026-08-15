-- ============================================================================
-- 047_singleton_table_guard.sql
--
-- Enforce single-row (singleton) semantics on the settings tables at the
-- database level.
--
-- These tables are read by the portfolio and admin as "the one settings row"
-- (.limit(1) with no ordering), so a second row is never meaningful — yet
-- seeds and manual inserts have historically created duplicate rows. The
-- unique index on the constant expression (true) gives every row the same
-- index key, so at most one row can ever exist.
--
-- This is race-safe (atomic, no TOCTOU window) and blocks every insert path
-- — the API, the SQL editor, and direct DB access — not just the application
-- code. A second insert raises a unique_violation (23505).
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS theme_settings_singleton_idx
  ON theme_settings ((true));

CREATE UNIQUE INDEX IF NOT EXISTS typography_settings_singleton_idx
  ON typography_settings ((true));

CREATE UNIQUE INDEX IF NOT EXISTS seo_settings_singleton_idx
  ON seo_settings ((true));

CREATE UNIQUE INDEX IF NOT EXISTS contact_info_singleton_idx
  ON contact_info ((true));

CREATE UNIQUE INDEX IF NOT EXISTS hero_content_singleton_idx
  ON hero_content ((true));

CREATE UNIQUE INDEX IF NOT EXISTS about_content_singleton_idx
  ON about_content ((true));

CREATE UNIQUE INDEX IF NOT EXISTS site_settings_singleton_idx
  ON site_settings ((true));

CREATE UNIQUE INDEX IF NOT EXISTS cv_settings_singleton_idx
  ON cv_settings ((true));
