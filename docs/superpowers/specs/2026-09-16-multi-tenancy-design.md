# Multi-Tenancy Design (P0)

**Date:** 2026-09-16
**Status:** Approved design — pending implementation plans
**Scope:** SaaS foundations — many portfolios per user, enforced by Supabase RLS with Clerk third-party auth

## 1. Goals

- Any person can sign up (open self-serve) and own **multiple portfolios**.
- Tenant isolation is enforced by **Postgres RLS**, not application code: a missing
  `where` clause can never leak cross-tenant data.
- The **service-role key is retired from all request paths** (retained only for
  system routes gated by `ADMIN_EMAILS`).
- Existing single-portfolio data is migrated unchanged into tenant #1.
- Zero recurring infrastructure cost (Supabase free tier, Clerk free tier, Vercel Hobby).

## 2. Non-goals (deferred)

- Onboarding wizard (P1), theme gallery (P2), CV-import AI flow (P3),
  owner analytics dashboard (P4), tenant URL subdomains (P5), billing (dropped).
- Custom domains (incompatible with the $0 constraint).
- Marketing landing page (P0 ships only a minimal root stub).

## 3. Tenancy model

- `1 user = N portfolios`. A Clerk account maps to rows in `portfolios` via
  `portfolios.owner_user_id` (the Clerk user id, `user_...`).
- Tenant URL: path-based, `/p/{slug}`. Slugs are globally unique,
  `^[a-z0-9-]{3,63}$`, lowercase, immutable in P0.
- The portfolio frontend resolves `slug → portfolio_id` once per request and
  passes the id through existing queries; RLS does the actual filtering.
- Root path `/` serves a minimal stub (platform intro + link to admin/sign-in).
  The owner's existing portfolio moves to `/p/mustafa`.

## 4. Schema changes

### 4.1 New table: `portfolios`

```sql
create table portfolios (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id text not null,           -- Clerk user id (auth.jwt()->>'sub')
  slug          text not null unique,
  title         text not null,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint portfolios_slug_format check (slug ~ '^[a-z0-9-]{3,63}$')
);
```

No FK from `owner_user_id` to `users`: Clerk is the source of identity. The
existing `users` table stays as an optional profile/cache row keyed by Clerk id.

### 4.2 Tables that gain `portfolio_id` (tenanted)

| Table                    | Notes                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `blog_posts`             | was per-owner via `user_id`; becomes per-portfolio                                                                                |
| `projects`               | per-portfolio                                                                                                                     |
| `skills`                 | per-portfolio                                                                                                                     |
| `experience`             | per-portfolio                                                                                                                     |
| `certifications`         | per-portfolio                                                                                                                     |
| `about_content`          | singleton **per portfolio** (unique index replaces global)                                                                        |
| `hero_content`           | singleton per portfolio                                                                                                           |
| `contact_info`           | singleton per portfolio                                                                                                           |
| `contact_messages`       | per-portfolio; anon INSERT allowed (published only)                                                                               |
| `messages`               | per-portfolio; anon INSERT allowed (published only)                                                                               |
| ~~`contact_messages`~~   | **dropped** during Phase 1 (migration 065): 023 already consolidated its data into `messages`; the table was legacy and unwritten |
| `cv_settings`            | singleton per portfolio                                                                                                           |
| `seo_settings`           | singleton per portfolio                                                                                                           |
| `site_settings`          | singleton per portfolio                                                                                                           |
| `theme_settings`         | singleton per portfolio                                                                                                           |
| `typography_settings`    | singleton per portfolio                                                                                                           |
| `section_settings`       | unique key becomes `(portfolio_id, section)`                                                                                      |
| `section_variants`       | per-portfolio                                                                                                                     |
| `image_metadata`         | per-portfolio; storage path gains `{portfolio_id}/` prefix                                                                        |
| `image_variants`         | per-portfolio                                                                                                                     |
| `analytics_events`       | per-portfolio; anon INSERT allowed (published only)                                                                               |
| `content_snapshots`      | per-portfolio                                                                                                                     |
| `content_health_reports` | per-portfolio                                                                                                                     |

All tenanted tables: `portfolio_id uuid not null references portfolios(id) on delete cascade`.
Existing `user_id` columns are **dropped** after migration — ownership is
transitively `portfolios.owner_user_id`.

### 4.3 Tables that stay global

- `users` — identity cache; keyed by Clerk id, unchanged.
- `theme_presets` — global preset catalog in P0. (Per-tenant saved presets can
  be added later by adding a nullable `owner_user_id`.)

### 4.4 Storage

Image objects move under `{portfolio_id}/…` prefixes. Storage policies key on
the path prefix: owners get full access to their prefix; public read only for
objects whose portfolio `is_published`. Existing objects are migrated into
portfolio #1's prefix during backfill.

## 5. RLS policies

Enable RLS on `portfolios` and every tenanted table.

Helper (avoids recursive policy lookups and keeps policies one-liners):

```sql
create or replace function owns_portfolio(p_portfolio_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from portfolios
    where id = p_portfolio_id
      and owner_user_id = auth.jwt() ->> 'sub'
  );
$$;
```

Policies per tenanted table (replace `t` with the table name):

| Operation                                                     | Policy                                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| SELECT (owner)                                                | `using (owns_portfolio(portfolio_id))`                                                                            |
| INSERT (owner)                                                | `with check (owns_portfolio(portfolio_id))`                                                                       |
| UPDATE/DELETE (owner)                                         | `using (owns_portfolio(portfolio_id))`                                                                            |
| SELECT (public, content tables)                               | `using (portfolio is published)` — via published-portfolio subquery helper `is_published_portfolio(portfolio_id)` |
| INSERT (public: contact_messages, messages, analytics_events) | `with check (is_published_portfolio(portfolio_id))`                                                               |
| Public INSERT/UPDATE/DELETE on content tables                 | none                                                                                                              |

`portfolios` itself: owner CRUD via `owner_user_id = auth.jwt()->>'sub'`.
Public slug resolution goes through a `public_portfolios` view exposing only
`(id, slug, title, is_published)` (RLS on the view: published rows visible to
anon, own rows visible to the owner) — `owner_user_id` is never publicly
readable.

Spam quarantine on `messages` remains application-layer (quarantined rows are
marked, not deleted, and are visible only to the owner via RLS).

## 6. Auth integration (Clerk → Supabase)

- Enable Clerk third-party auth in `supabase/config.toml`
  (`[auth.third_party.clerk]`), authorizing our Clerk domain/audience.
- All request-path Supabase clients are created with the **anon key** plus the
  caller's Clerk JWT via supabase-js `accessToken`:

  ```ts
  createClient(url, ANON_KEY, {
    accessToken: async () => clerkToken, // per-request token
  });
  ```

- **api-server:** builds a request-scoped client from the verified Clerk token
  (middleware already verifies via `@clerk/backend`); passes it into route
  handlers. `lib/db` modules stay table-shaped — no per-module tenancy code.
- **admin:** swaps its service-role client for the anon+JWT pattern
  (`ClerkAuthBridge` already exposes the session token).
- **portfolio frontend:** already anon+RLS; only adds slug resolution.
- Service-role client remains **only** in: admin user listing, admin
  arabic-status, and any future system routes — all still gated by
  `ADMIN_EMAILS`.

## 7. Data migration (backfill)

Single migration (next sequential version):

1. Create `portfolios`; insert portfolio #1: slug `mustafa`,
   `owner_user_id` = owner's Clerk id (from `users`), `is_published = true`.
2. Backfill `portfolio_id` on all tenanted tables to portfolio #1
   (every existing row belongs to it).
3. Backfill storage objects into the `{portfolio_id}/` prefix.
4. Add NOT NULL + FK constraints and the new per-portfolio unique indexes
   (replacing global singletons).
5. Drop `user_id` columns from tenanted tables.

## 8. Routing and API surface

- Portfolio frontend: route `/p/:slug` resolves the portfolio (public view of
  `portfolios`), then renders existing sections unchanged. Unknown/unpublished
  slug → existing NotFound page.
- api-server CMS routes accept an explicit `portfolioId` (path/query/body per
  existing route conventions); ownership is enforced by RLS — a foreign
  `portfolioId` yields Postgres permission errors mapped to **404** (do not
  reveal existence) instead of 403.
- Public write endpoints (contact, chat, analytics events) validate that the
  target portfolio is published at the app layer **and** rely on the RLS insert
  policy (defense in depth).
- Envelope, validation (`lib/validation`), and error-wrapping conventions are
  unchanged.

## 9. Admin UI

- Portfolio **switcher** in the admin shell; active portfolio id held in React
  context and persisted per session.
- **Create portfolio** flow: title + slug picker with live availability check
  (public slug uniqueness probe).
- Post-signup screen: "create your first portfolio" (minimal; full wizard = P1).
- All existing feature screens consume the context — no per-feature rework.

## 10. Error handling

- RLS denials surface as Postgres `42501`; the API maps them to 404 (CMS reads
  / writes referencing foreign portfolios) with the standard
  `{ success: false, message }` envelope.
- Slug-conflict on create → 409 (existing unique-violation mapping).
- Invalid slug format → 400 from `lib/validation` Zod schema
  (`slug` schema mirrors the DB CHECK).

## 11. Testing

- **RLS cross-tenant suite (new, highest value):** runs against local Supabase
  (CI `db-migrations` job already resets locally). Two-user fixture asserts, for
  every tenanted table and operation: owner allowed, other user denied,
  anon denied, anon insert allowed only for published portfolios on the three
  public-write tables.
- Backfill integrity test: post-migration, every tenanted row maps to portfolio
  #1; singleton tables have exactly one row per portfolio.
- API route tests updated to JWT-scoped clients (fixtures generate Clerk JWTs
  with distinct `sub` claims).
- Slug validation + resolution tests at validation, DB, and route layers.
- TDD red/green per layer, per house rules (migration → lib/db → routes → admin).

## 12. Risks / trade-offs

- **RLS policy mistakes are subtle** — mitigated by the dedicated cross-tenant
  suite and by keeping policies uniform (one helper, one shape).
- **Largest migration in project history** (~24 tables, storage, constraints) —
  mitigated by split execution (below) and the existing `lib/db` choke point.
- **Vercel Hobby ToS is non-commercial** — acceptable at $0/validating stage.
- **Supabase free tier limits** (500 MB, auto-pause) — fine initially; scale-up
  only becomes relevant with real traction.
- JWT-scoped clients add a token fetch per request — negligible; cached by the
  Clerk session.

## 13. Execution split (3 sequential plans)

1. **Schema + RLS + backfill** — migrations, RLS policies + helpers, local-Supabase
   cross-tenant test suite, backfill of existing data.
2. **API migration** — request-scoped JWT clients in api-server + admin, retire
   service-role from request paths, 404-mapping of denials, route test updates.
3. **Frontend** — `/p/:slug` routing + root stub in portfolio, portfolio
   switcher + create flow + first-portfolio screen in admin.

Each plan is independently verifiable (type-check, lint, full Vitest run).
