-- ============================================================================
-- 048_theme_presets.sql
--
-- Custom theme templates shared across devices.
--
-- Previously the admin saved user-created palettes ("custom templates") to
-- localStorage, so a palette saved on one machine was invisible on another.
-- This table makes the admin's personal templates a server-side collection:
-- the admin API (service-role key, admin auth) is the only writer, and the
-- portfolio never reads this table (templates are admin workflow state, not
-- site content — the palette they hold only reaches the site once applied
-- to theme_settings).
--
-- The 10-template cap that used to live in the client is enforced here too,
-- so no insert path (API, SQL editor, direct DB) can exceed it.
-- ============================================================================

-- 1. theme_presets table
CREATE TABLE IF NOT EXISTS public.theme_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  palette JSONB NOT NULL,
  sort_order INTEGER,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_theme_presets_user ON theme_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_theme_presets_user_deleted ON theme_presets(user_id) WHERE deleted_at IS NULL;

-- Name must be unique per user among live (non-deleted) templates. The API
-- pre-checks this (case-insensitively) and returns 409 with the existing id so
-- the client can offer an overwrite; this partial functional index is the
-- race-safe backstop so a second concurrent insert with the same name (any
-- casing) can never stack. lower() keeps the DB rule identical to the API's.
CREATE UNIQUE INDEX IF NOT EXISTS theme_presets_user_name_unique
  ON theme_presets(user_id, lower(name))
  WHERE deleted_at IS NULL;

-- 3. Auto-update updated_at on row changes
DROP TRIGGER IF EXISTS update_theme_presets_updated_at ON public.theme_presets;
CREATE TRIGGER update_theme_presets_updated_at
  BEFORE UPDATE ON public.theme_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable RLS
ALTER TABLE public.theme_presets ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies
-- Templates are private admin workflow state — no public read. The API server
-- writes with the service-role key (RLS bypass); this policy additionally lets
-- authenticated admins manage their own templates directly from Supabase.
DROP POLICY IF EXISTS "admin_all_theme_presets" ON public.theme_presets;
CREATE POLICY "admin_all_theme_presets"
  ON public.theme_presets
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 6. Cap: at most MAX_ACTIVE_THEME_PRESETS (10) non-deleted templates per user.
--    Raises a meaningful error instead of silently dropping the newest one,
--    so the client can tell the admin a template was rejected.
DO $$
DECLARE
  cap_fn TEXT := 'theme_presets_enforce_cap';
BEGIN
  EXECUTE format($fn$
    CREATE OR REPLACE FUNCTION public.%I()
    RETURNS TRIGGER AS $body$
    DECLARE
      active_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO active_count
        FROM public.theme_presets
       WHERE user_id = NEW.user_id
         AND deleted_at IS NULL;
      IF active_count >= 10 THEN
        RAISE EXCEPTION 'Template limit reached: at most 10 custom templates per user'
          USING ERRCODE = 'check_violation';
      END IF;
      RETURN NEW;
    END;
    $body$ LANGUAGE plpgsql
  $fn$, cap_fn);

  EXECUTE format($fn$
    DROP TRIGGER IF EXISTS %I ON public.theme_presets;
  $fn$, 'theme_presets_enforce_cap_trigger');

  EXECUTE format($fn$
    CREATE TRIGGER %I
      BEFORE INSERT ON public.theme_presets
      FOR EACH ROW EXECUTE FUNCTION public.%I();
  $fn$, 'theme_presets_enforce_cap_trigger', cap_fn);
END $$;
