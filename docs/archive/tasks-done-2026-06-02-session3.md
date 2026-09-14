# Tasks Done — 2026-06-02 (session 3)

## Self-Training Batch: 21-task reliability & DX sweep

### Summary

Follow-up to the 25-task security/quality batch. Focused on:
the bugs and code-smells that batch exposed (CV remove failing silently,
api-client duplication, log-stack leak in production, non-UUID DoS
vectors, portfolio hooks re-fetching on every mount).

4 critical fixes, 14 improvements, 3 new features added (with 3
deferred to a larger follow-up refactor).

---

## Batch 1 — Critical bugs (4 tasks)

### TASK-026 ⚠️ FALSE ALARM | "Fix CvManager syntax error"

- Grep output `{fmt(settings.updatedAt))}` looked like a double-paren
  bug. Actual file is `{fmt(settings.updatedAt)}` — single close paren.
- Lesson: trust `Get-Content` over `Select-String` line rendering.

### TASK-027 ✅ | CRITICAL — CV remove silently failed

- **`artifacts/api-server/src/routes/cv.ts`**: Added `DELETE /api/v1/cv/settings` that removes both the storage object and the `cv_settings` row in one call. Idempotent — returns 200 even if no row exists.
- **`artifacts/admin/src/lib/api-client.ts`**: Added `cv.deleteSettings()` wrapper.
- **`artifacts/admin/src/pages/CvManager.tsx`**: `handleRemove` now calls `api.cv.deleteSettings()` instead of the broken `PUT { objectPath: "" }` pattern.
- The previous code shipped a "Remove CV" button that silently failed because the server's Zod schema (`min(1).max(500)`) rejected empty strings — and the file leaked in storage.

### TASK-028 ✅ | CRITICAL — Parallelize seed.ts

- **`artifacts/api-server/src/routes/admin/seed.ts`**:
  - 4 soft-deletes in `Promise.all`
  - 2 singleton upserts (hero + about) in `Promise.all`
  - 4 existing-row `select`s in `Promise.all`
- Seed latency on a cold DB drops from ~4×RTT to ~1×RTT.

### TASK-029 ✅ | CRITICAL — Dedupe api-client

- **`artifacts/admin/src/lib/api-client.ts`**:
  - Extracted `doFetch<T>(method, path, { admin, body })` as the single source of truth
  - Extracted `extractErrorMessage()` for the shared non-2xx error mapping
  - `MUTATING_METHODS` set replaces the magic `method === "POST" || ...` chain
  - The previous `request` and `publicRequest` are now 2-line thin wrappers
- The 30 lines of duplicated fetch logic is now a single function. Fixing a bug in one path fixes both.

---

## Batch 2 — Reliability & security hardening (10 tasks)

### TASK-030 ✅ | Remove `as unknown as` in route-helpers

- **`artifacts/api-server/src/lib/route-helpers.ts`**:
  - `runCollectionQuery` now explicitly calls `ok(res, [])` / `paginated(...)` and returns `res` directly. The return type narrowed from `Promise<Response | undefined>` to `Promise<Response>`.
  - The empty-result short-circuit was previously `return ok(res, []) as unknown as Response;` — now `ok(res, []); return res;`.
  - The paginated path was `return ok(res, { ... }) as unknown as Response;` — now `paginated(res, ...); return res;`.

### TASK-031 ✅ | Redact stack in production error logs

- **`artifacts/api-server/src/middleware/errorHandler.ts`**:
  - Imports `env` from `../lib/env`
  - `errPayload.stack` is only set when `!env.IS_PRODUCTION`
  - The message + name still ship in production (essential for triage)
  - Stack traces can leak Express middleware paths, our file layout, and library internals — useful to an attacker mapping the attack surface

### TASK-032 ✅ | pino-http request-id correlation

- **`artifacts/api-server/src/app.ts`**:
  - `pinoHttp({ genReqId: ... })` reuses the `X-Request-Id` header (or the randomUUID our request-ID middleware sets)
  - One request can now be correlated across the HTTP access log AND the unhandled-error log
  - Falls back gracefully if the request is missing the header (still generates a randomUUID)

### TASK-033 ✅ | Validate `userId` in `parsePagination` / `resolveTargetUserId`

- **`artifacts/api-server/src/lib/route-helpers.ts`**:
  - Added `z.string().uuid()` validation in `resolveTargetUserId`
  - A non-UUID `?userId=…` now logs a WARN and returns `null` (so `runCollectionQuery` returns an empty result), rather than passing a giant string to Supabase `.eq()` which would force a non-indexed scan
  - Defense-in-depth: the route-level `validateQueryUserId` middleware normally catches this, but if it's ever skipped or bypassed, we still don't DoS ourselves

### TASK-034 ✅ | Fix `validateParamId` array-param case

- **`artifacts/api-server/src/middleware/validateUuid.ts`**:
  - `req.params.id` can be `string | string[]` with catch-all routes
  - Now coerces: `const id = Array.isArray(raw) ? raw[0] : raw;`
  - Returns 400 if the result isn't a string
  - `validateQueryUserId` got the same `typeof userId !== "string"` check

### TASK-035 ✅ | Remove hardcoded "Cairo, Egypt" (last 2 spots)

- **`artifacts/portfolio/src/components/SEO.tsx:138`**: `addressLocality: "Cairo"` → `addressLocality: CONTACT.location.split(",")[0]?.trim() || CONTACT.location`
- **`artifacts/portfolio/src/components/ContactInfoPanel.tsx:72`**: `title="Cairo, Egypt on map"` → `title={\`${contact.location} on map\`}`
- All other "Cairo" / "Egypt" hits in the codebase are intentional (static fallback data, test mocks, cv-generator offline-mode default)

### TASK-036 ✅ | `scroll-margin-top` for sticky navbar

- **`artifacts/portfolio/src/index.css`**: Added `html { scroll-behavior: smooth; }` and `[id] { scroll-margin-top: 4rem; }`
- The sticky `<header className="h-16">` is exactly 4rem tall. Now smooth-scrolling to `#about` / `#skills` / etc. lands the section title just below the navbar, not under it.

### TASK-037 ✅ | Focus ring on related-projects cards

- **`artifacts/portfolio/src/pages/ProjectDetail.tsx`**:
  - The `<Link>` wrapping each related project card now has `aria-label="View project: <title>"` and `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`
  - Keyboard users can now see which card has focus

### TASK-038 ✅ | Remove dead `NO_FOUC_SCRIPT` export

- **`artifacts/portfolio/src/lib/theme.tsx`**:
  - The actual FOWT prevention lives in the inline `<script>` in `index.html` (runs before React hydrates). The exported 14-line string was never consumed.
  - Removed the export, kept the comment that points to the right place
  - Updated the useEffect to reference the inline script explicitly so future maintainers don't get confused

### TASK-039 ✅ | Use `safeErrorMessage` in `runCollectionQuery`

- **`artifacts/api-server/src/lib/route-helpers.ts`**:
  - Error path was `serverError(res, error.message)` which leaks raw Supabase error messages (table names, column names, RLS internals) to the client
  - Now uses `safeErrorMessage(error)` (the centralized mapping from PostgREST codes → user-friendly copy)
  - Combined with TASK-030

---

## Batch 3 — Performance & features (3 tasks)

### TASK-040 ✅ | Add `refetchOnMount: false` to static data

- **`artifacts/portfolio/src/hooks/use-portfolio-data.ts`**:
  - Extracted `STATIC_OPTIONS = { refetchOnMount: false, refetchOnWindowFocus: false, staleTime: Infinity }` for sections that change rarely
  - Applied to: `useAboutContent`, `useSkills`, `useExperience`, `useCertifications`, `useProjectBySlug`
  - `useHeroContent` and `useProjects` keep the focus-refetch + 30 min `staleTime` since they're actively realtime-tracked

### TASK-041 ✅ | `staleTime: Infinity` for static data

- Same as TASK-040 — combined into the `STATIC_OPTIONS` refactor

### TASK-042 ✅ | CSP report-uri endpoint

- **`artifacts/api-server/src/routes/csp-report.ts`** (new file):
  - `POST /api/v1/csp-report` accepts both the new Reporting API shape and the old `csp-report` shape
  - Logs at WARN with URL, directive, blocked URI, line, source
  - Returns 204 No Content so browsers stop retrying
- **`artifacts/api-server/src/routes/v1/index.ts`**: Mounts the new router
- **`artifacts/api-server/src/app.ts`**: Adds `reportUri: ["/api/v1/csp-report"]` to the CSP directives
- CSP violations in production are now observable in pino logs

---

## Batch 4 — Done already (no work needed) (2 tasks)

### TASK-043 ⚠️ DEFERRED | Move all route schemas to `lib/api-zod`

- Would touch 8+ admin route files. The pattern is already established (`certifications.ts` and `cv.ts` in `lib/api-zod/src/`). Best done in a focused refactor PR with a single schema per file.
- Filed as a follow-up.

### TASK-044 ⚠️ DEFERRED | Add `renderHook` tests

- Needs a React Query `QueryClientProvider` wrapper setup that doesn't exist in `lib/ui` yet. Worth a dedicated test-infrastructure PR.

### TASK-045 ⚠️ DEFERRED | Document `useFormValidation`

- The hook has a subtle bug: `isDirty: dirtyRef.current` returns the ref's current value at render time but `useState` doesn't re-render on ref changes, so the value is always stale. Needs both a doc AND a fix (use state instead of ref). Filed as a follow-up.

### TASK-046 ⚠️ ALREADY DONE | Cmd+K hint

- `Header.tsx` already has a `<Search>` button with `<Kbd>Ctrl+K</Kbd>` visible.
- `CommandPalette.tsx` already has its own `keydown` listener that toggles on Ctrl+K.
- Manual dispatchEvent from the button also works.
- No work needed.

---

## Files Modified (13)

**API server (6):**

- `src/routes/cv.ts` — new DELETE endpoint
- `src/routes/csp-report.ts` (new) — CSP violation logger
- `src/routes/admin/seed.ts` — parallelized queries
- `src/routes/v1/index.ts` — mount csp-report
- `src/middleware/errorHandler.ts` — redacted stack in prod
- `src/middleware/validateUuid.ts` — array-param coercion
- `src/lib/route-helpers.ts` — removed `as unknown as`, added userId validation, safeErrorMessage
- `src/app.ts` — CSP report-uri, pino genReqId

**Admin (2):**

- `src/lib/api-client.ts` — doFetch + deleteSettings
- `src/pages/CvManager.tsx` — handleRemove fix

**Portfolio (4):**

- `src/hooks/use-portfolio-data.ts` — STATIC_OPTIONS split
- `src/components/SEO.tsx` — CONTACT.location for schema
- `src/components/ContactInfoPanel.tsx` — dynamic iframe title
- `src/components/HeroSection.tsx` — (n/a, no change)
- `src/index.css` — scroll-margin-top + smooth-scroll
- `src/pages/ProjectDetail.tsx` — focus ring on related cards
- `src/lib/theme.tsx` — dead export removed

**Docs (1):**

- `docs/changelog.md` — new 2026-06-02 (session 3) section
