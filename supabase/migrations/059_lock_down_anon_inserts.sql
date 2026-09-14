-- ============================================================================
-- 059_lock_down_anon_inserts.sql
--
-- Closes the two over-permissive anon INSERT policies so the public anon key
-- (embedded in every SPA bundle) can no longer write privileged columns or
-- bypass the API's anti-abuse layer.
--
-- 1. messages: DROP "public_insert_messages" entirely.
--    The public contact form posts to the Express API (/api/v1/contact),
--    which writes with the service-role key (RLS does not apply). No SPA or
--    e2e flow inserts messages with the anon key (verified: the only direct
--    insert helper, lib/db sendMessage, has zero callers and was removed).
--    The policy let anyone with the anon key insert rows with arbitrary
--    user_id / status / is_spam, bypassing the API's origin check, honeypot,
--    time-trap, Turnstile and IP rate limit. Supersedes the anon-insert
--    rationale documented in 044_contact_spam_guard.sql (the per-email
--    trigger there remains as defense in depth for authenticated inserts).
--
-- 2. analytics_events: REPLACE "public_insert_analytics" WITH CHECK (true)
--    with a narrowed policy: only the four event types the portfolio
--    actually tracks (lib/db/src/analytics.ts) and length caps on the free
--    text columns, so anonymous writers cannot pollute the dashboard with
--    arbitrary event types or oversized payloads.
--
-- 3. is_admin(): require role = 'superadmin' instead of
--    role IN ('user','superadmin'). The old form made ANY row in users an
--    admin — correct today only because every row derives from ADMIN_EMAILS,
--    but a latent privilege-escalation foot-gun: user-sync auto-provisions
--    role='user' rows, so extending sync beyond the allowlist would have
--    granted every registered visitor full admin RLS via the admin_all_*
--    policies. Safe to tighten: the API server authenticates via Clerk and
--    queries with the service-role key (RLS bypassed), the admin SPA talks
--    only to the API, and the portfolio's anon reads use public_read policies
--    that do not consult is_admin().
-- ============================================================================

-- 1. messages: no direct anon inserts — the API path is the only writer.
DROP POLICY IF EXISTS "public_insert_messages" ON messages;

-- 2. analytics_events: whitelist the tracked event types, cap text columns.
DO $$ BEGIN
  DROP POLICY IF EXISTS "public_insert_analytics" ON analytics_events;
  CREATE POLICY "public_insert_analytics" ON analytics_events
    FOR INSERT TO anon, authenticated
    WITH CHECK (
      type IN ('page_view', 'project_view', 'cv_download', 'contact_click')
      AND char_length(COALESCE(path, '')) <= 512
      AND char_length(COALESCE(section_key, '')) <= 128
      AND char_length(COALESCE(preset_id, '')) <= 255
      AND char_length(COALESCE(referrer, '')) <= 1024
      AND char_length(COALESCE(device, '')) <= 64
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 3. is_admin(): explicit superadmin role required.
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

  -- Authoritative check: the email must exist in the users table AND hold an
  -- explicit admin role. 'user' rows are ordinary registered visitors.
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE email = lower(user_email)
      AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION is_admin()
  IS 'Returns true when the calling email exists in the users table with role = ''superadmin''. Reads the email from the Supabase-native auth.jwt() claim, with a dev-only GUC fallback. SECURITY DEFINER so the users-table check bypasses RLS.';
