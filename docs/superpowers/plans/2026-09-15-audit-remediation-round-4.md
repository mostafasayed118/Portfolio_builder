# Audit Remediation Round 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all actionable defects from the 5-dimension audit (2026-09-15): analytics aggregation debt, security hardening gaps, duplicated frontend infra, and performance cliffs.

**Architecture:** Five independent work packages (DB/analytics, API security + images contract, shared frontend infra, frontend perf/quality, docs) executed by parallel subagents, followed by a controller-run verification gate (typecheck, lint, full test suite).

**Tech Stack:** TypeScript 5.9, React 19, Express, Supabase/Postgres (SQL migrations + RPC), Vitest, ESLint flat config, pnpm workspace.

**Spec:** The 2026-09-15 audit report (conversation record) — findings with file:line references are reproduced in each task below.

## Global Constraints (apply to EVERY task)

- **NO git commits.** The controller commits nothing unless the user asks. Do not run `git add`/`git commit`. The repo has intentional uncommitted work — leave it.
- TDD mandatory: write the failing test first, watch it fail, implement minimal code, watch it pass, then refactor. New logic must survive a mutation test (introduce a bug, watch tests fail).
- ESLint (warnings fatal, run with `--max-warnings=0`): files ≤250 lines (code-only count), no `any`, no `as <Type>` assertions in production code (type guards instead), no non-null assertions, catch clauses use `unknown`.
- API responses use the envelope: `{ success: true, data }` / `{ success: false, message, errors? }`.
- DB access goes through `lib/db` modules using `queryOrThrow` with `[table.operation]` context prefixes. Never inline `.from(...)` in routes.
- Never mock first-party modules with `vi.mock` in tests; stub network boundaries via `vi.stubGlobal("fetch", ...)` or MSW. Assert exact error messages, not regexes.
- Windows/PowerShell 5.1 environment: run vitest per-project (`pnpm vitest run --project <name>`) to avoid tinypool IPC crashes. Do not pipe env values through stdin.
- Migration files: number from the next free slot (check `supabase/migrations` for the highest prefix — expected 060+). Rationale comment header at top of each migration, matching existing style.
- Only modify files listed in your task. If a listed file doesn't exist or reality diverges from this plan, adapt minimally and report the divergence in your summary.

---

### Task A: Postgres-side analytics aggregation + retention + logging

**Files:**

- Create: `supabase/migrations/060_analytics_composite_index.sql` (verify next free number first)
- Create: `supabase/migrations/061_analytics_stats_rpc.sql` (number continues from 060)
- Modify: `lib/db/src/analytics.ts` (fetchEventStats :51-67, fetchMessageStats :107-123, aggregateByDate :149-164 vs fetchMessageStats duplication :142-178, console.error :58,68,99, magic `slice(0, 10)` :82,104)
- Modify: `lib/db/src/analytics.test.ts`
- Modify: `lib/db/src/index.ts` only if export surface changes (keep exported signatures identical)

**Interfaces:**

- Produces: `fetchEventStats(days: number)` and `fetchMessageStats(...)` keep their exact current signatures and return shapes (callers in `artifacts/api-server/src/routes/admin/analytics.ts` must not change). Implementation moves from JS aggregation to SQL RPC.

**Behavior:**

1. Migration A1: composite partial index `CREATE INDEX IF NOT EXISTS analytics_events_type_created_at_idx ON analytics_events (type, created_at DESC);`
2. Migration A2: SQL RPC `public.analytics_daily_stats(p_since timestamptz, p_source text)` returning jsonb `{ daily: [{day, type, count}...], top: [{key, count}...] }` — mirror EXACTLY the semantics of today's JS aggregation in `analytics.ts` (read it first). Critical: current JS buckets by `created_at.slice(0, 10)` (UTC date) — SQL must use `(created_at AT TIME ZONE 'utc')::date`, not `date_trunc` in server TZ. For message stats reuse the same pattern (a second function or a `p_source` switch) — collapse the `fetchMessageStats`/`aggregateByDate` duplication into one shared path. Top-N: replace magic `slice(0, 10)` with a named const `TOP_N = 10`.
3. `pg_cron`: schedule `cleanup_old_analytics()` daily. Guard everything: `BEGIN CREATE EXTENSION IF NOT EXISTS pg_cron; EXCEPTION WHEN OTHERS THEN NULL; END;` then only `PERFORM cron.schedule('cleanup-old-analytics', '0 3 * * *', 'SELECT public.cleanup_old_analytics()')` when `EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron')` and no existing cron.job with that name. Local/CI Supabase without pg_cron must still reset cleanly.
4. `lib/db/src/analytics.ts`: fetchEventStats/fetchMessageStats call the RPC via the injected `supabase.rpc(...)` (single round trip each), map rows to the existing return shape. Replace the three raw `console.error` calls with `@workspace/logging` (it is already a dependency of lib/db — verify import path from a sibling module). Keep `trackEvent`'s documented fire-and-forget posture.
5. Tests (TDD): first update `analytics.test.ts` to assert the new call pattern (rpc invoked with UTC-day semantics; results mapped to legacy shape; top-N = 10; logging not console). Watch fail → implement → watch pass. If the db vitest project requires a running local Supabase (`supabase start`) and it is unavailable, still make unit-level tests pass with the existing test harness pattern used in `analytics.test.ts` today, and report the limitation.

**Verification:** `pnpm vitest run --project db` green; `pnpm lint` (scoped to lib/db) clean.

---

### Task B: API security hardening + unified images contract

**Files:**

- Modify: `artifacts/api-server/src/middleware/adminAuth.ts:53-68` (email claim trust)
- Modify: `artifacts/api-server/src/routes/images.ts` (:36-46 allowlist, :198-218 reorder, :221-239 metadata)
- Modify: `artifacts/api-server/src/lib/env.ts:259-281` (REDIS_URL in production)
- Modify: `artifacts/api-server/src/routes/public/contact.ts:129-139` (inline insert)
- Modify: `lib/db/src/utils.ts:2-7` (sanitizeUrl) + `lib/db/src/utils.test.ts` (if none, create)
- Modify: `lib/api-zod/src/images.ts` + `lib/api-zod/src/index.ts` (single source of truth for entity types)
- Modify: `artifacts/admin/src/components/ImageUploader.tsx:26` (derive union from shared const)
- Modify: `artifacts/admin/src/components/UploadedImagesGrid.tsx:16` (add `type="button"`)
- Modify: `artifacts/admin/package.json` (remove stale `@workspace/db` dep; add `@workspace/api-zod` if not present)
- Tests: `artifacts/api-server/src/test/middleware/adminAuth.test.ts` (extend deny paths), `artifacts/api-server/src/test/routes/images.test.ts` (extend), `lib/api-zod/src/images.test.ts` (extend)

**Behavior:**

1. **adminAuth email claim:** allowlist decision must use the server-fetched Clerk user email (`clerkClient.users.getUser(clerkId)` → primary/verified email, already cached 60s) as the primary source. The inline JWT `email`/`emailAddress` claim may only be used as a fast-path hint to skip a fetch when it matches, but if the fetch path is taken or claim is absent, deny unless server-fetched email is allowlisted. Never grant based on claim alone when `getUser` succeeds with a different/secondary email. Fails closed (401) when neither is resolvable. Preserve existing 60s cache and role logic.
2. **images metadata:** `GET /:id/metadata` requires `requireAdmin` (same gate as siblings in that router).
3. **images reorder:** update path must verify each target image belongs to the requesting user (same ownership check style as image delete; superadmin exempt). Foreign ID → fail-closed 404 envelope, atomic behavior preserved or batched safely.
4. **entity-type allowlist:** `lib/api-zod/src/images.ts` becomes the single source: export `IMAGE_ENTITY_TYPES` (const array) and `imageEntityTypeSchema = z.enum(IMAGE_ENTITY_TYPES)`. `routes/images.ts:36-46` replaces its local `ALLOWED_ENTITY_TYPES` with the shared schema/const. `ImageUploader.tsx:26` union derives: `type ImageEntityType = (typeof IMAGE_ENTITY_TYPES)[number]` — import from `@workspace/api-zod` (add dep to admin/package.json if missing). The three copies must converge with no behavior change for currently-valid types.
5. **sanitizeUrl** (`lib/db/src/utils.ts`): keep existing semantics (empty/`#` → null, trim). Add: if the value has a URI scheme (`/^[a-zA-Z][a-zA-Z0-9+.-]*:/`) it must match `/^(https?|mailto|tel):/i`, else return null. Root-relative (`/...`) and scheme-less values pass through unchanged. Check existing tests first; preserve any currently-passing semantics except for dangerous schemes.
6. **REDIS_URL:** in `env.ts`, production without `REDIS_URL` must `process.exit(1)` with a clear message naming the var and why (rate-limit dilution across serverless instances). Dev/test unaffected. Follow the existing ADMIN_API_KEY validation pattern (:259-274). Add/extend env tests.
7. **contact.ts:** replace the inline `getSupabaseClient().from("messages").insert(...)` with the corresponding `lib/db` messages module function (find or add `createMessage` using `queryOrThrow` with `[messages.insert]` prefix); keep envelope + `safeErrorMessage` behavior identical.
8. **UploadedImagesGrid.tsx:16:** remove button gets `type="button"`.

**TDD:** for each of 1-7, write the failing test first (adminAuth: claim-email vs fetched-email mismatch denies; metadata: 401 without admin; reorder: foreign image → 404; sanitizeUrl: `javascript:alert(1)`/`data:text/html` → null, `https://`/`mailto:`/`/path` pass; env: production+missing REDIS_URL exits; contact: db module called instead of inline client; zod: exact schema error messages). Watch fail → implement → watch pass.

**Verification:** `pnpm vitest run --project api-server --project api-zod --project db` green; lint clean on touched packages.

---

### Task C: Frontend infra de-duplication (csp/csrf/env/logger)

**Files:**

- Create: `lib/app-infra/` package (mirror structure of `lib/logging`: package.json, tsconfig.json, src/)
- Modify: `artifacts/portfolio/src/lib/{csp,csrf,env,logger}.ts` and `artifacts/admin/src/lib/{csp,csrf,env,logger}.ts` (+ their co-located tests)
- Modify: `lib/supabase/src/index.ts` / package exports — remove the dead `./server` subpath export (`serverSupabaseClient.ts` has zero consumers; delete the export entry, keep or delete the file per what the export map allows)
- Modify: root `package.json` (add `lib/app-infra` to `typecheck:libs` list) and root `vitest.config.ts` (add `app-infra` project mirroring the `logging` project config)

**Behavior:**

1. FIRST diff each pair (`portfolio/src/lib/X.ts` vs `admin/src/lib/X.ts`): logger.ts is byte-identical; csp/csrf/env have diverged. For each file decide: identical core → extract; intentional per-app divergence (e.g., app-specific env keys, different CSP directives for different apps) → extract only the shared logic and keep app-specific parts local with a comment explaining why they diverge. If a file is entirely app-specific (likely parts of env.ts), leave it local and say so in the summary.
2. `lib/app-infra` exports the extracted modules with subpath exports (e.g. `@workspace/app-infra/csp`). App files become thin re-export shims (`export * from '@workspace/app-infra/csp'`) so no downstream imports change. Tests: keep behavior tests next to the shared implementation in `lib/app-infra/src/*.test.ts`; app-side test files may re-export/point to shared tests or keep app-specific cases.
3. Register the new package: workspace `pnpm-workspace.yaml` already covers `lib/*` (verify), tsconfig project references like siblings, root `typecheck:libs` entry, vitest `app-infra` project.
4. Remove dead `lib/supabase` `./server` export (verify zero imports with grep before deleting).

**Verification:** `pnpm vitest run --project app-infra --project logging` green; `pnpm typecheck` (or at least `tsc -p lib/app-infra --noEmit` + both apps' typecheck) green; grep proves portfolio/admin import via shims only.

---

### Task D: Frontend performance + quality fixes

**Files:**

- Modify: `artifacts/admin/src/lib/use-entity-query.ts:94-114` (useAllMessages uncapped loop)
- Modify: `lib/ui/package.json` (sideEffects) + `lib/ui/src/index.ts` (dead exports: Accordion, HoverCard, InputOTP*, Resizable*, ToggleGroup\*, toast `reducer`)
- Modify: `artifacts/api-server/src/routes/public/posts.ts:16-29` (Cache-Control)
- Modify: `artifacts/api-server/src/routes/cv.ts:56` (Cache-Control)
- Modify: `lib/db/src/images.ts:19-28` (listEntityImages limit)
- Modify: `artifacts/portfolio/src/App.tsx:16-17` (lazy ChatWidget/WhatsAppFloat)
- Modify: `artifacts/portfolio/src/components/RootErrorBoundary.tsx:20` (DEV-gate console.error)
- Modify: `artifacts/admin/src/features/audit/AuditEntryCard.tsx:5-12` (use format-date)
- Modify: `artifacts/admin/src/features/settings/hooks/useThemePresets.ts:55,174` (single date helper)
- Create: `artifacts/portfolio/src/features/blog/utils/format.ts` (from `artifacts/portfolio/src/features/blog/types.ts:8-19`; types.ts keeps types only; update imports + feature barrel)

**Behavior:**

1. `useAllMessages`: hard cap via named const `MAX_MESSAGE_PAGES = 10` (i.e. 2,000 rows at 200/page); stop fetching at the cap, log one warning, keep already-loaded rows usable. TDD: stub fetch to return >cap pages, assert fetch count ≤ cap.
2. `lib/ui/package.json`: add `"sideEffects": false` — but FIRST check for CSS imports (`*.css`) in lib/ui source; if any exist use `"sideEffects": ["**/*.css"]`.
3. Remove the listed dead exports from `lib/ui/src/index.ts` only (component files stay on disk). Grep both artifacts to confirm zero usages first; if a "dead" export is actually used somewhere, leave it and report.
4. Cache-Control on public GETs only: `res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')` in posts list/detail and cv GET. Do NOT set on admin/authed routes.
5. `listEntityImages`: add `.limit(MAX_LIST_ROWS)` (import from query.ts) — verify no test asserts unbounded behavior.
6. Lazy widgets in App.tsx following the file's existing lazy-route pattern; `Suspense` fallback `null`.
7. RootErrorBoundary: gate the console.error with `import.meta.env.DEV` matching the admin boundary pattern.
8. AuditEntryCard: delete private `formatTime`, use `formatDateTime` from `@/lib/format-date`; ensure rendered output unchanged (update test expectations only if format differs, keeping exact-string assertions).
9. useThemePresets: extract one local `formatSavedDate(date)` helper used by both call sites.
10. blog `format.ts`: move `formatPostDate` + `getReadingTime` (magic `200` → named `WORDS_PER_MINUTE = 200`); types.ts keeps only types; update all importers and the feature barrel.

**Verification:** `pnpm vitest run --project admin --project portfolio --project db` green; lint clean.

---

### Task E: Documentation debt

**Files:**

- Create: `README.md` in each of the 10 lib packages (`lib/{api-client-react,api-spec,api-zod,auth,db,logging,supabase,test-utils,ui,validation}/README.md`)
- Modify: root `README.md` (~line 60: `lib/validation` is a custom rule-based validation layer, NOT Zod — Zod schemas live in `lib/api-zod`; also fix the navbar `src/features/` claim — navbar lives in `src/components/navbar/`)

**Behavior:** Each lib README ≤30 lines: one-paragraph purpose, public API bullets (main exports), layer position (which apps consume it), one usage snippet. No invented APIs — read each package's `src/index.ts` first.

**Verification:** files exist, claims match actual exports.

---

### Controller verification gate (after Tasks A-E)

- `pnpm run typecheck`
- `pnpm lint`
- `pnpm test` (if tinypool crashes on Windows: run per-project sequentially: db, api-zod, validation, logging, api-server, admin, portfolio, scripts)
- Fix fallout inline; re-run until green.
