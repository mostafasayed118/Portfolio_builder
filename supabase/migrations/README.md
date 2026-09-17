# Supabase Migrations

This directory contains all database migrations for the portfolio project.

## Numbering Convention

Migrations are numbered sequentially (`001_`, `002_`, etc.) and committed in order.

## Numbering

Migrations are numbered sequentially `001_` through `052_` with no gaps. Earlier development had gaps at 010 and 016–019; those numbers were filled in when the migration set was consolidated, so the numbering is now contiguous. `README.md` is not a migration and is skipped by the CLI (its name doesn't match `<version>_name.sql`).

## Applying Migrations Locally

Replays the full migration chain against the local Docker stack (requires Docker Desktop running):

```bash
supabase start   # first time: starts the local stack
supabase db reset        # replay ALL migrations from scratch
supabase db push --local # apply only pending migrations
```

`supabase db reset` is the fastest way to prove a new migration applies cleanly on top of the whole chain before touching production.

## Applying Migrations to the Live Database — Token Only, No DB Password

Newer Supabase CLI versions (2.109+ tested here) can connect to the remote database using only a personal access token. The CLI exchanges the token for short-lived database credentials, so `SUPABASE_DB_PASSWORD` / `--db-url` are **optional**.

**1. Get a token**

Create one at supabase.com/dashboard/account/tokens (an `sbp_...` value). Treat it as a secret: export it as an environment variable, never paste it into chat or commit it to the repo.

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
```

**2. Link the project (once per checkout)**

```bash
supabase link --project-ref njibfrkovexikcwzycan
```

The ref for the live project is `njibfrkovexikcwzycan` (Portfolio_builder, West EU Ireland). Find all refs with `supabase projects list`; the linked project is marked with `●`. Linking only writes to the gitignored `supabase/.temp` directory.

**3. See what's pending**

```bash
supabase migration list
```

Shows `Local | Remote | Time` columns. A migration listed locally but not remotely is pending.

**4. Apply**

```bash
supabase db push --yes
```

`--yes` answers the `[Y/n]` confirmation non-interactively (the prompt defaults to `Y` anyway, so `< /dev/null` also works). Only migrations not yet recorded on the remote are applied.

**5. Verify**

```bash
supabase migration list   # Local column should now match Remote for every migration
```

Or query the live data through the REST API with the anon key from the root `.env`:

```bash
ANON=$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2-)
curl -s "https://njibfrkovexikcwzycan.supabase.co/rest/v1/hero_content?select=*&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

### Notes

- **A failing migration aborts the whole push and rolls back.** This is by design for guard migrations: `052_guard_placeholder_social_links.sql` intentionally raises if any published `hero_content` / `contact_info` row still holds a placeholder social handle, so a push can never silently ship broken links.
- **Commit migration files to git.** `db push` records a migration on the remote as soon as it's applied, but the repo stays the source of truth — commit the new file so local and remote stay in sync.
- **Token hygiene.** Rotate an `sbp_` token in the Supabase dashboard if it's ever exposed (e.g., pasted into a chat transcript).
- If you do have the DB password, the classic routes still work: set `SUPABASE_DB_PASSWORD` or pass `--db-url postgresql://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`.

## Multi-tenancy migrations (064-067)

Phase 1 of the 2026-09-16 multi-tenancy design adds per-owner portfolios and row-level security. Every migration in this range is idempotent and safe to replay via `supabase db reset`.

| Migration                         | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `064_portfolios.sql`              | Creates the `portfolios` table (slug, title, owner, publish flag), the SECURITY DEFINER helpers `owns_portfolio(uuid)` / `is_published_portfolio(uuid)`, the `public_portfolios` view (`security_invoker`), owner/public policies, and the CRUD grant parity block required by CLI 2.109.1's `db reset` (migrations run as `postgres`, whose default ACLs omit table grants for `anon`/`authenticated`/`service_role`).                                                                                                                                                                   |
| `065_tenant_columns_backfill.sql` | Creates portfolio #1 (`slug='mustafa'`, owner placeholder `legacy-owner`), adds `portfolio_id` columns + backfill + indexes to all 21 tenanted tables, replaces global `((true))` singleton indexes with per-portfolio `COALESCE(portfolio_id, col)` unique indexes, adds `section_settings UNIQUE(portfolio_id, key)` + composite FK from `analytics_events`, and drops the legacy `contact_messages` table (consolidated by 023).                                                                                                                                                       |
| `066_tenant_rls.sql`              | Adds `owner_select/insert/update/delete_<table>` policies for all 21 tenanted tables (TO authenticated, scoped via `owns_portfolio`), re-scopes every public read policy with `portfolio_id IS NULL OR is_published_portfolio(portfolio_id)`, and adds guarded anon INSERT policies `public_insert_messages` (published portfolio + `status='unread'` + `is_spam=false` + spam/reply guards) and `public_insert_analytics` (059 event whitelist). A verification block raises if any owner_select policy is missing.                                                                      |
| `067_storage_tenancy.sql`         | Adds `owns_storage_object(bucket, name)` (first path segment must be a portfolio owned by the JWT `sub`), renames all existing storage objects to `{portfolio-uuid}/...` (portfolio #1), updates DB path columns (`cv_settings.object_path`, `image_metadata.storage_path`, `image_variants.storage_path`) and public URL columns (`projects.image_url`, `blog_posts.cover_image_url`, `seo_settings.og_image`) to the prefixed paths, and adds `owner_all_<bucket>` storage policies for `project_images`, `image_variants`, `avatars`, `cv`, `projects`, `certifications`, `documents`. |

**Owner binding runbook (production, after `supabase db push`).** Portfolio #1 is created with the `legacy-owner` placeholder; bind it to the real Clerk user id in the Supabase SQL editor:

```sql
UPDATE portfolios SET owner_user_id = '<real-clerk-user-id>' WHERE slug = 'mustafa';
```

Until this runs, no authenticated user matches `portfolios.owner_user_id`, so the legacy content is only readable via the public/published paths — admin writes against it will fail by design.

**RLS test matrix.** `lib/db/src/rls-multitenant.test.ts` (run in CI's `db-migrations` job) asserts owner isolation, anon publish-gating, guarded public inserts, and storage prefixing against the freshly-migrated local DB.

## Phase 2 migrations (068-070) — RLS is the only boundary

Phase 2 of the 2026-09-16 multi-tenancy design retires the app-layer tenancy (`user_id` scoping, `admin_all_*` policies, GUC admin fallback) and gates storage/AI delivery on publication. Every migration in this range is idempotent and safe to replay via `supabase db reset`.

| Migration                          | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `068_messages_spam_guard_rls.sql`  | Rebuilds the 044 contact spam-guard trigger function as SECURITY DEFINER (locked `search_path`), so the per-email rate limit still counts prior rows when the insert arrives through the anon client (anon has INSERT-only on `messages`, no SELECT).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `069_retire_app_layer_tenancy.sql` | Drops `user_id` from the 21 tenanted tables (`theme_presets` keeps its column per spec §4.3; `users` keeps its own columns); drops all 28 audited `admin_all_*` policies plus the legacy unrestricted public reads from 042/043 (singleton reads, visible-section reads, section-variant reads); rebuilds `is_admin()` WITHOUT the `app.allow_guc_admin_fallback` path; recreates `public_insert_analytics` requiring a published `portfolio_id` (NULL branch removed); adds authenticated owner-scoped CRUD policies on `theme_presets` (JWT `sub` → `users.clerk_id` → `user_id`) to replace the dropped `admin_all_theme_presets`; verification blocks raise if any `admin_all_*` remains or any tenant table still references `is_admin()`. |
| `070_storage_publication.sql`      | Adds `is_published_storage_object(name)` (first path segment is a published portfolio id; no UUID casts, malformed names fail closed); flips `cv`, `project_images`, `projects`, `certifications`, `avatars` buckets to private; replaces bucket-wide public SELECT policies with publication-gated ones (`public_download_cv`, `published_images_read`). The API serves images through the publication/ownership-checked proxy `GET /api/v1/images/serve/:id` and `/api/v1/images/serve/:bucket/*path` (anon for published portfolios, owner JWT for draft previews); frontends resolve every image URL through that proxy (`artifacts/portfolio/src/lib/image-url.ts`).                                                                       |

**Service-role allowlist (production).** After Phase 2, the service-role key is used ONLY by: `routes/admin/users.ts`, `routes/admin/arabic-status.ts`, `routes/admin/audit.ts`, `lib/ai/*` (spam pipeline + portfolio-scoped site context), `lib/user-sync.ts`, and the `x-admin-key` system fallback in `middleware/requestClient.ts` (no Clerk token → service-role by design). Every other route resolves its client from the request (`req.supabase`, JWT-scoped or anon).

**Production runbook additions (after `supabase db push`).**

1. Supabase dashboard → Authentication → Third-Party Auth → enable Clerk with the production Clerk domain (read `CLERK_ISSUER` from the root `.env`; local `supabase/config.toml` already carries the `[auth.third_party.clerk]` block). Without this, Clerk JWTs are rejected and all authenticated CMS writes fail.
2. Set `SUPABASE_ANON_KEY` in the api-server Vercel env (new required var since Phase 2 — the API builds anon/JWT-scoped clients at request time).
3. Keep the Phase 1 owner-binding step (`UPDATE portfolios SET owner_user_id = ... WHERE slug = 'mustafa'`) — still required before any CMS write works.
4. Admin JWT template: the admin app requests the `admin` template (`VITE_CLERK_JWT_TEMPLATE`, `ClerkAuthBridge.tsx:72`; default `"admin"`). For the Supabase integration the custom template is NOT required (Supabase accepts the raw Clerk session token; `sub` is the Clerk user id) — but keep the template name in sync if the Clerk dashboard defines one.
5. Image delivery cutover: buckets are now private. The API proxy is the only delivery path — verify `GET /api/v1/images/serve/...` serves published images anonymously and draft previews with an owner token before promoting to production. Legacy `/storage/v1/object/public/...` URLs stop working.

**Phase 2 RLS test matrix.** `rls-multitenant.test.ts` (isolation), `rls-retirement.test.ts` (069: no `user_id` columns, no `admin_all_*`, no GUC fallback), `rls-publication.test.ts` (draft/published anon + foreign-owner reads for every tenant table), `rls-theme-presets.test.ts` (owner CRUD + 10-preset cap), `rls-storage-delivery.test.ts` (owner draft preview, anon published-only, malformed prefixes, 067 metadata-rename blocker), `messages-spam-rls.test.ts` (anon rate-limit trigger). All run in CI's `db-migrations` job against the freshly-migrated local DB.
