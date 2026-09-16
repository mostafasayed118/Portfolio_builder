# Audit Remediation Round 5 Implementation Plan

> **STATUS (2026-09-16): COMPLETE — ALL TASKS EXECUTED, FULL GATE GREEN.** Subagent credits ran out after Task 6's partial wave; all remaining work was executed inline by the controller. Shipped: Tasks 1, 2, 5, 7 (subagents, all green); Task 6 (subagent A+J + inline completion); Task 3 (inline — section-settings via lib/db with matched-count contract, collection.ts `.returns<>()` fix, singleton-upsert duplicate deleted + seed-data redirected, ESLint ban on `@supabase/supabase-js`/`@workspace/supabase` in routes/**); Task 4 (inline — mark-all-read `validateQueryUserId` injection guard with TDD red/green, admin POST/PUT posts through `createPost`/`getPostPublishState`, images.ts inline blocks through five new lib/db images fns; the messages lib/helpers were deliberately KEPT in api-server — they are HTTP-shaped and outside route files, satisfying the new ESLint boundary). **Final inline pass:** the last two `as never` casts eliminated — `route-helpers.updateByIdAndUser` and `collection-router` POST now go through lib/db `collectionMutate` (allowlist-enforced; 23505→409 race mapping preserved via `isUniqueViolationError` on the enriched error); `posts.ts` redundant patch cast removed; `view-spec.applyViewSpec` rewritten with a structural `FilterChain` generic (five inline casts gone, behavior identical); new lib/db `collection.test.ts` (11 tests) pins `collectionQuery`/`collectionMutate` contracts and `COLLECTION_TABLES` allowlist; `./collection` subpath exported from lib/db. **Final gate: typecheck + lint clean; vitest across all projects 215 files / 1750 tests, 100% passed (admin full parallel run green — prior contention flakes did not reproduce).\*\* Not committed (per controller policy).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every remaining defect from the 2026-09-15 five-dimension audit (post-round-4 delta): the lib/db bypass in admin routes, the dual validation system, payload/performance cliffs, the security hardening leftovers, and frontend quality debt.

**Architecture:** Seven file-disjoint work packages (DB perf, API security misc, settings-route migration, content/messages-route migration, validation Zod rebuild, frontend quality, docs) executed by parallel subagents, followed by a controller-run verification gate (typecheck, lint, per-project test suite).

**Tech Stack:** TypeScript 5.9, React 19, Express 5, Supabase/Postgres (SQL migrations + RPC), Vitest, ESLint flat config, pnpm workspace.

**Spec:** The 2026-09-15 five-dimension audit report (this session's record). Findings with file:line references are reproduced in each task below.

## Global Constraints (apply to EVERY task)

- **NO git commits.** The controller commits nothing unless the user asks. Do not run `git add`/`git commit`. The repo has intentional uncommitted work — leave it.
- TDD mandatory: write the failing test first, watch it fail, implement minimal code, watch it pass, then refactor. New logic must survive a mutation test (introduce a bug, watch tests fail).
- ESLint (warnings fatal, run with `--max-warnings=0`): files ≤250 lines (code-only count), no `any`, no `as <Type>` assertions in production code (use type guards / Zod parses), no non-null assertions, catch clauses use `unknown`.
- API responses use the envelope: `{ success: true, data }` / `{ success: false, message, errors? }`.
- DB access goes through `lib/db` modules using `queryOrThrow` with `[table.operation]` context prefixes. Routes must not call `.from(...)` inline.
- Never mock first-party modules with `vi.mock` in tests; stub network boundaries via `vi.stubGlobal("fetch", ...)` or MSW. Assert exact error messages, not regexes.
- Windows/PowerShell 5.1: run vitest per-project (`pnpm vitest run --project <name>`) to avoid tinypool IPC crashes.
- Migration files: **062 is reserved for Task 2, 063 for Task 1.** Check `supabase/migrations` for the actual highest prefix before creating; if it differs, take the next two free numbers in this order (Task 2 first) and report. Rationale comment header at top, matching existing style.
- Only modify files listed in your task. If a listed file doesn't exist or reality diverges, adapt minimally and report the divergence in your summary.
- **File-ownership guard (parallel safety):** only Task 3 may edit `lib/db/package.json`, `lib/db/src/index.ts`, and `eslint.config.js`; only Task 1 may edit `lib/supabase/src/types.ts`. Tasks 1, 2, 5, 6, 7 must NOT touch those files even if it seems convenient.

---

### Task 1: lib/db performance fixes (posts payload, covers limit, skills visibility, reorder RPC)

**Files:**

- Create: `supabase/migrations/063_blog_reading_minutes.sql`
- Modify: `lib/db/src/posts.ts` (LIST_COLUMNS :25-26, PostListItem :28-41, comment :19-24)
- Modify: `lib/db/src/images.ts` (`listCoversByEntity` :48-57 — no `.limit()`)
- Modify: `lib/db/src/skills.ts` (`listSkills` :23-30 fetches invisible rows)
- Modify: `lib/db/src/reorder.ts:12-19`, `lib/db/src/sectionSettings.ts:32-39` (per-item UPDATEs; unused `reorder_sections` RPC declared in `lib/supabase/src/types.ts:1225-1228`)
- Modify: `lib/db/src/posts.test.ts`, `images.test.ts`, `skills.test.ts`, `sectionSettings.test.ts` (if present)
- Modify: `lib/supabase/src/types.ts` (add `reading_minutes` to `blog_posts` Row/Insert? NO — generated columns are read-only: add to Row type only; also keep `reorder_sections` Functions entry in sync)
- Modify consumers of post list shapes: `artifacts/portfolio/src/features/blog/**` (utils/format.ts `getReadingTime`, BlogPostCard), `artifacts/portfolio/src/data/portfolio.ts` (static fallback posts), `artifacts/portfolio/src/hooks/usePortfolioData.ts` (mapper), admin PostsManager if it renders reading time. Check each before editing; keep edits minimal.

**Behavior:**

1. Migration 063: add a stored generated column so reading time moves to Postgres:

```sql
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS reading_minutes smallint
  GENERATED ALWAYS AS (
    GREATEST(1, CEIL(
      array_length(regexp_split_to_array(btrim(coalesce(content, '')), '\s+'), 1)::numeric / 200.0
    ))::smallint
  ) STORED;
```

If Postgres rejects the expression as non-immutable, fall back to a BEFORE INSERT/UPDATE trigger setting `reading_minutes` and say so. 2. `posts.ts`: LIST_COLUMNS becomes `"id,slug,title,excerpt,reading_minutes,cover_image_url,tags,is_published,published_at,created_at,updated_at"` (content dropped). `PostListItem` swaps `content: string` for `reading_minutes: number`. Update the :19-24 comment to explain the generated column. `getPublishedPostBySlug` keeps `select("*")` so detail still returns full content. Portfolios cards read `reading_minutes` directly; delete `getReadingTime` from blog utils if it becomes unused (grep first). Static fallback posts get a hardcoded plausible `reading_minutes` per post. `routes/public/posts.ts` list shape must keep working (it already excludes content — align it with the new column). 3. `listCoversByEntity`: add `.limit(MAX_LIST_ROWS)` (import from `./query`) and keep existing ordering so the first cover per entity is deterministic. 4. `skills.ts`: add a new exported `listVisibleSkills(supabase, ...)` that filters `.eq("is_visible", true)` with the same ordering/limit as `listSkills`; keep `listSkills` untouched for admin. Point the public portfolio consumer (`usePortfolioData` skills call and/or the public API route — grep for callers) at `listVisibleSkills`. 5. Reorder: `sectionSettings.ts` reorder switches to the existing `reorder_sections` RPC (`.rpc("reorder_sections", { section_ids, sort_orders })`) preserving current success/error semantics. `reorder.ts` (generic entities): grep for an equivalent RPC — if none exists for that table set, keep per-item updates but add a doc comment noting the deliberate fan-out and the cap (reject inputs > `MAX_LIST_ROWS` items with an error before issuing updates).

**TDD:** extend tests first (list columns exclude content + include reading_minutes; covers limited; listVisibleSkills filters; section reorder calls RPC with arrays; reorder rejects oversized input). Watch fail → implement → watch pass.

**Verification:** `pnpm vitest run --project db` green; `pnpm --filter @workspace/portfolio exec tsc --noEmit` clean.

---

### Task 2: API security misc + AI retry backoff

**Files:**

- Create: `supabase/migrations/062_drop_image_metadata_public_read.sql`
- Modify: `artifacts/api-server/src/middleware/errorHandler.ts:28-31` (ValidationError echo)
- Modify: `artifacts/api-server/src/routes/health.ts:28-35` (uptime + NODE_ENV disclosure)
- Modify: `artifacts/api-server/src/lib/ai/client.ts:96-118` (invalid_json retry has no delay)
- Tests: `artifacts/api-server/src/test/routes/health.test.ts` (if present, else create), error-handler test file (find existing), ai client test file (find)

**Behavior:**

1. Migration 062: inspect `supabase/migrations/017_image_rls.sql:6-9` for the anon SELECT policy names on `image_metadata`/`image_variants`, then `DROP POLICY IF EXISTS` them (also check 025/042 didn't recreate equivalents — grep `image_metadata` across migrations first). Nothing in portfolio reads these tables directly (verified: admin list flows through `/api/v1/admin/images` with the service-role key, which bypasses RLS — no policy needed for it).
2. `errorHandler.ts`: the `err.name === "ValidationError"` branch must never echo `err.message` from unknown libraries. Import `z` from `zod` (already a workspace dep — verify import path used by api-zod generated middleware) and branch: `if (err instanceof z.ZodError)` → `badRequest(res, { _form: [/* flattened field messages */] })` preserving today's user-visible behavior for real Zod failures (check how the Zod middleware currently surfaces errors — there may be an existing mapping; reuse it); REMOVE the name-based branch or reduce it to a fixed non-leaking message `badRequest(res, { _form: ["Validation failed"] })` only if some code path still throws name-ValidationError errors (grep first — report findings).
3. `health.ts`: return `{ status: "ok" }` plus nothing else in production; keep `uptime`/`NODE_ENV` fields only when `process.env.NODE_ENV !== "production"`. Match the existing response helper style.
4. `ai/client.ts`: `generateJson` invalid_json retry path waits 400ms before retrying (named const `JSON_RETRY_DELAY_MS = 400`); never delay on http/network failures (they already don't retry). Make the delay injectable/testable (e.g. a small `delay(ms)` helper or injectable sleep) and test with `vi.useFakeTimers()`.

**TDD:** failing tests first: health production payload exact-shape; errorHandler does not leak a fake `ValidationError`-named error's message (assert exact fixed message); Zod error still maps to field messages; JSON retry delays. Watch fail → implement → watch pass.

**Verification:** `pnpm vitest run --project api-server` green.

---

### Task 3: Admin settings routes → lib/db, singleton-upsert fold, ESLint data-access ban

**Files:**

- Create: `lib/db/src/{aboutContent,contactInfo,siteSettings,seoSettings,themeSettings,typographySettings,singletonUpert}` modules as needed — FIRST grep `lib/db/src` for existing equivalents (heroContent.ts, sectionSettings.ts already exist)
- Create: `lib/db/src/singleton-upsert.ts` (moved from `artifacts/api-server/src/lib/singleton-upsert.ts:49` — eliminate the `as unknown as SupabaseClient<any>` cast using the typed client lib/db already injects)
- Modify: `lib/db/src/index.ts`, `lib/db/package.json` (add subpath exports — **this task owns these two files**)
- Modify: `artifacts/api-server/src/routes/admin/hero.ts:16,37`, `about.ts:16`, `contact-info.ts:34`, `site-settings.ts:32`, `seo-settings.ts:27`, `theme-settings.ts:38`, `typography-settings.ts:28`, `section-settings.ts:15` — replace inline `.from(...)` + local `singletonUpsert` with lib/db module calls
- Modify: `artifacts/api-server/src/lib/route-helpers.ts:44` and `lib/collection-router.ts:87` — route their generic CRUD through a new `lib/db/src/collection.ts` exporting a table-allowlisted generic `collectionQuery(...)`/`collectionMutate(...)` (no `as never`)
- Modify: `eslint.config.js` (**this task owns it**): add a rule/config forbidding imports of `@workspace/supabase` (client construction) inside `artifacts/api-server/src/routes/**`, with a narrow documented allowlist only if a route genuinely needs storage access (images/cv) — prefer moving that access into `artifacts/api-server/src/lib/` helpers first
- Modify: `artifacts/api-server/src/lib/singleton-upsert.ts` → delete after migration (grep consumers first; tests too)
- Tests: existing admin route tests must stay green unchanged wherever behavior is preserved; add a hero GET test asserting `normalizeHeroContentFields` output (the divergence fix), and tests for the lib/db singleton-upsert move

**Behavior:**

1. For each of the 8 routes: read the route + its current inline query; create/extend the matching lib/db module (`getHeroContent`, `updateAboutContent`, `upsertContactInfo`, ...) with `queryOrThrow` + `[table.operation]` prefixes; the route calls the module and maps to the envelope exactly as today. CRITICAL: hero GET must go through `getHeroContent` so `normalizeHeroContentFields` applies (today's route returns raw rows — that divergence is the bug).
2. Move singleton-upsert into lib/db; both lib/db singleton modules and any remaining route callers use the lib/db export. Keep the atomic on-conflict race handling identical.
3. `collection-router.ts`/`route-helpers.ts`: extract their inline `.from(table)` chains into `lib/db/src/collection.ts` behind a strict table-name allowlist (reuse the allowlist constants that already exist in those files), typed via the existing `Database` map (no `as never`, no `as any`). Behavior and pagination semantics identical.
4. ESLint ban as described; run lint on api-server to prove compliance.

**TDD:** failing test for hero GET normalization first; then route-by-route, run the route's existing test file after each migration. Watch pass, no behavior drift.

**Verification:** `pnpm vitest run --project api-server --project db` green; `pnpm lint` clean; grep proves `routes/**` no longer imports the supabase client (except allowlisted).

---

### Task 4: Content + messages routes → lib/db; messages subsystem fold; mark-all-read UUID validation

**Files:**

- Modify: `artifacts/api-server/src/routes/admin/posts.ts:45` (inline queries → lib/db posts functions; create missing CRUD fns in `lib/db/src/posts.ts`)
- Modify: `artifacts/api-server/src/routes/images.ts:216,280` (inline supabase → `lib/db/src/images.ts` functions; storage operations stay in a new `artifacts/api-server/src/lib/storage.ts` helper if needed)
- Modify: `artifacts/api-server/src/lib/messages/` — fold `{bulk,reply,maintenance,view-spec}.ts` into `lib/db/src/messages.ts` (revive the dead exports `listMessages`, `unreadCount`, `markMessageRead`, `markAllMessagesRead`, `deleteMessage` as the REAL implementations with user scoping), then DELETE `artifacts/api-server/src/lib/messages/` (grep consumers: `routes/admin/messages.ts` and friends)
- Modify: `artifacts/api-server/src/routes/admin/messages.ts:133` — mark-all-read now calls the lib/db `markAllMessagesRead`; the requested `?userId` UUID check moves INSIDE the lib/db function (centralized `validateQueryUserId`-style guard from `lib/user-scope.ts` — import or reimplement in lib/db), so every `.or(user_id.eq.${...})` interpolation is validated at the source (`lib/messages/scope.ts:27` equivalent dies with the folder)
- Modify: `lib/db/src/messages.ts`, `lib/db/src/posts.ts` (only add functions), `lib/db/src/images.ts` (only add functions)
- Tests: `lib/db/src/messages.test.ts`, `posts.test.ts`, api-server message/post/image route tests (extend for the foreign-userId denial path)

**Behavior:**

1. Every admin messages operation (list with view-spec, unread count, mark read, mark-all-read, delete, bulk ops, reply draft) goes through `lib/db/src/messages.ts` with user_id scoping preserved EXACTLY as today (superadmin exemption included — read `lib/user-scope.ts` and the existing scope helpers before writing).
2. mark-all-read: non-UUID `?userId` → 400 envelope with the exact same message the list route uses today (match its test). This closes the audit's postgREST-filter-injection finding.
3. Admin posts CRUD via lib/db posts module (add `createPost`/`updatePost`/`deletePost` if missing — reuse Insert/Update types from `@workspace/supabase/types`).
4. images route inline blocks (:216,280) call lib/db images functions; storage upload/delete moves to `api-server/src/lib/storage.ts` (thin, typed) if the route needs bucket access.
5. After the fold, `lib/db/src/messages.ts` exports exactly the functions with live consumers; delete leftovers.

**TDD:** db-level tests for the revived message functions (user scoping, spam view, unread count) and the UUID guard; route tests stay green. Watch fail → implement → watch pass.

**Verification:** `pnpm vitest run --project db --project api-server` green.

---

### Task 5: lib/validation → real Zod schemas

**Files:**

- Modify: `lib/validation/src/*` (read `rules.ts:8-50` and whatever `schemas`/index exports exist first; the DSL is consumed by exactly one production file: `artifacts/portfolio/src/features/contact/components/ContactForm.tsx:4`)
- Modify: `ContactForm.tsx` only if the import surface must change
- Modify: `lib/validation/README.md` (created in round 4 — update to describe Zod)
- Tests: `lib/validation/src/*.test.ts` (existing — keep passing or update to new exact messages), `lib/api-zod/src/drift-guard.test.ts` must stay green

**Behavior:**

1. Rebuild `lib/validation` schemas as Zod (`zod` is already a workspace dep). Schema shapes mirror the contact-form fields and align with `lib/api-zod`'s contact schema (check `lib/api-zod/src` for the generated contact schema — if an equivalent exists, derive from it or add a drift test asserting both accept/reject the same inputs).
2. Keep the public function signatures the ContactForm uses (string-error validators for `useFormValidation`) implemented as thin `safeParse` adapters returning the exact same error strings as today (read current tests; if error strings change, update tests to the new EXACT strings and say so).
3. Delete the dead hand-rolled rule functions from `rules.ts` after migration (grep to confirm zero remaining consumers).

**TDD:** new schema tests first (valid/invalid cases incl. honeypot/time-trap fields if present in the form), watch fail, implement, watch pass.

**Verification:** `pnpm vitest run --project validation --project api-zod` green; portfolio typecheck clean.

---

### Task 6: Frontend + admin quality batch

**Files:**

- Modify: `artifacts/admin/src/lib/api-client.ts:153` + `artifacts/admin/src/lib/use-entity-query.ts:66` — message status type hygiene (see below)
- Modify: `artifacts/admin/src/components/ImageUploader.tsx:10` + `UploadedImagesGrid.tsx:2` — break circular import: create `artifacts/admin/src/components/uploaded-image.ts` exporting `UploadedImage`; both import from it
- Modify: `artifacts/portfolio/src/components/CertificationsSection.tsx:76-77,172` + `artifacts/portfolio/src/features/projects/hooks/useProjects.ts:31` — stop index-derived IDs
- Modify: `artifacts/admin/src/App.tsx:92,110` — wrap lazy `/overview` and NotFound in `<Suspense fallback={<PageFallback />}>`
- Modify: `artifacts/portfolio/src/lib/language.tsx:82`, `theme.tsx:29`, `theme-sync-context.tsx:41`, `artifacts/admin/src/lib/viewing-user-context.tsx:17`, `lib/ui/src/chart.tsx:48` — `useMemo` provider/context values
- Delete: `artifacts/mockup-sandbox/` (verify zero references in configs/CI/e2e first; report any found)
- Modify dead code: `artifacts/admin/src/lib/error-messages.ts:26` (`categorizeError`), `artifacts/admin/src/lib/auth-token.ts:48,68-77` (unreachable kill-switch branch — investigate intent first, delete if truly dead), `artifacts/portfolio/src/features/skills/hooks/useSkills.ts:7-13` (inline the shim), `artifacts/admin/src/lib/supabase.ts` + `theme-types.ts` (inline if importers allow), `artifacts/admin/src/features/auth/components/index.ts` + `artifacts/admin/src/features/messages/components/index.ts` (delete dead barrels)
- Modify: `artifacts/admin/src/features/cv/components/CvManager.tsx:36-51` — extract named consts `CV_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024` and exact MIME check (`file.type === "application/pdf"` + magic-byte-free fallback is fine client-side); keep multi-statement lines from being compressed (one statement per line)
- Modify: `artifacts/admin/src/features/analytics/index.tsx:126` (drop `data as AnalyticsStats` — type the client against the actual API envelope shape or Zod-parse), `artifacts/admin/src/features/messages/hooks/useMessageFilters.ts:43` + `artifacts/admin/src/features/settings/components/SiteSettingsManager.tsx:41` (replace risky `as` casts with proper types/guards)
- Modify: `artifacts/admin/src/lib/use-entity-query.ts:53` — remove `as unknown as T` via a type guard; and in `fetchAllMessages` (:87-116): after the first page, read `pagination.total` from the response and fetch remaining pages (bounded by `MAX_MESSAGE_PAGES`) with `Promise.all` instead of sequentially — keep the cap and warning semantics, update `FetchAllMessages.test.ts` first
- Modify: portfolio `SyncDebug` (grep location) — dynamic import so it never ships in the Home chunk in production
- Modify: `artifacts/portfolio/src/components/CertificationsSection.tsx:96-117` + `artifacts/portfolio/src/features/blog/utils/format.ts` + `artifacts/admin/src/features/settings/hooks/useThemePresets.ts:26` — consolidate date formatting: portfolio gets one shared `formatDate` helper (mirroring `admin/src/lib/format-date.ts` semantics) used by both portfolio sites; `useThemePresets` uses `@/lib/format-date`

**Behavior notes:**

- Message status types: `lib/supabase`'s `MsgStatus` is the DB enum (`unread|read|archived`) and must NOT gain `"spam"` (spam is the `is_spam` boolean). In admin, rename the filter union to make semantics explicit: keep one `MessageStatusFilter = "unread" | "read" | "archived" | "spam" | "all"` in a single module and reuse it everywhere the union is currently duplicated (api-client.ts, use-entity-query.ts) — document that `"spam"` filters on `is_spam=true` and never maps to `status`.
- Index-derived IDs: carry the DB row `id` (certifications/projects have `id`; static fallback data may need `slug` or a generated stable id) through the mapper and use it as the React key.

**TDD:** failing tests first for: fetchAllMessages parallel remainder (assert request count + order), ID stability (keys use entity id), Suspense presence is render-level (verify via existing App tests passing), any changed error/type surfaces.

**Verification:** `pnpm vitest run --project admin --project portfolio` green; `pnpm lint` clean on touched packages.

---

### Task 7: Documentation currency

**Files:**

- Modify: `docs/data-access.md:87-90` — document the Row-variant certification API (`listCertificationRows`, `createCertificationRow`, `updateCertificationRow` at `lib/db/src/certifications.ts:57,116,154`) alongside the legacy functions
- Modify: `docs/changelog.md` — add a `## 2026-09-15` entry summarizing audit rounds 2–4 and this round's changes (read git log for round 2/3 content)
- Modify: `MEMORY_BANK.md` — refresh the "Last updated" header and reconcile any claims the last two audits disproved (e.g. rate-limit store, analytics aggregation location); if the file is too stale to fix cheaply, replace its body with a pointer to docs/ and say so
- Modify: root `README.md:102` only if MEMORY_BANK is de-promoted; also verify the README lib/validation description matches Task 5's outcome

**Verification:** every documented export name exists in code (spot-grep); dates correct.

---

### Controller verification gate (after Tasks 1–7)

- `pnpm run typecheck`
- `pnpm lint` (max-warnings=0)
- `pnpm vitest run` per project sequentially: `db`, `api-zod`, `validation`, `logging`, `app-infra`, `api-server`, `admin`, `portfolio`, `scripts`
- Fix fallout inline; re-run until green. Report any intentionally deferred items.
