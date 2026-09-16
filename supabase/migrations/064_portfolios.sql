-- ============================================================================
-- 064_portfolios.sql — Multi-tenancy foundations (spec: 2026-09-16-multi-tenancy-design.md)
--
-- Adds the portfolios (tenant) table, the ownership/published helpers used by
-- all later tenant policies, and a security_invoker view exposing only the
-- public-safe portfolio columns for slug resolution.
-- Idempotent: IF EXISTS / OR REPLACE everywhere; safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Local-stack grant parity. `supabase db reset` applies migrations as
-- `postgres`, whose default ACLs in this CLI version omit SELECT/INSERT/
-- UPDATE/DELETE on public tables for anon/authenticated/service_role (hosted
-- Supabase grants full CRUD). Without this, every REST query fails with
-- "permission denied for table ..." locally. Row-level access stays governed
-- by RLS policies; these are grant-level privileges only.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.portfolios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT portfolios_slug_format CHECK (slug ~ '^[a-z0-9-]{3,63}$')
);

CREATE INDEX IF NOT EXISTS idx_portfolios_owner ON public.portfolios(owner_user_id);

DROP TRIGGER IF EXISTS trg_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER trg_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER + pinned search_path so the portfolios lookup
-- bypasses RLS and avoids recursive-policy errors; mirrors is_admin() 045/059)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.owns_portfolio(p_portfolio_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE id = p_portfolio_id
      AND owner_user_id = NULLIF(auth.jwt() ->> 'sub', '')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_published_portfolio(p_portfolio_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE id = p_portfolio_id AND is_published = true
  );
$$;

COMMENT ON FUNCTION public.owns_portfolio(UUID) IS 'True when the JWT sub (Clerk user id) owns the portfolio. SECURITY DEFINER to bypass RLS on portfolios.';
COMMENT ON FUNCTION public.is_published_portfolio(UUID) IS 'True when the portfolio exists and is published. SECURITY DEFINER to bypass RLS on portfolios.';

-- ---------------------------------------------------------------------------
-- Portfolios RLS: owners manage their own rows; anon/authenticated can SELECT
-- published rows (needed for slug resolution by the public site).
-- ---------------------------------------------------------------------------

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_portfolios" ON public.portfolios;
CREATE POLICY "owner_all_portfolios" ON public.portfolios
  FOR ALL TO authenticated
  USING (owner_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (owner_user_id = auth.jwt() ->> 'sub');

DROP POLICY IF EXISTS "public_select_published_portfolios" ON public.portfolios;
CREATE POLICY "public_select_published_portfolios" ON public.portfolios
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- Public-safe projection: no owner_user_id column is exposed.
CREATE OR REPLACE VIEW public.public_portfolios
WITH (security_invoker = true) AS
  SELECT id, slug, title, is_published
  FROM public.portfolios;

GRANT SELECT ON public.public_portfolios TO anon, authenticated;
