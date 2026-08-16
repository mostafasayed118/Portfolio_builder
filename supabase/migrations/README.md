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
supabase link --project-ref txnuvpxhghxiwynhtbvo
```

The ref for the live project is `txnuvpxhghxiwynhtbvo` (Portfolio_builder, West EU Ireland). Find all refs with `supabase projects list`; the linked project is marked with `●`. Linking only writes to the gitignored `supabase/.temp` directory.

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
curl -s "https://txnuvpxhghxiwynhtbvo.supabase.co/rest/v1/hero_content?select=*&limit=1" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

### Notes

- **A failing migration aborts the whole push and rolls back.** This is by design for guard migrations: `052_guard_placeholder_social_links.sql` intentionally raises if any published `hero_content` / `contact_info` row still holds a placeholder social handle, so a push can never silently ship broken links.
- **Commit migration files to git.** `db push` records a migration on the remote as soon as it's applied, but the repo stays the source of truth — commit the new file so local and remote stay in sync.
- **Token hygiene.** Rotate an `sbp_` token in the Supabase dashboard if it's ever exposed (e.g., pasted into a chat transcript).
- If you do have the DB password, the classic routes still work: set `SUPABASE_DB_PASSWORD` or pass `--db-url postgresql://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`.
