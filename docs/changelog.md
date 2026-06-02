# Changelog

All notable changes to Portfolio-Fixer are documented here.

---

## 2026-06-01 (session 2) — Self-training batch plan

12-task reliability / hygiene sweep executed against the codebase. 9 of 12 completed (3 cancelled as false alarms or out-of-scope).

### Fixed
- **API key leak**: `opencode.json` had a hardcoded TestSprite API key in plaintext. Replaced with `{env:TESTSPRITE_API_KEY}` substitution and documented the env var in `.env.example`. **The key should be rotated** — treat as compromised.
- **Silent localhost fallbacks**: 4 production code paths silently used `http://localhost:3001` when `VITE_API_URL` was missing. Replaced with a `getApiUrl()` helper in each app's `lib/env.ts` that returns `""` in production (forcing a visible error) and warns once in dev.
- **HeroSection CV download**: When the API URL is missing, the button now renders as visually disabled with an explanatory tooltip instead of silently being a self-page link.
- **syncUserFromClerk retry**: Added 3-attempt exponential backoff (100→200→400ms ±30% jitter) for all 3 Supabase calls. Only retries on transient errors; 4xx throws immediately.
- **TypeScript `as unknown as` casts**: Refactored `use-mouse-tilt.ts` (made handlers optional in return type) and `useFormValidation.ts` (changed `as unknown as Partial<T>` to `as T` with explicit intent). The unsafe double-cast pattern is gone from production code.
- **HeroTypewriter empty-state**: When `hero.roles` is empty, the typewriter now shows a localized fallback ("Data Engineer" / "مهندس بيانات") instead of a blinking empty cursor.
- **Realtime subscriptions**: Reduced from 12 tables to 3 (hero_content, projects, site_settings). The other 9 tables can be refreshed via the "Force Refetch All" button in SyncDebug.
- **Polling**: Removed the 5-minute background `refetchInterval`. Increased `staleTime` to 30 minutes; sections refresh on remount or window focus.
- **Silent admin logger**: Admin's `lib/logger.ts` was emitting nothing in production because every log call was wrapped in `if (import.meta.env.DEV)`. Both apps now re-export `@workspace/logging` with Vite-aware env injection. Production logs go to stdout as JSON.

### Added
- `src/lib/retry.ts` (api-server) — `withRetry()` + `isTransientError()` with 14 unit tests
- `src/test/lib/retry.test.ts` — covers all retry edge cases
- `src/test/ProjectDetail.smoke.test.tsx` (portfolio) — 3 smoke tests for the dynamic route page

### Changed
- `validateForm` (lib/validation) — reverted signature after a brief experiment; the cleaner cast happens in the consumer
- `artifacts/portfolio/vite.config.ts` — briefly tried adding a `vendor-fallback-data` manual chunk, reverted because the barrel re-export pattern meant the data was already inlined (splitting just added a duplicate)
- `TranslationKeys.hero` — added `fallbackRole` field (en + ar) for the HeroSection empty-state

### Cancelled (false alarms from the exploration phase)
- TASK-001 (Cyrillic `EXPERIENCE` in `data/experience.ts`) — verified the bytes are Latin E (0x45), not Cyrillic Е (0x0415). PowerShell rendering was misleading.
- TASK-002 (Unguarded `console.warn` in `auth-token.ts:65`) — verified the line is inside `if (!retryToken && import.meta.env.DEV) { ... }`. The `as unknown as` indentation was misleading.
- TASK-007 (Delete dead `admin/src/lib/api-client.ts`) — 20 consumers; the generated React Query client only covers 5 of 48 endpoints. Migration would require expanding the OpenAPI spec to all 48 endpoints first — a separate L-sized task. Deferred.
- TASK-010 (Add `vendor-fallback-data` manual chunk) — the barrel re-exports in `data/portfolio.ts` mean the data is already inlined in the main chunk. Splitting just duplicated the bytes. Reverted.
- TASK-012 (Add portfolio SyncDebug) — already exists at `artifacts/portfolio/src/components/SyncDebug.tsx`, mounted on `Home.tsx`.
- TASK-013 (Add a11y to ImageUploader drop zone) — already has `role="button"`, `tabIndex={0}`, and `aria-label` at lines 161–163.

### Test count
- api-server: 236 → 250 (+14 retry tests)
- portfolio: 120 → 123 (+3 ProjectDetail smoke tests)
- admin: 12 → 12 (no change; pre-existing `react/jsx-dev-runtime` resolution issue in `lib/ui` still blocks 27 page-level tests — out of scope for this batch)

---

## 2026-06-01 (session 1) — API server reliability batch plan

12 reliability / hygiene tasks landed in one sweep. **236/236 api-server tests passing** (was 222).

### Fixed
- Moved `getSupabaseClient()` out of module import time in 8 admin routes — env errors now surface inside handlers with a clear message, not as boot crash
- `/healthz` now uses `.maybeSingle()` — empty `site_settings` no longer marks DB unhealthy
- All `PUT /:id` and `DELETE /:id` collection routes now `.select("id")` and return **404** when the row doesn't exist (or isn't owned by the caller) — was previously returning 200 for `DELETE` and silently 200 for `PUT` on 0 rows
- Public `POST /api/v1/contact` now has honeypot field, 2-second time-trap, input normalization (trim + lowercase email + strip control chars), and structured abuse logging
- Rate limiter 429 messages now use the same `{ success: false, message }` shape as the rest of the API
- `errorHandler` and `logSupabaseError` capture route context (`route`, `method`, `ip`, `requestId`, `userId`, `targetTable`); never the request body (PII)

### Added
- `src/lib/env.ts` — centralised, typed env validation with startup `process.exit(1)` for missing required vars and a `_setOverride()` test hook
- `src/lib/route-helpers.ts` — `parsePagination`, `resolveTargetUserId`, `logSupabaseError`, `runCollectionQuery` (one-call GET handler for collection routes)
- `src/test/routes/collection-404.test.ts` — 14 regression tests covering the 404-on-missing-row contract for every collection route
- `apiResponse.forbidden()`, `unauthorized()`, `rateLimited()` helpers
- `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`, `pnpm verify` scripts in `artifacts/api-server/package.json`
- `artifacts/api-server/README.md` — API server docs (quickstart, env, architecture, conventions, test instructions, recent fixes)

### Changed
- `singletonUpsert` `any` cast is now confined to a local `_call()` helper inside the function, not the whole client
- 5 collection GET handlers (skills, projects, experience, certifications, messages) refactored to use `runCollectionQuery` — boilerplate reduced from ~25 lines to one
- `adminAuth` debug logging now gated behind `logger.debug` (off at default `info` level)
- Documented the service-role / user-scoping architecture in `artifacts/api-server/README.md` and `BACKEND_AUDIT_REPORT.md` (item C2 — accepted risk)

### Updated docs
- `docs/api.md` — contact form schema (honeypot + time-trap), 404 error column on every collection route
- `docs/testing.md` — 31 API test files, 236 tests, new `verify` script
- `docs/setup.md` — env validation behavior, contact 403 troubleshooting
- `BACKEND_AUDIT_REPORT.md` — mark H2, H4, M3, M6, L3, L5 resolved
- `TECHNICAL_DEBT_REPORT.md` — overall score stays 0/10, new fixes table
- `MEMORY_BANK.md` — new `lib` modules, env access pattern, 2026-06-01 resolved issues

---

## v1.1.1 — 2026-05-24

### Fixed
- Remove hardcoded credentials from codebase
- Update API URLs to use `VITE_API_URL` env var
- Pin `pnpm@9.15.0` via `packageManager` field for Vercel registry compatibility
- Add missing radix-ui packages to pnpm catalog for Vercel deployment

## 2026-05-23

### Changed
- Consolidated MEMORY_BANK.md into single authoritative source of truth (13 sections, verified against code)

## 2026-05-22

### Fixed
- Hardcoded credentials removed from codebase
- JWT bypass fixed — now uses Clerk's `verifyToken()` from `@clerk/backend`
- `useQuery<any>` replaced with typed interfaces in HeroEditor + AboutEditor
- HeroManager.tsx deleted, single HeroEditor code path
- UI components consolidated into `lib/ui` shared package
- Messages API now has server-side pagination (limit/offset/range/hasMore)

### Changed
- Debt score reduced from 6.8/10 to 3.5/10 (49% reduction)

## 2026-05-18

### Fixed
- Input validation (Zod schemas) added to all 8 admin routes
- `console.error` changed to `console.warn` in portfolio ContactSection and admin api-client
- UX audit: 29 of 41 issues fixed (all critical + medium)
- Created StatusBadge, ImageWithFallback, useBeforeUnload, error-messages utilities

### Added
- DEPLOYMENT.md with Vercel/Render/Supabase deploy guide
- CONTRIBUTING.md with dev setup and PR guidelines
- LICENSE file (MIT)

## 2026-05-16

### Added
- MEMORY_BANK.md with full project documentation
- TECHNICAL_DEBT_REPORT.md
- MEMORY_BANK_AUDIT.md (17 formatting issues fixed)

## 2026-05-12

### Fixed
- 21 bugs identified and fixed during Convex→Supabase migration audit
- RLS/data access issues (4)
- API server runtime errors (2)
- Admin page data integrity bugs (6)
- Portfolio component rendering bugs (3)
- Test infrastructure issues (2)
- Stale configuration/documentation (2)
- Defensive type-safety improvements (2)

### Added
- Migration 030: soft-delete support with `deleted_at` columns
- Migration 022-025: image RLS, duplicate trigger cleanup, analytics cleanup, FK constraints

## v1.0 — 2026-05-08

### Added
- Complete Convex → Supabase migration
- 18 database tables with RLS policies
- Supabase Storage for CV PDF
- Express 5 API server with admin CRUD routes
- Clerk authentication for admin CMS
- 4-layer validation system (DB constraints, API middleware, RLS, frontend)
- Portfolio SPA with 7 sections (hero, about, skills, projects, experience, certifications, contact)
- Admin CMS with 13 management pages
- Dark/light theme with HSL color system
- Bilingual support (EN/AR) with RTL
- 78 unit test files across 5 test projects

### Removed
- Convex backend (`convex/` directory)
- Replit Object Storage
- Drizzle ORM schema
- `OptionalConvexProvider`, `ConvexProviderWithClerk`
- `ConvexThemeSync`, `useConvexTheme`
- `VITE_CONVEX_URL`, `CONVEX_DEPLOY_KEY`, `CLERK_JWT_ISSUER_DOMAIN`
