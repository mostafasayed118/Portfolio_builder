-- ============================================================================
-- 055_guard_placeholder_projects_certifications.sql
--
-- Migration-time backstop for the remaining public-facing URL columns:
-- projects.github_url / projects.live_url and certifications.credential_url.
-- Extends the same guard pattern as 052 (hero/contact social handles) and
-- 053 (hero/contact email): fail loudly (and roll back) if any non-deleted
-- row still holds a placeholder URL, so a `db push` can never silently ship
-- broken project or certification links.
--
-- This ships as a NEW migration (rather than editing 052/053) because those
-- are already applied on the live database; the new version number is what
-- makes the extension take effect there too.
--
-- Pattern sets mirror the read-time backstop in lib/db/src/contactFields.ts;
-- keep them in sync when extending either side.
-- ============================================================================

DO $$
DECLARE
  v_projects INTEGER;
  v_certs    INTEGER;
BEGIN
  -- Generic starter-template markers (yourusername variants, example.com,
  -- the literal word "placeholder"), plus the legacy github handles that
  -- migration 050 rewrote on hero/contact (checked as exact path segments).
  SELECT COUNT(*) INTO v_projects
    FROM public.projects
   WHERE deleted_at IS NULL
     AND (
       github_url ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)'
       OR github_url ~* 'github\.com/(mustafasayed|mustafa-sayed)(/|$)'
       OR live_url ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)'
     );

  SELECT COUNT(*) INTO v_certs
    FROM public.certifications
   WHERE deleted_at IS NULL
     AND credential_url ~* '(your[-_]?username|your[-_]?name|your[-_]?handle|your[-_]?channel|your[-_]?profile|example\.(com|org)|placeholder)';

  IF v_projects > 0 OR v_certs > 0 THEN
    RAISE EXCEPTION
      'Placeholder URLs found: % project row(s) and % certification row(s). '
      'Fix them before applying this migration (see lib/db/src/contactFields.ts for the pattern set).',
      v_projects, v_certs;
  END IF;
END $$;
