-- 040_backfill_project_slugs.sql
-- Backfill missing slug values from project titles
-- and enforce NOT NULL on projects.slug

-- ============================================================================
-- Step 1: Temporarily drop the UNIQUE constraint so backfill doesn't fail
-- on intermediate duplicates. It will be re-added after deduplication.
-- ============================================================================
ALTER TABLE projects DROP CONSTRAINT IF EXISTS uq_projects_slug;

-- ============================================================================
-- Step 2: Generate initial slugs from titles for rows with NULL slug
--
-- Logic mirrors deriveProjectSlug() in the frontend:
--   p.slug || p.title.toLowerCase().replace(/\s+/g, "-")
--
-- 1. Trim whitespace from title
-- 2. Strip characters that aren't alphanumeric, whitespace, or hyphens
-- 3. Lowercase
-- 4. Collapse whitespace runs into single hyphens
-- 5. Trim leading/trailing hyphens (from stripped edge chars)
-- 6. Fallback: if slug is empty (e.g. non-ASCII title), use "project-" || id
-- ============================================================================
UPDATE projects
SET slug = CASE
  WHEN TRIM(title) = '' THEN 'untitled-project-' || id
  ELSE
    BTRIM(
      LOWER(REGEXP_REPLACE(
        REGEXP_REPLACE(TRIM(title), '[^a-zA-Z0-9\\s-]', '', 'g'),
        '\\s+', '-', 'g'
      )),
      '-'
    )
  END,
    updated_at = NOW()
WHERE slug IS NULL;

-- Handle empty slug from titles where all chars were stripped (e.g. Arabic-only)
UPDATE projects
SET slug = 'project-' || id,
    updated_at = NOW()
WHERE slug = '';

-- ============================================================================
-- Step 3: Resolve duplicate slugs by appending a numeric suffix
--
-- Uses a window function to number rows sharing the same slug,
-- ordered by created_at (oldest gets the plain slug).
-- Only applies to slugs with 2+ occurrences.
-- ============================================================================
UPDATE projects p
SET slug = p.slug || '-' || dup.rn,
    updated_at = NOW()
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) AS rn
  FROM projects
  WHERE slug IS NOT NULL
) dup
WHERE p.id = dup.id AND dup.rn > 1;

-- ============================================================================
-- Step 4: Re-add the UNIQUE constraint on slug
-- ============================================================================
ALTER TABLE projects ADD CONSTRAINT uq_projects_slug UNIQUE (slug);

-- ============================================================================
-- Step 5: Make slug NOT NULL now that every row has a value
-- ============================================================================
ALTER TABLE projects ALTER COLUMN slug SET NOT NULL;

-- ============================================================================
-- Step 6: Verify the migration
-- ============================================================================
DO $$
DECLARE
  null_count INTEGER;
  dup_count  INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM projects WHERE slug IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % projects still have NULL slug', null_count;
  END IF;

  SELECT COUNT(*) INTO dup_count
  FROM (SELECT slug FROM projects GROUP BY slug HAVING COUNT(*) > 1) dup;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % duplicate slug(s) remain', dup_count;
  END IF;
END $$;
