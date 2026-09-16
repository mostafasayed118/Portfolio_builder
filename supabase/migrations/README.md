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
