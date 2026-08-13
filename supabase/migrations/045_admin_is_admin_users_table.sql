-- ============================================================================
-- 045_admin_is_admin_users_table.sql
--
-- Redefine is_admin() so admin authorization is resolved from the
-- `users` table instead of a database-level GUC.
--
-- Why: Supabase managed Postgres refuses `ALTER DATABASE ... SET` for
-- custom parameters, so the app.admin_emails database setting from 042
-- cannot exist on hosted projects. The `users` table is the native,
-- Supabase-correct source of truth: the API server syncs Clerk users
-- whose email is in VITE_ADMIN_EMAILS, and superadmins are flagged via
-- role = 'superadmin'.
--
-- SECURITY DEFINER + pinned search_path so the table check bypasses RLS
-- (avoids "infinite recursion detected in policy for relation users").
-- Deny-by-default: no email resolved -> false.
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  allow_guc_fallback TEXT;
BEGIN
  -- Prefer the Supabase-native JWT claim accessor (works when the Clerk
  -- Auth Hook is configured to embed the user's email in the JWT).
  BEGIN
    user_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN
    user_email := NULL;
  END;

  -- Dev-only GUC fallback (per-session, never ALTER DATABASE):
  --   SET app.allow_guc_admin_fallback = 'on';
  --   SELECT set_config('app.admin_emails', 'admin@example.com', false);
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

  -- Authoritative check: the email must exist in the users table.
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE email = lower(user_email)
      AND role IN ('user', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION is_admin()
  IS 'Returns true when the calling email exists in the users table (synced from Clerk by the API server). Reads the email from the Supabase-native auth.jwt() claim, with a dev-only GUC fallback. SECURITY DEFINER so the users-table check bypasses RLS.';