# Multi-Tenancy Phase 1 (Schema + RLS + Backfill) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the database multi-tenant — a `portfolios` table, `portfolio_id` on every CMS table, Postgres RLS enforcing per-owner isolation, and backfill of existing data into portfolio #1 — without breaking the currently-running single-tenant app.

**Architecture:** Additive migrations (064–067) introduce `portfolios`, tenant columns, per-portfolio uniqueness, owner RLS policies, and storage path prefixes. Existing `is_admin()`-based policies are kept during this phase so the current service-role API keeps working; they are removed in Phase 2. Transition predicates allow `portfolio_id IS NULL` only where a pre-existing public policy already allowed that operation.

**Tech Stack:** Supabase (Postgres 15, RLS, storage), supabase-js, Vitest (lib/db workspace), Supabase CLI local stack.

**Spec:** `docs/superpowers/specs/2026-09-16-multi-tenancy-design.md`

## Global Constraints

- Files ≤ 250 lines (ESLint `max-lines`); components < 100 lines; one export unit per file.
- No `any`, no `as` assertions, no non-null assertions, `unknown` catch variables; warnings fatal (`--max-warnings=0`).
- Feature-based folders with barrel imports only (`@/features/<feature>`, `lib/db` via its index barrel).
- SQL migrations are numbered sequentially, idempotent on replay (`supabase db reset` must succeed from scratch — CI job `db-migrations` proves this on every push).
- RLS is deny-by-default: no policy = no access. Never create `USING (true)` policies on tenanted tables.
- **Transition rule:** rows written by the not-yet-migrated app have `portfolio_id IS NULL`. Public-read and public-insert policies must tolerate NULL `portfolio_id` (legacy rows) — except the _new_ anon INSERT policies on `messages`/`analytics_events`, which require a published portfolio (legacy writers use the service-role key, which bypasses RLS).
- Test harness connects only to the local Supabase stack (`http://127.0.0.1:54321`); never to the hosted project.
- Commit policy: default is one commit per task as shown. **If the controller's "no commits" policy is in effect for this round, skip every `git commit` step and leave changes in the working tree.**

## Current-state facts (verified against migrations 001–063)

- Singleton tables with `((true))` unique indexes (057): `theme_settings`, `typography_settings`, `site_settings`, `seo_settings`, `hero_content`, `about_content`, `contact_info`, `cv_settings`.
- `user_id` (FK → `users`) exists on: `skills`, `projects`, `experience`, `certifications`, `messages`, `blog_posts`, `theme_presets`, `image_metadata`.
- `is_admin()` (059): superadmin-role lookup from `users` by JWT email. Admin policies are named `admin_all_*`; public reads `public_read_*` (042 recreated 001's names).
- `messages` columns of interest: `status msg_status default 'unread'`, `reply_email_draft`, `replied_at`, `spam_score`, `spam_reason`, `is_spam default false` (056), `deleted_at` (025). Anon INSERT was removed by 059.
- `analytics_events` anon INSERT (059): whitelisted event types + column length caps.
- `blog_posts` unique: `blog_posts_user_slug_unique (user_id, slug)` (046).
- `section_settings.key` has a global UNIQUE constraint `section_settings_key` (001); `analytics_events.section_key` FK targets it (`fk_analytics_section`, 020).
- `contact_messages` is legacy (023 migrated its data into `messages`); the table still exists.
- Storage buckets: `cv`, `project_images` (public), `image_variants`, `avatars` (public), `projects`, `certifications`, `documents` (004/009/037). `image_metadata.storage_path` and `image_variants.storage_path` store object paths; `projects.image_url`, `blog_posts.cover_image_url`, `seo_settings.og_image` store public URLs.
- Local dev constants (Supabase CLI defaults): URL `http://127.0.0.1:54321`; JWT secret `super-secret-jwt-token-with-at-least-32-characters-long`.

## File Structure

- Create: `supabase/migrations/064_portfolios.sql` — portfolios table, helpers, view.
- Create: `supabase/migrations/065_tenant_columns_backfill.sql` — portfolio_id columns, backfill, per-portfolio uniques, FK swap, drop contact_messages.
- Create: `supabase/migrations/066_tenant_rls.sql` — owner + public policies on tenanted tables.
- Create: `supabase/migrations/067_storage_tenancy.sql` — storage path prefixes, storage RLS.
- Create: `lib/db/src/rls-multitenant.test.ts` — cross-tenant RLS test suite (runs against local Supabase).
- Create: `lib/db/src/rls-test-helpers.ts` — JWT signing + role-client helpers used by the suite.
- Modify: `.github/workflows/ci.yml` — run the RLS suite in the `db-migrations` job.
- Modify: `supabase/migrations/README.md` — document the new migration group.

---

### Task 1: Portfolios table, RLS helpers, public view + test harness

**Files:**

- Create: `supabase/migrations/064_portfolios.sql`
- Create: `lib/db/src/rls-test-helpers.ts`
- Create: `lib/db/src/rls-multitenant.test.ts`

**Interfaces:**

- Produces (SQL, consumed by Tasks 2–4): `public.portfolios(id uuid, owner_user_id text, slug text unique, title text, is_published bool, created_at, updated_at)`; `public.owns_portfolio(p_portfolio_id uuid) returns boolean`; `public.is_published_portfolio(p_portfolio_id uuid) returns boolean`; view `public.public_portfolios(id, slug, title, is_published)`.
- Produces (TS, consumed by Tasks 2–4):
  - `signToken(claims: { sub: string; email?: string }): string`
  - `clientFor(identity: { sub: string; email?: string }): SupabaseClient`
  - `anonClient(): SupabaseClient`
  - `serviceClient(): SupabaseClient`
  - `ensureSchema(): Promise<{ portfolioA: string; portfolioB: string; portfolioC: string }>` — seeds users + portfolios with the service client, returns portfolio ids.

- [ ] **Step 1: Write the RLS test harness and failing tests**

`lib/db/src/rls-test-helpers.ts`:

```ts
import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODMyNDgwMH0.1mPO_h4KbrH2qH5nVx1osbNCXkFhJOht4XxRYFSqlXs";
const LOCAL_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzI0ODAwfQ.MYd8KrC8dOJvorrPdcjKO7YKxdptHLIfM3kc0i9LeYk";
const LOCAL_JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? LOCAL_URL;
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY ?? LOCAL_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_KEY ?? LOCAL_SERVICE_KEY;
const JWT_SECRET = process.env.SUPABASE_TEST_JWT_SECRET ?? LOCAL_JWT_SECRET;

function b64url(input: string | Uint8Array): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function signToken(claims: { sub: string; email?: string }): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: "supabase-demo",
      aud: "authenticated",
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...claims,
    }),
  );
  const data = `${header}.${payload}`;
  const sig = b64url(createHmac("sha256", JWT_SECRET).update(data).digest());
  return `${data}.${sig}`;
}

export function clientFor(identity: { sub: string; email?: string }): SupabaseClient {
  const token = signToken(identity);
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    accessToken: async () => token,
  });
}

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function isLocalSupabaseUp(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: ANON_KEY },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface SeedResult {
  portfolioA: string;
  portfolioB: string;
  portfolioC: string;
}

/** Seeds two identities and three portfolios (A published, B draft, C published) owned across the two identities. */
export async function ensureSchema(): Promise<SeedResult> {
  const svc = serviceClient();
  const { error: userErr } = await svc.from("users").upsert(
    [
      { clerk_id: "user_test_ownerA", email: "owner-a@test.local", role: "superadmin" },
      { clerk_id: "user_test_ownerB", email: "owner-b@test.local", role: "user" },
    ],
    { onConflict: "clerk_id" },
  );
  if (userErr !== null) throw new Error(`seed users failed: ${userErr.message}`);

  const portfolios = [
    {
      slug: "rls-test-a",
      title: "Test Portfolio A",
      is_published: true,
      owner_user_id: "user_test_ownerA",
    },
    {
      slug: "rls-test-b",
      title: "Test Portfolio B",
      is_published: false,
      owner_user_id: "user_test_ownerA",
    },
    {
      slug: "rls-test-c",
      title: "Test Portfolio C",
      is_published: true,
      owner_user_id: "user_test_ownerB",
    },
  ];
  const { error: pfErr } = await svc.from("portfolios").upsert(portfolios, { onConflict: "slug" });
  if (pfErr !== null) throw new Error(`seed portfolios failed: ${pfErr.message}`);

  const { data, error } = await svc.from("portfolios").select("id, slug");
  if (data === null || error !== null) throw new Error(`read portfolios failed: ${error?.message}`);
  const byslug = new Map(data.map((row) => [row.slug, row.id]));
  const a = byslug.get("rls-test-a");
  const b = byslug.get("rls-test-b");
  const c = byslug.get("rls-test-c");
  if (a === undefined || b === undefined || c === undefined) {
    throw new Error("seed did not create all three portfolios");
  }
  return { portfolioA: a, portfolioB: b, portfolioC: c };
}
```

Note: `as string` non-null assertions are banned by house ESLint rules — if lint rejects the Map lookups, restructure with an explicit guard:

```ts
const a = byslug.get("rls-test-a");
if (a === undefined) throw new Error("seed did not create portfolio A");
return { portfolioA: a, ... };
```

`lib/db/src/rls-multitenant.test.ts` (Task 1 portion):

```ts
import { describe, expect, it } from "vitest";
import {
  anonClient,
  clientFor,
  ensureSchema,
  isLocalSupabaseUp,
  serviceClient,
} from "./rls-test-helpers";

const run = await isLocalSupabaseUp();
const d = run ? describe : describe.skip;

d("rls: portfolios (064)", () => {
  it("owner sees own portfolios, including drafts, on the base table", async () => {
    const { portfolioA, portfolioB } = await ensureSchema();
    const owner = clientFor({ sub: "user_test_ownerA" });
    const { data } = await owner.from("portfolios").select("id").in("id", [portfolioA, portfolioB]);
    expect(data?.map((row) => row.id).sort()).toEqual([portfolioA, portfolioB].sort());
  });

  it("owner cannot update another owner's portfolio", async () => {
    const { portfolioC } = await ensureSchema();
    const ownerA = clientFor({ sub: "user_test_ownerA" });
    const { data, error } = await ownerA
      .from("portfolios")
      .update({ title: "hijacked" })
      .eq("id", portfolioC)
      .select();
    expect(data).toEqual([]);
    expect(error).toBeNull();
    const svc = serviceClient();
    const { data: fresh } = await svc
      .from("portfolios")
      .select("title")
      .eq("id", portfolioC)
      .single();
    expect(fresh?.title).toBe("Test Portfolio C");
  });

  it("anon sees only published portfolios through public_portfolios", async () => {
    const { portfolioA, portfolioB, portfolioC } = await ensureSchema();
    const anon = anonClient();
    const { data } = await anon.from("public_portfolios").select("id");
    const ids = data?.map((row) => row.id) ?? [];
    expect(ids).toContain(portfolioA);
    expect(ids).toContain(portfolioC);
    expect(ids).not.toContain(portfolioB);
  });

  it("anon cannot insert or update portfolios", async () => {
    const anon = anonClient();
    const { error: insErr } = await anon
      .from("portfolios")
      .insert({ slug: "anon-own", title: "x", owner_user_id: "user_anon" });
    expect(insErr).not.toBeNull();
    const svc = serviceClient();
    const { data } = await svc.from("portfolios").select("id").eq("slug", "anon-own");
    expect(data).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `lib/db`): `pnpm vitest run src/rls-multitenant.test.ts`
Expected: FAIL — relation `public.portfolios` does not exist (or connection refused if the local stack is not running; start it first with `supabase start` from the repo root).

- [ ] **Step 3: Write migration 064**

`supabase/migrations/064_portfolios.sql`:

> **Execution note (discovered during implementation):** CLI v2.109.1's `db reset` applies migrations as `postgres`, whose default ACLs omit table CRUD for `service_role`/`anon`/`authenticated` in `public` — every REST query fails with "permission denied" on the local stack (hosted grants full CRUD; existing tests are mocked, so it was never hit). 064 therefore starts with grant-parity statements: explicit `GRANT SELECT, INSERT, UPDATE, DELETE` + function `EXECUTE` on schema `public` for the three roles, plus `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` so future migrations inherit the hosted behavior. Row-level access is still governed solely by RLS policies.

```sql
-- ============================================================================
-- 064_portfolios.sql — Multi-tenancy foundations (spec: 2026-09-16-multi-tenancy-design.md)
--
-- Adds the portfolios (tenant) table, the ownership/published helpers used by
-- all later tenant policies, and a security_invoker view exposing only the
-- public-safe portfolio columns for slug resolution.
-- Idempotent: IF EXISTS / OR REPLACE everywhere; safe to re-run.
-- ============================================================================

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
```

- [ ] **Step 4: Apply and verify tests pass**

Run (repo root): `supabase db reset`
Run (from `lib/db`): `pnpm vitest run src/rls-multitenant.test.ts`
Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/064_portfolios.sql lib/db/src/rls-test-helpers.ts lib/db/src/rls-multitenant.test.ts
git commit -m "feat(db): add portfolios tenant table, RLS helpers, public view"
```

---

### Task 2: Tenant columns, backfill, per-portfolio uniqueness

**Files:**

- Create: `supabase/migrations/065_tenant_columns_backfill.sql`
- Modify: `lib/db/src/rls-multitenant.test.ts`

**Interfaces:**

- Consumes: `portfolios` table from Task 1.
- Produces: `portfolio_id` column (nullable, FK → portfolios ON DELETE CASCADE) on 21 tables; per-portfolio unique indexes replacing singleton `((true))` indexes; `section_settings (portfolio_id, key)` uniqueness + composite FK from `analytics_events`; `contact_messages` dropped. Backfilled portfolio: slug `mustafa`, owner `legacy-owner` (placeholder — production runbook sets the real Clerk id), published.

The 21 tenanted tables (fixed list, used verbatim in the migration):
`theme_settings, typography_settings, site_settings, seo_settings, hero_content, about_content, contact_info, cv_settings, skills, projects, experience, certifications, messages, section_settings, content_snapshots, section_variants, analytics_events, content_health_reports, image_metadata, image_variants, blog_posts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/db/src/rls-multitenant.test.ts`:

```ts
d("rls: tenant columns + backfill (065)", () => {
  it("backfills portfolio #1 and stamps every existing row", async () => {
    const svc = serviceClient();
    const { data: pf } = await svc
      .from("portfolios")
      .select("id, slug, is_published")
      .eq("slug", "mustafa")
      .single();
    expect(pf).not.toBeNull();
    expect(pf?.is_published).toBe(true);

    for (const table of ["projects", "skills", "messages", "site_settings", "blog_posts"]) {
      const { data } = await svc.from(table).select("portfolio_id");
      for (const row of data ?? []) {
        expect(row.portfolio_id).toBe(pf?.id);
      }
    }
  });

  it("enforces singleton semantics per portfolio (not globally)", async () => {
    const { portfolioB } = await ensureSchema();
    const svc = serviceClient();
    // one row per portfolio is fine
    const { error: errB } = await svc.from("site_settings").insert({ portfolio_id: portfolioB });
    expect(errB).toBeNull();
    // a second row for the SAME portfolio violates the unique index
    const { error: errDup } = await svc.from("site_settings").insert({ portfolio_id: portfolioB });
    expect(errDup).not.toBeNull();
    expect(errDup?.code).toBe("23505");
  });

  it("drops legacy contact_messages", async () => {
    const svc = serviceClient();
    const { error } = await svc.from("contact_messages").select("id").limit(1);
    expect(error).not.toBeNull(); // relation no longer exists (42P01 or REST 404)
  });

  it("keeps section keys unique per portfolio", async () => {
    const svc = serviceClient();
    const { data: pf1 } = await svc.from("portfolios").select("id").eq("slug", "mustafa").single();
    const { error: errDup } = await svc
      .from("section_settings")
      .insert({ portfolio_id: pf1?.id, key: "hero", label: "Hero" });
    expect(errDup).not.toBeNull();
    expect(errDup?.code).toBe("23505");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `lib/db`): `pnpm vitest run src/rls-multitenant.test.ts`
Expected: new tests FAIL (`portfolio_id` column missing → PostgREST error `Could not find the 'portfolio_id' column`).

- [ ] **Step 3: Write migration 065**

`supabase/migrations/065_tenant_columns_backfill.sql`:

```sql
-- ============================================================================
-- 065_tenant_columns_backfill.sql — portfolio_id everywhere + backfill
-- Spec: 2026-09-16-multi-tenancy-design.md §4.2, §7
-- Idempotent: IF NOT EXISTS / WHERE ... IS NULL guards; safe to re-run.
-- ============================================================================

-- 1. Portfolio #1 (legacy single-tenant data). Owner is a placeholder unless a
-- superadmin user exists (true on the hosted DB); production runbook replaces
-- 'legacy-owner' with the real Clerk id when unknown.
INSERT INTO public.portfolios (owner_user_id, slug, title, is_published)
SELECT COALESCE(
         (SELECT u.clerk_id FROM public.users u WHERE u.role = 'superadmin' ORDER BY u.created_at LIMIT 1),
         'legacy-owner'),
       'mustafa', 'Mustafa Sayed', true
WHERE NOT EXISTS (SELECT 1 FROM public.portfolios WHERE slug = 'mustafa');

-- 2. Add portfolio_id + backfill on every tenanted table.
-- image_variants is backfilled from its parent image_metadata row.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'theme_settings','typography_settings','site_settings','seo_settings',
    'hero_content','about_content','contact_info','cv_settings',
    'skills','projects','experience','certifications','messages',
    'section_settings','content_snapshots','section_variants',
    'analytics_events','content_health_reports','image_metadata',
    'image_variants','blog_posts'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET portfolio_id = (SELECT id FROM public.portfolios WHERE slug = ''mustafa'') WHERE portfolio_id IS NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_portfolio ON public.%I(portfolio_id)', t, t);
  END LOOP;
END $$;

-- image_variants: inherit from parent image_metadata (overrides the blanket backfill above)
UPDATE public.image_variants v
SET portfolio_id = p.portfolio_id
FROM public.image_metadata p
WHERE v.parent_image_id = p.id AND v.portfolio_id IS DISTINCT FROM p.portfolio_id;

-- 3. Singleton tables: replace the global ((true)) guard with a per-portfolio
-- guard. COALESCE maps legacy NULL-portfolio rows onto the nil UUID so at most
-- one legacy row can exist, same guarantee as 057.
DROP INDEX IF EXISTS public.theme_settings_singleton_idx;
DROP INDEX IF EXISTS public.typography_settings_singleton_idx;
DROP INDEX IF EXISTS public.site_settings_singleton_idx;
DROP INDEX IF EXISTS public.seo_settings_singleton_idx;
DROP INDEX IF EXISTS public.hero_content_singleton_idx;
DROP INDEX IF EXISTS public.about_content_singleton_idx;
DROP INDEX IF EXISTS public.contact_info_singleton_idx;
DROP INDEX IF EXISTS public.cv_settings_singleton_idx;

CREATE UNIQUE INDEX IF NOT EXISTS theme_settings_portfolio_singleton_idx
  ON public.theme_settings ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS typography_settings_portfolio_singleton_idx
  ON public.typography_settings ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_portfolio_singleton_idx
  ON public.site_settings ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS seo_settings_portfolio_singleton_idx
  ON public.seo_settings ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS hero_content_portfolio_singleton_idx
  ON public.hero_content ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS about_content_portfolio_singleton_idx
  ON public.about_content ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS contact_info_portfolio_singleton_idx
  ON public.contact_info ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));
CREATE UNIQUE INDEX IF NOT EXISTS cv_settings_portfolio_singleton_idx
  ON public.cv_settings ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)));

-- 4. section_settings: global key uniqueness becomes per-portfolio; the
-- analytics_events.section_key FK must follow (composite).
ALTER TABLE public.section_settings DROP CONSTRAINT IF EXISTS section_settings_key;
ALTER TABLE public.section_settings DROP CONSTRAINT IF EXISTS section_settings_portfolio_key_unique;
ALTER TABLE public.section_settings
  ADD CONSTRAINT section_settings_portfolio_key_unique UNIQUE (portfolio_id, key);

ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS fk_analytics_section;
ALTER TABLE public.analytics_events
  ADD CONSTRAINT fk_analytics_section
  FOREIGN KEY (portfolio_id, section_key)
  REFERENCES public.section_settings(portfolio_id, key)
  ON DELETE SET NULL NOT VALID;
ALTER TABLE public.analytics_events VALIDATE CONSTRAINT fk_analytics_section;

-- 5. blog_posts: slug uniqueness moves from (user_id, slug) to portfolio scope.
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_user_slug_unique;
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_portfolio_slug_unique
  ON public.blog_posts ((COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::uuid)), slug);

-- 6. Drop the legacy contact_messages table (data consolidated into messages by 023).
DROP TABLE IF EXISTS public.contact_messages;
```

- [ ] **Step 4: Apply and verify tests pass**

Run (repo root): `supabase db reset`
Run (from `lib/db`): `pnpm vitest run src/rls-multitenant.test.ts`
Expected: all tests PASS (Task 1 tests still green).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/065_tenant_columns_backfill.sql lib/db/src/rls-multitenant.test.ts
git commit -m "feat(db): add portfolio_id columns, backfill tenant #1, per-portfolio uniqueness"
```

---

### Task 3: Owner + public RLS policies on tenanted tables

**Implementation notes (recorded during execution):**

- Test fixtures must satisfy real CHECK constraints: `projects` requires `slug` (NOT NULL) and description ≥ 10 chars; `messages.message` must be ≥ 10 chars. Seeding with placeholder data fails with 23514/23502 before RLS is even evaluated — and upsert errors must be asserted (`expect(err).toBeNull()`), not silently ignored.
- Tenant isolation must be asserted on DRAFT content (`is_published: false`): published rows are intentionally visible cross-tenant via the public_read policies (that is how the public site works). `owns_portfolio` isolation still proven via draft reads + `messages`/`site_settings` private tables.
- `ensureSchema` is self-cleaning: it first deletes `portfolios` where `slug IN ('rls-test-a','rls-test-b','rls-test-c')` — the `portfolio_id ON DELETE CASCADE` FKs wipe any content previous runs created, making the suite rerunnable without `supabase db reset` (full vitest suite runs the RLS file twice without a reset).
- Full-suite runs on this Windows box require `pnpm vitest run --no-file-parallelism` (`ERR_IPC_CHANNEL_CLOSED` tinypool crash otherwise).

**Files:**

- Create: `supabase/migrations/066_tenant_rls.sql`
- Modify: `lib/db/src/rls-multitenant.test.ts`

**Interfaces:**

- Consumes: `owns_portfolio`, `is_published_portfolio` (Task 1); `portfolio_id` columns (Task 2).
- Produces (per tenanted table): policies `owner_select_<t>`, `owner_insert_<t>`, `owner_update_<t>`, `owner_delete_<t>` (TO authenticated). Public reads keep their existing policy names but gain `AND (portfolio_id IS NULL OR is_published_portfolio(portfolio_id))`. New scoped anon INSERT policies: `public_insert_messages`, `public_insert_analytics` (replaces 059's).

- [ ] **Step 1: Write the failing tests**

Append to `lib/db/src/rls-multitenant.test.ts`:

```ts
d("rls: tenanted table isolation (066)", () => {
  it("owner reads own rows and not other tenants' rows", async () => {
    const { portfolioA } = await ensureSchema();
    const svc = serviceClient();
    await svc
      .from("projects")
      .upsert(
        { portfolio_id: portfolioA, title: "A project", description: "d", is_published: true },
        { onConflict: "id" },
      );
    const ownerA = clientFor({ sub: "user_test_ownerA" });
    const ownerB = clientFor({ sub: "user_test_ownerB" });
    const { data: seenByA } = await ownerA
      .from("projects")
      .select("title")
      .eq("title", "A project");
    expect(seenByA?.length).toBe(1);
    const { data: seenByB } = await ownerB
      .from("projects")
      .select("title")
      .eq("title", "A project");
    expect(seenByB).toEqual([]);
  });

  it("owner can insert and delete within own portfolio only", async () => {
    const { portfolioA, portfolioC } = await ensureSchema();
    const ownerA = clientFor({ sub: "user_test_ownerA" });
    const { data: inserted, error: insErr } = await ownerA
      .from("skills")
      .insert({ portfolio_id: portfolioA, name: "SQL", category: "Data", proficiency: 90 })
      .select("id");
    expect(insErr).toBeNull();
    const skillId = inserted?.[0]?.id;
    if (skillId === undefined) throw new Error("expected skill insert to return id");
    // cross-tenant insert denied by WITH CHECK
    const { error: crossErr } = await ownerA
      .from("skills")
      .insert({ portfolio_id: portfolioC, name: "Nope", category: "X", proficiency: 1 });
    expect(crossErr).not.toBeNull();
    // cleanup own row
    const { error: delErr } = await ownerA.from("skills").delete().eq("id", skillId);
    expect(delErr).toBeNull();
  });

  it("anon reads only published content from published portfolios", async () => {
    const { portfolioA, portfolioB } = await ensureSchema();
    const svc = serviceClient();
    await svc
      .from("projects")
      .upsert(
        { portfolio_id: portfolioA, title: "Pub project", description: "d", is_published: true },
        { onConflict: "id" },
      );
    await svc
      .from("projects")
      .upsert(
        { portfolio_id: portfolioB, title: "Draft project", description: "d", is_published: true },
        { onConflict: "id" },
      );
    const anon = anonClient();
    const { data } = await anon
      .from("projects")
      .select("title")
      .in("title", ["Pub project", "Draft project"]);
    expect(data?.map((row) => row.title)).toEqual(["Pub project"]);
  });

  it("anon can insert messages only into published portfolios, with guarded columns", async () => {
    const { portfolioA, portfolioB } = await ensureSchema();
    const anon = anonClient();
    const { error: okErr } = await anon.from("messages").insert({
      portfolio_id: portfolioA,
      name: "Vis",
      email: "v@x.com",
      message: "hi",
      subject: null,
    });
    expect(okErr).toBeNull();
    const { error: draftErr } = await anon.from("messages").insert({
      portfolio_id: portfolioB,
      name: "Vis",
      email: "v@x.com",
      message: "hi",
    });
    expect(draftErr).not.toBeNull();
    const { error: statusErr } = await anon.from("messages").insert({
      portfolio_id: portfolioA,
      name: "Vis",
      email: "v@x.com",
      message: "hi",
      status: "read",
    });
    expect(statusErr).not.toBeNull();
  });

  it("anon analytics inserts stay whitelisted and portfolio-scoped", async () => {
    const { portfolioA } = await ensureSchema();
    const anon = anonClient();
    const { error: okErr } = await anon
      .from("analytics_events")
      .insert({ portfolio_id: portfolioA, type: "page_view", path: "/" });
    expect(okErr).toBeNull();
    const { error: badType } = await anon
      .from("analytics_events")
      .insert({ portfolio_id: portfolioA, type: "self_xss", path: "/" });
    expect(badType).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `lib/db`): `pnpm vitest run src/rls-multitenant.test.ts`
Expected: FAIL — policies don't exist yet, so ownerA sees all rows and cross-tenant inserts succeed.

- [ ] **Step 3: Write migration 066**

`supabase/migrations/066_tenant_rls.sql`:

```sql
-- ============================================================================
-- 066_tenant_rls.sql — owner + public policies on tenanted tables
-- Spec: 2026-09-16-multi-tenancy-design.md §5
--
-- ADDS owner policies and re-scopes public reads. Existing is_admin()-based
-- admin_all_* policies are intentionally KEPT this phase: the running API
-- writes with the service-role key (RLS bypass) and Phase 2 removes them.
-- Transition: public reads accept portfolio_id IS NULL rows (legacy writers).
-- Idempotent: DROP POLICY IF EXISTS before every CREATE.
-- ============================================================================

-- 1. Owner CRUD policies for every tenanted table.
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'theme_settings','typography_settings','site_settings','seo_settings',
    'hero_content','about_content','contact_info','cv_settings',
    'skills','projects','experience','certifications','messages',
    'section_settings','content_snapshots','section_variants',
    'analytics_events','content_health_reports','image_metadata',
    'image_variants','blog_posts'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS owner_select_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE POLICY owner_select_%1$s ON public.%1$I FOR SELECT TO authenticated USING (public.owns_portfolio(portfolio_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_insert_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE POLICY owner_insert_%1$s ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.owns_portfolio(portfolio_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_update_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE POLICY owner_update_%1$s ON public.%1$I FOR UPDATE TO authenticated USING (public.owns_portfolio(portfolio_id)) WITH CHECK (public.owns_portfolio(portfolio_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_delete_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE POLICY owner_delete_%1$s ON public.%1$I FOR DELETE TO authenticated USING (public.owns_portfolio(portfolio_id))', t);
  END LOOP;
END $$;

-- 2. Public reads: existing per-table visibility predicates + portfolio gate.
--    (Predicate per table copied from 001/025/042/046.)

DROP POLICY IF EXISTS "public_read_hero" ON public.hero_content;
CREATE POLICY "public_read_hero" ON public.hero_content FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_about" ON public.about_content;
CREATE POLICY "public_read_about" ON public.about_content FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_skills" ON public.skills;
CREATE POLICY "public_read_skills" ON public.skills FOR SELECT
  TO anon, authenticated USING (is_visible = true AND deleted_at IS NULL
    AND (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id)));

DROP POLICY IF EXISTS "public_read_projects" ON public.projects;
CREATE POLICY "public_read_projects" ON public.projects FOR SELECT
  TO anon, authenticated USING (is_published = true AND deleted_at IS NULL
    AND (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id)));

DROP POLICY IF EXISTS "public_read_experience" ON public.experience;
CREATE POLICY "public_read_experience" ON public.experience FOR SELECT
  TO anon, authenticated USING (is_published = true AND deleted_at IS NULL
    AND (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id)));

DROP POLICY IF EXISTS "public_read_certifications" ON public.certifications;
CREATE POLICY "public_read_certifications" ON public.certifications FOR SELECT
  TO anon, authenticated USING (is_published = true AND deleted_at IS NULL
    AND (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id)));

DROP POLICY IF EXISTS "public_read_contact" ON public.contact_info;
CREATE POLICY "public_read_contact" ON public.contact_info FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_theme" ON public.theme_settings;
CREATE POLICY "public_read_theme" ON public.theme_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_typography" ON public.typography_settings;
CREATE POLICY "public_read_typography" ON public.typography_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_site" ON public.site_settings;
CREATE POLICY "public_read_site" ON public.site_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_seo" ON public.seo_settings;
CREATE POLICY "public_read_seo" ON public.seo_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_sections" ON public.section_settings;
CREATE POLICY "public_read_sections" ON public.section_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

DROP POLICY IF EXISTS "public_read_variants" ON public.section_variants;
CREATE POLICY "public_read_variants" ON public.section_variants FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

-- 036 opened cv_settings to anon so public CV download works; now portfolio-gated.
DROP POLICY IF EXISTS "public_read_cv" ON public.cv_settings;
CREATE POLICY "public_read_cv" ON public.cv_settings FOR SELECT
  TO anon, authenticated USING (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id));

-- 046 public blog read + portfolio gate.
DROP POLICY IF EXISTS "public_read_published_blog_posts" ON public.blog_posts;
CREATE POLICY "public_read_published_blog_posts" ON public.blog_posts FOR SELECT
  TO anon, authenticated USING (is_published = true AND deleted_at IS NULL
    AND (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id)));

-- 3. Scoped public INSERTs. messages: visitor writes reach RLS again (Phase 2
--    switches the API from service-role to the anon path); guards pin the
--    columns an anonymous writer must not control (059 rationale).
DROP POLICY IF EXISTS "public_insert_messages" ON public.messages;
CREATE POLICY "public_insert_messages" ON public.messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    public.is_published_portfolio(portfolio_id)
    AND status = 'unread'
    AND is_spam = false
    AND spam_score IS NULL
    AND spam_reason IS NULL
    AND reply_email_draft IS NULL
    AND replied_at IS NULL
    AND deleted_at IS NULL
  );

-- analytics_events: keep 059's event-type whitelist + length caps, add the
-- portfolio gate (NULL tolerated until the portfolio frontend sends its
-- portfolio_id — Phase 2 removes the NULL branch).
DROP POLICY IF EXISTS "public_insert_analytics" ON public.analytics_events;
CREATE POLICY "public_insert_analytics" ON public.analytics_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (portfolio_id IS NULL OR public.is_published_portfolio(portfolio_id))
    AND type IN ('page_view', 'project_view', 'cv_download', 'contact_click')
    AND char_length(COALESCE(path, '')) <= 512
    AND char_length(COALESCE(section_key, '')) <= 128
    AND char_length(COALESCE(preset_id, '')) <= 255
    AND char_length(COALESCE(referrer, '')) <= 1024
    AND char_length(COALESCE(device, '')) <= 64
  );

-- 4. Verify no tenanted table is left without an owner policy (fails loudly).
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'theme_settings','typography_settings','site_settings','seo_settings',
    'hero_content','about_content','contact_info','cv_settings',
    'skills','projects','experience','certifications','messages',
    'section_settings','content_snapshots','section_variants',
    'analytics_events','content_health_reports','image_metadata',
    'image_variants','blog_posts'
  ];
  missing INT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    SELECT COUNT(*) INTO missing FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t AND policyname = 'owner_select_' || t;
    IF missing = 0 THEN
      RAISE EXCEPTION 'owner_select policy missing for %', t;
    END IF;
  END LOOP;
END $$;
```

- [ ] **Step 4: Apply and verify tests pass**

Run (repo root): `supabase db reset`
Run (from `lib/db`): `pnpm vitest run src/rls-multitenant.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Run the full lib/db suite (no regressions)**

Run (from `lib/db`): `pnpm vitest run`
Expected: all suites PASS (RLS suite included; mocked unit tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/066_tenant_rls.sql lib/db/src/rls-multitenant.test.ts
git commit -m "feat(db): owner and public-tenant RLS policies on all tenanted tables"
```

---

### Task 4: Storage tenancy (path prefixes + storage RLS)

**Files:**

- Create: `supabase/migrations/067_storage_tenancy.sql`
- Modify: `lib/db/src/rls-multitenant.test.ts`

**Interfaces:**

- Consumes: `portfolios`, `owns_portfolio` (Task 1); `image_metadata.storage_path` (Task 2 backfill).
- Produces: `public.owns_storage_object(p_bucket text, p_name text) returns boolean`; storage policies `owner_all_<bucket>` (INSERT/UPDATE/DELETE via FOR ALL TO authenticated) on `project_images`, `image_variants`, `avatars`, `cv`; every existing storage object name prefixed `{portfolio-uuid}/`; path columns (`cv_settings.object_path`, `image_metadata.storage_path`, `image_variants.storage_path`) and public URL columns (`projects.image_url`, `blog_posts.cover_image_url`, `seo_settings.og_image`) updated to the prefixed paths.

- [ ] **Step 1: Write the failing tests**

Append to `lib/db/src/rls-multitenant.test.ts`:

```ts
d("rls: storage tenancy (067)", () => {
  it("prefixes existing storage objects with the tenant portfolio id", async () => {
    const svc = serviceClient();
    const { data: pf1 } = await svc.from("portfolios").select("id").eq("slug", "mustafa").single();
    const { data: cvRow } = await svc.from("cv_settings").select("object_path").limit(1);
    if ((cvRow ?? []).length > 0) {
      expect(cvRow?.[0]?.object_path).toMatch(new RegExp(`^${pf1?.id}/`));
    }
  });

  it("lets owners write only under their own prefix", async () => {
    const { portfolioA } = await ensureSchema();
    const ownerA = clientFor({ sub: "user_test_ownerA" });
    const { error: okErr } = await ownerA.storage
      .from("project_images")
      .upload(`${portfolioA}/test.png`, new Uint8Array([1, 2, 3]), {
        contentType: "image/png",
        upsert: true,
      });
    expect(okErr).toBeNull();

    const { data: pfC } = await serviceClient()
      .from("portfolios")
      .select("id")
      .eq("slug", "rls-test-c")
      .single();
    const otherId = pfC?.id;
    if (otherId === undefined) throw new Error("seed did not create portfolio C");
    const { error: crossErr } = await ownerA.storage
      .from("project_images")
      .upload(`${otherId}/steal.png`, new Uint8Array([1]), { contentType: "image/png" });
    expect(crossErr).not.toBeNull();

    await ownerA.storage.from("project_images").remove([`${portfolioA}/test.png`]);
  });

  it("anon cannot write to any bucket", async () => {
    const { portfolioA } = await ensureSchema();
    const anon = anonClient();
    const { error } = await anon.storage
      .from("project_images")
      .upload(`${portfolioA}/anon.png`, new Uint8Array([1]), { contentType: "image/png" });
    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `lib/db`): `pnpm vitest run src/rls-multitenant.test.ts`
Expected: FAIL — no prefix helper/policies exist; owner A can upload anywhere or nowhere.

- [ ] **Step 3: Write migration 067**

`supabase/migrations/067_storage_tenancy.sql`:

```sql
-- ============================================================================
-- 067_storage_tenancy.sql — per-tenant storage paths + storage RLS
-- Spec: 2026-09-16-multi-tenancy-design.md §4.4
-- Idempotent: prefix step guards with a leading-UUID regex; policies IF EXISTS.
-- ============================================================================

-- 1. Helper: does the caller own the portfolio encoded in the object path?
CREATE OR REPLACE FUNCTION public.owns_storage_object(p_bucket TEXT, p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE id::text = split_part(p_name, '/', 1)
      AND owner_user_id = NULLIF(auth.jwt() ->> 'sub', '')
  );
$$;

COMMENT ON FUNCTION public.owns_storage_object(TEXT, TEXT) IS 'True when the first path segment of the object name is a portfolio owned by the JWT sub.';

-- 2. Prefix every existing (flat, unprefixed) object in the tenanted buckets
--    with portfolio #1's id.
DO $$
DECLARE
  p1 TEXT;
  b TEXT;
BEGIN
  SELECT id::text INTO p1 FROM public.portfolios WHERE slug = 'mustafa';
  IF p1 IS NULL THEN
    RAISE EXCEPTION 'portfolio #1 (slug mustafa) missing — run 065 first';
  END IF;
  FOREACH b IN ARRAY ARRAY['cv','project_images','image_variants','avatars','projects','certifications','documents'] LOOP
    UPDATE storage.objects
    SET name = p1 || '/' || name
    WHERE bucket_id = b
      AND name !~ ('^' || p1 || '/');
  END LOOP;
END $$;

-- 3. Point DB path columns at the renamed objects (skip already-prefixed).
DO $$
DECLARE
  p1 TEXT;
BEGIN
  SELECT id::text INTO p1 FROM public.portfolios WHERE slug = 'mustafa';

  UPDATE public.cv_settings
  SET object_path = p1 || '/' || object_path
  WHERE object_path NOT LIKE p1 || '/%';

  UPDATE public.image_metadata
  SET storage_path = p1 || '/' || storage_path
  WHERE storage_path NOT LIKE p1 || '/%';

  UPDATE public.image_variants
  SET storage_path = p1 || '/' || storage_path
  WHERE storage_path NOT LIKE p1 || '/%';

  -- Public URLs embed the object path after /object/public/<bucket>/.
  UPDATE public.projects
  SET image_url = regexp_replace(
        image_url,
        '(/object/public/(project_images|projects|certifications)/)(?!' || p1 || ')',
        '\1' || p1 || '/')
  WHERE image_url IS NOT NULL
    AND image_url LIKE '%/object/public/%'
    AND image_url NOT LIKE '%/object/public/%' || p1 || '/%';

  UPDATE public.blog_posts
  SET cover_image_url = regexp_replace(
        cover_image_url,
        '(/object/public/(project_images|projects|certifications)/)(?!' || p1 || ')',
        '\1' || p1 || '/')
  WHERE cover_image_url IS NOT NULL
    AND cover_image_url LIKE '%/object/public/%'
    AND cover_image_url NOT LIKE '%/object/public/%' || p1 || '/%';

  UPDATE public.seo_settings
  SET og_image = regexp_replace(
        og_image,
        '(/object/public/(project_images|projects|certifications)/)(?!' || p1 || ')',
        '\1' || p1 || '/')
  WHERE og_image IS NOT NULL
    AND og_image LIKE '%/object/public/%'
    AND og_image NOT LIKE '%/object/public/%' || p1 || '/%';
END $$;

-- 4. Owner write policies per bucket (public reads are unchanged: public
--    buckets already allow anon SELECT; cv allows public download per 001).
DROP POLICY IF EXISTS "owner_all_project_images" ON storage.objects;
CREATE POLICY "owner_all_project_images" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'project_images' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'project_images' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_image_variants" ON storage.objects;
CREATE POLICY "owner_all_image_variants" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'image_variants' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'image_variants' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_avatars" ON storage.objects;
CREATE POLICY "owner_all_avatars" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'avatars' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_cv" ON storage.objects;
CREATE POLICY "owner_all_cv" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'cv' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'cv' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_projects_bucket" ON storage.objects;
CREATE POLICY "owner_all_projects_bucket" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'projects' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'projects' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_certifications_bucket" ON storage.objects;
CREATE POLICY "owner_all_certifications_bucket" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'certifications' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'certifications' AND public.owns_storage_object(bucket_id, name));

DROP POLICY IF EXISTS "owner_all_documents" ON storage.objects;
CREATE POLICY "owner_all_documents" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.owns_storage_object(bucket_id, name))
  WITH CHECK (bucket_id = 'documents' AND public.owns_storage_object(bucket_id, name));
```

Note: the `!~ ('^' || p1 || '/')` guard in the rename loop is the idempotency check — re-running skips already-prefixed names. Existing 037 admin\_\* policies are kept (service-role bypasses RLS regardless; they gate authenticated direct-DB admin users until Phase 2).

- [ ] **Step 4: Apply and verify tests pass**

Run (repo root): `supabase db reset`
Run (from `lib/db`): `pnpm vitest run src/rls-multitenant.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/067_storage_tenancy.sql lib/db/src/rls-multitenant.test.ts
git commit -m "feat(db): per-tenant storage paths and owner-scoped storage RLS"
```

---

### Task 5: CI wiring, docs, final gates

**Files:**

- Modify: `.github/workflows/ci.yml` (db-migrations job)
- Modify: `supabase/migrations/README.md`
- Modify: `docs/superpowers/specs/2026-09-16-multi-tenancy-design.md` (only if a deviation was discovered — e.g., contact_messages dropped; record it in §4.2)

**Interfaces:**

- Consumes: the RLS suite (`lib/db/src/rls-multitenant.test.ts`) and the `db-migrations` CI job.

- [ ] **Step 1: Extend the db-migrations CI job**

In `.github/workflows/ci.yml`, inside the `db-migrations` job, after the `supabase db reset` step, add:

```yaml
# Cross-tenant RLS matrix against the freshly-migrated local DB.
# `supabase status -o env` exports SUPABASE_URL, SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY for the local stack.
- name: Run RLS multi-tenant tests
  working-directory: lib/db
  run: pnpm vitest run src/rls-multitenant.test.ts
  env:
    SUPABASE_TEST_URL: ${{ env.SUPABASE_URL }}
    SUPABASE_TEST_ANON_KEY: ${{ env.SUPABASE_ANON_KEY }}
    SUPABASE_TEST_SERVICE_KEY: ${{ env.SUPABASE_SERVICE_ROLE_KEY }}
```

If `supabase status -o env` is not auto-exported in this CLI version (2.109.1), capture it explicitly:

```yaml
- name: Export local Supabase env
  run: supabase status -o env | Out-File -Encoding utf8 $env:GITHUB_ENV
```

On ubuntu the direct form is: `run: supabase status -o env >> "$GITHUB_ENV"` — verify the emitted variable names with `supabase status -o env` locally and adjust the mapping if the CLI uses different names (e.g. `API_URL`), pinning the exact names in the workflow.

- [ ] **Step 2: Update `supabase/migrations/README.md`**

Append a section describing 064–067: what each migration does, the `legacy-owner` placeholder, and the production runbook step:

```sql
-- After db push, bind portfolio #1 to the real owner (run in Supabase SQL editor):
UPDATE portfolios SET owner_user_id = '<real-clerk-user-id>' WHERE slug = 'mustafa';
```

- [ ] **Step 3: Run all verification gates**

Run (repo root): `pnpm typecheck`
Expected: 0 errors.
Run (repo root): `pnpm lint`
Expected: 0 errors, 0 warnings (house rule `--max-warnings=0`). Fix any lint findings in the new TS files (watch for: non-null assertions in the test helpers — use the explicit-undefined-guard form shown in Task 1; `require()` — replace the inline `require("node:crypto")` with a top-level `import crypto from "node:crypto"`; the plan's snippet uses require only to keep the signToken block self-contained).
Run (repo root): `supabase db reset; pnpm vitest run` per workspace (`lib/db` minimum; then `pnpm -r test` if the root script exists).
Expected: full suite green (1750+ tests + new RLS suite).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml supabase/migrations/README.md docs/superpowers/specs/2026-09-16-multi-tenancy-design.md
git commit -m "chore(ci): run RLS multi-tenant suite in db-migrations job; document migrations 064-067"
```

---

## Phase 1 completion checklist

- [ ] `supabase db reset` replays 001→067 cleanly on an empty database.
- [ ] RLS suite: owner isolation, anon publish-gating, guarded public inserts, storage prefixing all green.
- [ ] `pnpm typecheck`, `pnpm lint` clean; full Vitest run green.
- [ ] Production runbook: after `supabase db push`, bind `mustafa` portfolio to the real Clerk user id.
- [ ] Handoff to Phase 2 plan (API migration to JWT-scoped clients + retire service-role from request paths + drop `user_id` columns and `admin_all_*` policies + remove analytics NULL-portfolio branch).

## Known deferred items (intentionally out of scope)

- Dropping `user_id` columns from tenanted tables — Phase 2 (app must stop writing them first).
- `portfolio_id NOT NULL` on tenanted tables — Phase 2 final migration (columns stay nullable during the transition).
- Dropping `admin_all_*` policies and the `is_admin()` GUC fallback — Phase 2.
- `theme_presets` stays user-scoped (unchanged behavior); portfolio-scoped presets are a later feature.
- Supabase `[auth.third_party.clerk]` config + client `accessToken` wiring — Phase 2 (no DB change required in Phase 1; RLS reads `auth.jwt()->>'sub'` which the Clerk integration populates).
