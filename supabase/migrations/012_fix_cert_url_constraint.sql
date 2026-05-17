-- ============================================================================
-- 012_fix_cert_url_constraint.sql — Relax chk_cert_url to allow empty strings
-- The previous constraint CHECK (credential_url ~* '^https?://') rejected
-- placeholder values like '#' that were truthy enough to pass JS || null guards
-- but didn't match the regex. Now empty strings are also accepted (the app
-- layer converts '' and '#' to NULL before hitting the DB via sanitizeUrl).
-- ============================================================================

-- 1. Drop the old constraint FIRST so that subsequent UPDATEs don't
--    re-evaluate it against grandfathered-in rows.
ALTER TABLE certifications
  DROP CONSTRAINT IF EXISTS chk_cert_url;

-- 2. Now clean up existing bad data safely (no constraint blocking UPDATEs).
--    Fix empty titles (chk_cert_title)
UPDATE certifications
SET title = LPAD(title, 1, '_')
WHERE char_length(trim(title)) < 1;

--    Fix invalid credential_url values (will become the new chk_cert_url)
UPDATE certifications
SET credential_url = NULL
WHERE credential_url IS NOT NULL
  AND credential_url != ''
  AND credential_url !~* '^https?://.+';

-- 3. Add the relaxed constraint (safe now — all existing rows comply)
ALTER TABLE certifications
  ADD CONSTRAINT chk_cert_url CHECK (
    credential_url IS NULL
    OR credential_url = ''
    OR credential_url ~* '^https?://.+'
  );
