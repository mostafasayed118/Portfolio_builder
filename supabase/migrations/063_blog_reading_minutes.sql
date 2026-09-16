-- ============================================================================
-- 063_blog_reading_minutes.sql
--
-- Adds a STORED generated column `reading_minutes` to blog_posts so list
-- queries can drop the full `content` payload (up to KBs per row) and still
-- render a reading-time estimate on cards.
--
-- The expression mirrors the client-side getReadingTime formula it replaces
-- (max(1, ceil(words / 200))): every function in it (btrim, coalesce,
-- regexp_split_to_array, array_length, ceil, casts) is IMMUTABLE, so
-- Postgres accepts it as a generated-column expression — no trigger needed.
-- Empty/NULL content yields array_length([], 1) = NULL; GREATEST ignores
-- NULLs, so the column still resolves to 1.
--
-- Idempotent: IF NOT EXISTS; safe to re-run.
-- ============================================================================

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS reading_minutes smallint
  GENERATED ALWAYS AS (
    GREATEST(
      1,
      CEIL(
        array_length(
          regexp_split_to_array(btrim(coalesce(content, '')), '\s+'),
          1
        )::numeric / 200.0
      )
    )::smallint
  ) STORED;
