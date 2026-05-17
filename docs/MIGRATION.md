# Convex → Supabase Migration

Completed Phase 3 — Full Migration. All Convex code removed.

## What Changed

| Area | Before (Convex) | After (Supabase) |
|------|----------------|-------------------|
| Database | Convex (serverless) | Supabase PostgreSQL |
| Data fetching | `useQuery(api.module.fn)` | `useQuery({ queryKey, queryFn })` + `@tanstack/react-query` |
| Data mutations | `useMutation(api.module.fn)` | Direct async function calls |
| File storage | Replit Object Storage | Supabase Storage bucket `cv` |
| Auth | Clerk + Convex JWT | Clerk only (admin), no auth (portfolio) |
| RLS | N/A (Convex handled auth) | `is_admin()` + `public_read` policies |
| Admin mutations | Convex server functions | Supabase service role key (bypasses RLS) |
| Contact form | Convex mutation | Direct Supabase INSERT (public policy) |
| CV download | Convex query → Replit Object Storage | Express proxy → Supabase Storage |
| Server client | `CONVEX_URL/api/query` fetch | `@supabase/supabase-js` service client |
| Deleted | `convex/` directory, `convex.json` | — |
| Deleted | `OptionalConvexProvider`, `ConvexProviderWithClerk` | — |
| Deleted | `ConvexThemeSync`, `useConvexTheme` | — |
| Deleted | `VITE_CONVEX_URL`, `CONVEX_DEPLOY_KEY`, `CLERK_JWT_ISSUER_DOMAIN` | — |
| Deleted | Replit Object Storage (`objectStorage.ts`, `objectAcl.ts`) | — |
| Deleted | Storage routes (`/api/storage/*`) | — |
| Deleted | Drizzle ORM schema | — |

## Files Created

| File | Purpose |
|------|---------|
| `lib/supabase/src/client.ts` | Browser Supabase client (anon key) |
| `lib/supabase/src/server.ts` | Server Supabase client (service role) |
| `lib/supabase/src/admin.ts` | Admin Supabase client (service role) |
| `lib/supabase/src/types.ts` | Full Database type definitions (18 tables) |
| `lib/db/src/*.ts` (14 files) | Data access layer |
| `supabase/migrations/001_init.sql` | Full schema + seed data |
| `supabase/migrations/002_fix_rls_policies.sql` | RLS policy fix |
| `docs/ARCHITECTURE.md` | Architecture docs |
| `docs/SUPABASE_SCHEMA.md` | Schema reference |
| `docs/DATA_ACCESS.md` | DAL function reference |

## Bugs Fixed (21 total)

During the migration audit, 21 bugs were identified and fixed:
- 4 RLS/data access issues
- 2 API server runtime errors
- 6 admin page data integrity bugs
- 3 portfolio component rendering bugs
- 2 test infrastructure issues
- 2 stale configuration/documentation issues
- 2 defensive type-safety improvements

## Rollback

To revert to Convex:
1. Restore `convex/` directory from git history
2. Restore deleted env vars
3. Revert `lib/db/`, `lib/supabase/` to pre-migration state
4. Reinstall `convex` package
