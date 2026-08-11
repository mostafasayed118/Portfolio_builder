-- ============================================================================
-- 039_fix_is_admin_function.sql
--
-- Fix the Convex-era `is_admin()` RLS function. The current implementation
-- uses `current_setting('request.jwt.claims', true)` which is the
-- Hasura/Convex GUC pattern, not the Supabase+Clerk native pattern.
--
-- The native Supabase helper is `auth.jwt() ->> 'email'`, which reads the
-- `email` claim from the verified JWT that Supabase's PostgREST layer
-- attaches. For this to work, a Supabase Auth Hook must be configured
-- to inject the Clerk user's email into the JWT (e.g. via
-- supabase--auth--hook-template Clerk integration).
--
-- Until that hook is configured, the previous implementation returned
-- ALWAYS FALSE — meaning anon and authenticated users could never satisfy
-- RLS "admin only" policies. The api-server bypasses RLS via SERVICE_ROLE,
-- so the bug was latent. This migration makes the function correct.
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  allowlist TEXT;
  -- Gated via a runtime setting: the legacy GUC fallback can be turned
  -- off in production (default) so a misconfigured connection pooler
  -- can't inject an attacker-controlled email into `request.jwt.claims`
  -- and bypass RLS. Enable only in dev with:
  --   ALTER DATABASE postgres SET app.allow_guc_admin_fallback = 'on';
  allow_guc_fallback TEXT;
BEGIN
  -- Prefer the Supabase-native JWT claim accessor.
  BEGIN
    user_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN
    user_email := NULL;
  END;

  -- Fall back to the legacy Hasura/Convex-style GUC ONLY when explicitly
  -- enabled. The default is 'off' — production should never rely on a
  -- GUC for auth claims.
  IF user_email IS NULL OR user_email = '' THEN
    BEGIN
      allow_guc_fallback := current_setting('app.allow_guc_admin_fallback', true);
    EXCEPTION WHEN OTHERS THEN
      allow_guc_fallback := NULL;
    END;

    IF allow_guc_fallback = 'on' THEN
      BEGIN
        user_email := current_setting('request.jwt.claims', true)::jsonb ->> 'email';
      EXCEPTION WHEN OTHERS THEN
        user_email := NULL;
      END;
    END IF;
  END IF;

  IF user_email IS NULL OR user_email = '' THEN
    RETURN FALSE;
  END IF;

  allowlist := current_setting('app.admin_emails', true);
  IF allowlist IS NULL OR allowlist = '' THEN
    -- No allowlist configured = deny by default. An explicit empty
    -- list should fail closed, not open.
    RETURN FALSE;
  END IF;

  RETURN lower(user_email) = ANY(string_to_array(lower(allowlist), ','));
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_admin()
  IS 'Returns true when the calling user has an email in the app.admin_emails setting. Reads the email from the Supabase-native JWT claim (auth.jwt()) and falls back to the legacy request.jwt.claims GUC only when app.allow_guc_admin_fallback = on (dev only). Used by RLS policies.';
