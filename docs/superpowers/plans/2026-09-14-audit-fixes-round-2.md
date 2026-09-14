# Audit Fixes Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every actionable finding from the 2026-09-14 five-dimension code audit (security vulns, performance hotspots, code quality, architecture enforcement, maintainability).

**Architecture:** Direct fixes to existing modules following repo conventions (`queryOrThrow` DB pattern, API envelope `{ success, data }`, four-layer validation, TDD with exact-schema error assertions). Two in-flight dedup helpers for cache-stampede sites. No new runtime dependencies except lint tooling.

**Tech Stack:** TypeScript, Express 5, React 18 + React Query, Vitest (8 projects), pnpm monorepo, ESLint flat config.

**Spec:** The 2026-09-14 audit (this session). Verified premises (spot-checked against working tree at `bb6c34c`):

- `multer@^2.2.0` (vuln < 2.3.0), `nodemailer@^9.0.5` (vuln < 9.1.0) in `artifacts/api-server/package.json`
- Time-trap at `artifacts/api-server/src/routes/public/contact.ts:97-109` only checks when field present
- `artifacts/api-server/src/lib/ai/context.ts` — 60s cache, no in-flight dedup, no `.limit()` on list queries
- `artifacts/api-server/src/routes/cv.ts:33-38` — PDF cache, no in-flight dedup
- `artifacts/portfolio/src/lib/supabase-provider.tsx:8-11` — staleTime 30s, refetchOnWindowFocus true
- `lib/db/src/messages.ts` — unbounded `listMessages`, dead `replyToMessage` export
- Unused deps: admin has 7 (`input-otp`, `react-day-picker`, `react-resizable-panels`, `embla-carousel-react`, `vaul`, `date-fns`, `next-themes`); portfolio has 2 (`react-hook-form`, `recharts`) — verified 0 refs in respective `src/`
- `artifacts/admin/middleware.ts:68` — `img-src ... https:` wildcard
- `artifacts/portfolio/src/lib/csrf.ts` lacks admin's envelope-aware `extractCsrfToken` handling
- `artifacts/admin/src/features/audit/index.tsx:50-84` — useEffect state-mirroring pagination
- Mixed hook filenames (kebab vs camel) in `artifacts/*/src/hooks/`
- `eslint.config.js` — no `as`-assertion rule, no import boundaries, no max-lines
- Stale `VITE_SUPABASE_SERVICE_ROLE_KEY` references in `HOW_TO_USE.md`, `DEPLOYMENT.md`, `MEMORY_BANK.md`, `docs/deployment.md`, `artifacts/admin/README.md`
- `artifacts/admin/src/features/messages/components/MessagesManager.tsx` (775 lines), `artifacts/api-server/src/routes/admin/messages.ts` (~475 lines) exceed the 250-line cap

**Corrected premises (do NOT "fix"):**

- `cv_settings` has NO `is_published` column (singleton, single row) — the "CV draft leak" finding is invalid.
- `react-hook-form` and `recharts` ARE used in admin; remove only from portfolio.

## Global Constraints

- Default branch `master`; work on branch `mostafasayed118/chore/audit-fixes-round-2` (branched from master).
- Conventional commits with scopes: `fix(api):`, `perf(ai):`, `chore(admin):`, `refactor(db):`, etc.
- ESLint: warnings fatal (`--max-warnings=0`); no `any`; no non-null assertions in src; unknown catch variables.
- Tests: never `vi.mock` first-party modules; stub network via `vi.stubGlobal("fetch")` or supabase test doubles; exact schema error messages; mutation-check new tests.
- File cap 250 lines / components under 100 lines for NEW code created by splits.
- API responses use envelope `{ success, data }` / `{ success: false, message, errors }`.
- Verification gate per task: affected Vitest project passes; final gate: full suite + typecheck + lint + builds.

---

### Task 1: Patch vulnerable production dependencies

**Files:**

- Modify: `artifacts/api-server/package.json` (multer, nodemailer)
- Modify: root `package.json` (pnpm.overrides for qs/fflate if not transitively updatable)

**Interfaces:** Produces: no API change; lockfile updated.

- [ ] **Step 1: Run baseline audit**

Run: `pnpm audit --prod`
Record the exact list of HIGH/MEDIUM advisories (expect multer DoS GHSA-wc9g-mqfw-jrwm, nodemailer GHSA-2x7j-588g-ccc2, qs, fflate).

- [ ] **Step 2: Update deps**

Run: `pnpm --filter api-server update multer@^2.3.0 nodemailer@^9.1.0`
For transitive `qs`/`fflate`: prefer `pnpm -r update qs fflate --latest`; only if advisories persist, add to root `pnpm.overrides` with safe versions (`qs@^6.14.1`, `fflate@^0.8.2`).

- [ ] **Step 3: Verify**

Run: `pnpm install --frozen-lockfile=false; pnpm audit --prod`
Expected: 0 HIGH; ideally 0 vulnerabilities total. Run `pnpm --filter api-server test` (uploads/contact suites must pass — multer 2.x API is compatible).

- [ ] **Step 4: Commit**

```bash
git add pnpm-lock.yaml artifacts/api-server/package.json package.json
git commit -m "fix(security): bump multer>=2.3.0, nodemailer>=9.1.0, patch qs/fflate advisories"
```

---

### Task 2: Harden contact time-trap (require valid `_formLoadedAt`)

**Files:**

- Modify: `artifacts/api-server/src/routes/public/contact.ts:95-109`
- Test: `artifacts/api-server/src/test/contact*.test.ts` (locate existing contact route tests with `rg -l "_formLoadedAt" artifacts/api-server/src`)

**Root cause:** `contact.ts:98` gates on `typeof formLoadedAt === "number"` — a bot that simply omits `_formLoadedAt` skips the 2-second trap entirely. The real frontend (`ContactForm.tsx:65`) always sends it, so requiring it cannot break legitimate users.

- [ ] **Step 1: Write failing tests**

Add to the existing contact route test file (match its existing setup/helpers for building `req.body`):

```ts
it("silently drops submissions missing _formLoadedAt", async () => {
  const res = await postContact({ name: "A", email: "a@b.co", message: "hi there friend" }); // omit _formLoadedAt
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ success: true });
  // assert no message row inserted (existing helper or query stub)
});

it("silently drops submissions with non-numeric _formLoadedAt", async () => {
  const res = await postContact({
    name: "A",
    email: "a@b.co",
    message: "hi there friend",
    _formLoadedAt: "fast",
  });
  expect(res.status).toBe(200);
});
```

- [ ] **Step 2: Run tests — expect the two new tests to FAIL** (current code accepts missing field)

- [ ] **Step 3: Implement**

Replace the block at `contact.ts:97-109`:

```ts
const formLoadedAt = body._formLoadedAt;
if (typeof formLoadedAt !== "number" || !Number.isFinite(formLoadedAt) || formLoadedAt <= 0) {
  // Real clients (ContactForm) always send this; absence signals a bot. Silently drop, same as honeypot.
  logAbuse(req, "time_trap_missing");
  return ok(res, undefined);
}
const elapsed = Date.now() - formLoadedAt;
if (elapsed < 2000) {
  logAbuse(req, "time_trap_too_fast", { elapsed_ms: elapsed });
  return ok(res, undefined);
}
if (elapsed > 3_600_000) {
  logAbuse(req, "time_trap_stale", { elapsed_ms: elapsed });
  return badRequest(res, { _form: ["Form expired, please reload"] });
}
```

- [ ] **Step 4: Run full api-server test project — all pass (existing valid-submission tests already send the field)**

Run: `pnpm --filter api-server test`

- [ ] **Step 5: Commit**

```bash
git commit -am "fix(api): require _formLoadedAt so bots cannot bypass contact time-trap"
```

---

### Task 3: AI context cache — in-flight dedup + bounded queries

**Files:**

- Modify: `artifacts/api-server/src/lib/ai/context.ts`
- Test: `artifacts/api-server/src/test/ai-context*.test.ts` (or create; check `rg -l "buildSiteContext" artifacts/api-server/src`)

**Root cause:** Module-level single-entry cache with TTL but no promise memoization: on expiry, N concurrent chat requests each fire all 7 Supabase queries (stampede). List queries (`skills`, `projects`, `experience`, `certifications`) have no `.limit()` though output is truncated to 6000 chars anyway.

- [ ] **Step 1: Write failing test**

Stub supabase client (existing pattern in api-server tests — the module imports `getSupabaseClient` from `../supabase-client`; check how existing tests stub it, likely `vi.mock` of that module is acceptable as it is a network boundary wrapper — follow existing convention):

```ts
it("coalesces concurrent misses into one fetch", async () => {
  let calls = 0;
  stubSupabaseWithDelay({
    onQuery: () => {
      calls++;
    },
  }); // resolve after small delay
  const [a, b, c] = await Promise.all([buildSiteContext(), buildSiteContext(), buildSiteContext()]);
  expect(a).toBe(b);
  expect(b).toBe(c);
  expect(calls).toBe(7); // one round of 7 queries, not 21
});
```

- [ ] **Step 2: Run — expect FAIL (calls === 21)**

- [ ] **Step 3: Implement**

```ts
let cache: { text: string; at: number } | null = null;
let inflight: Promise<string> | null = null;

export async function buildSiteContext(): Promise<string> {
  const now = Date.now();
  if (cache && now - cache.at < env.AI_CONTEXT_TTL_MS) return cache.text;
  if (!inflight) {
    inflight = fetchContext()
      .then((text) => {
        cache = { text, at: Date.now() };
        return text;
      })
      .catch(() => {
        const stale = cache?.text ?? "";
        if (stale) cache = { text: stale, at: Date.now() };
        return stale;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
```

Add `.limit(100)` to the four list queries (lines 28-31). Keep error semantics: callers get stale-or-empty, never reject.

- [ ] **Step 4: Run test — PASS. Run `pnpm --filter api-server test`.**

- [ ] **Step 5: Commit** `perf(ai): dedupe concurrent site-context fetches and cap list queries`

---

### Task 4: CV PDF in-flight dedup

**Files:**

- Modify: `artifacts/api-server/src/routes/cv.ts:26-45`
- Test: existing cv route tests (`rg -l "generateCvPdf|/cv" artifacts/api-server/src/test`)

**Root cause:** Same stampede shape as Task 3; generation is synchronous CPU work (jsPDF + QR) repeated per concurrent miss.

- [ ] **Step 1: Write failing test** — stub `generateCvPdf`'s supabase dependency; fire 3 concurrent GETs; assert `generateCvPdf` invoked exactly once and all three responses identical 200 PDFs. (Stub at the supabase-client boundary per repo test convention.)
- [ ] **Step 2: Run — FAIL** (3 invocations).
- [ ] **Step 3: Implement**

```ts
let cvPdfCache: { bytes: Uint8Array; at: number } | null = null;
let cvPdfInflight: Promise<Uint8Array> | null = null;

async function getCvPdf(
  supabase: ReturnType<typeof getSupabaseClient>,
  portfolioUrl: string,
): Promise<Uint8Array> {
  const now = Date.now();
  if (cvPdfCache && now - cvPdfCache.at < env.CV_PDF_CACHE_TTL_MS) return cvPdfCache.bytes;
  if (!cvPdfInflight) {
    cvPdfInflight = generateCvPdf(supabase, portfolioUrl)
      .then((bytes) => {
        cvPdfCache = { bytes, at: Date.now() };
        return bytes;
      })
      .finally(() => {
        cvPdfInflight = null;
      });
  }
  return cvPdfInflight;
}
```

Use it in the handler (keep the try/catch → storage fallback flow).

- [ ] **Step 4: Run cv tests + api-server project — PASS.**
- [ ] **Step 5: Commit** `perf(api): coalesce concurrent CV PDF generation behind in-flight promise`

---

### Task 5: Portfolio React Query cache tuning

**Files:**

- Modify: `artifacts/portfolio/src/lib/supabase-provider.tsx:5-14`

**Root cause:** 30s staleTime + `refetchOnWindowFocus: true` on near-static CMS content multiplies Supabase reads on every tab focus. Admin already uses 5 min.

- [ ] **Step 1: Check for tests asserting the old values** (`rg -n "staleTime|refetchOnWindowFocus" artifacts/portfolio/src`) — update any.
- [ ] **Step 2: Change** to `staleTime: 1000 * 60 * 5` and `refetchOnWindowFocus: false` (keep `retry: 1`, `refetchOnMount: true`).
- [ ] **Step 3: Run portfolio tests + typecheck.**
- [ ] **Step 4: Commit** `perf(portfolio): raise content staleTime to 5m, disable focus refetch`

---

### Task 6: Bound `listMessages`, remove dead `replyToMessage`

**Files:**

- Modify: `lib/db/src/messages.ts`
- Test: `lib/db/src/messages.test.ts`

**Root cause:** `listMessages` (line 5-12) does unbounded `select("*")` — a footgun for future callers; `replyToMessage` (53-62) has zero production consumers (only its own test).

- [ ] **Step 1: Grep consumers first:** `rg -n "listMessages|replyToMessage" --glob "!**/node_modules"` — if any production caller exists, keep signature compatible (add optional `limit?: number` param defaulting to 200 instead of removing anything).
- [ ] **Step 2: Write failing test:** `listMessages` with no args caps results at 100 (assert `.limit(100)` reached the query builder — mirror how existing db tests assert query shape).
- [ ] **Step 3: Implement:**

```ts
export async function listMessages(supabase: SupabaseClient, limit = 100): Promise<Message[]> {
  return queryOrThrow<Message[]>(
    supabase
      .from("messages")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    { table: "messages", operation: "listMessages" },
  );
}
```

Delete `replyToMessage` and its test block (after Step 1 confirms no consumers).

- [ ] **Step 4: Run db project tests. Commit** `refactor(db): cap listMessages at 100 rows, drop dead replyToMessage`

---

### Task 7: Remove unused dependencies

**Files:**

- Modify: `artifacts/admin/package.json` (remove `input-otp`, `react-day-picker`, `react-resizable-panels`, `embla-carousel-react`, `vaul`, `date-fns`, `next-themes`)
- Modify: `artifacts/portfolio/package.json` (remove `react-hook-form`, `recharts`)

**Root cause:** Dead weight — verified 0 imports in the owning app's `src/` (audit + re-verified at `bb6c34c`; note both packages are used in _admin_ for react-hook-form/recharts — portfolio copies are the dead ones).

- [ ] **Step 1: Re-verify per-app:** `foreach` grep as done in plan research; abort if any ref appears in that app's src.
- [ ] **Step 2:** `pnpm --filter admin remove input-otp react-day-picker react-resizable-panels embla-carousel-react vaul date-fns next-themes; pnpm --filter portfolio remove react-hook-form recharts`
- [ ] **Step 3: Verify:** `pnpm install; pnpm -r typecheck; pnpm --filter portfolio build; pnpm --filter admin build` (also confirms no transitive CSS import breakage, e.g. `next-themes` in providers).
- [ ] **Step 4: Commit** `chore(deps): remove 9 unused dependencies from portfolio and admin`

---

### Task 8: Tighten admin CSP `img-src`

**Files:**

- Modify: `artifacts/admin/middleware.ts:68`
- Test: `artifacts/admin/src/test` or root csp tests — `rg -l "img-src" --glob "**/*.test.*"`

**Root cause:** `img-src 'self' data: blob: https: https://img.clerk.com https://*.clerk.accounts.dev` — bare `https:` allows any HTTPS origin (tracking pixels). Portfolio correctly scopes to `https://*.supabase.co`.

- [ ] **Step 1: Find which image hosts admin actually loads:** grep src for external image URLs (supabase storage, clerk logos, favicon): `rg -o "https://[a-z*.-]+\.[a-z]{2,}[^\"' )]*\.(png|jpe?g|svg|webp|ico|gif)" artifacts/admin/src | sort -u` plus check `<img src=` patterns. Union with `*.supabase.co`, `img.clerk.com`, `*.clerk.accounts.dev`, `data:`, `blob:`.
- [ ] **Step 2: Update test expectations + line 68** to the discovered explicit host list (minimum: `'self' data: blob: https://*.supabase.co https://img.clerk.com https://*.clerk.accounts.dev`).
- [ ] **Step 3: Run csp/middleware tests + admin build. Commit** `fix(admin): restrict CSP img-src to explicit hosts`

---

### Task 9: Align portfolio `csrf.ts` with admin (envelope-aware extraction)

**Files:**

- Modify: `artifacts/portfolio/src/lib/csrf.ts`
- Test: `artifacts/portfolio/src/test/csrf*.test.ts` (find existing)

**Root cause:** The two apps' CSRF token extraction diverged: admin handles the response-envelope shape (`extractCsrfToken` unwraps `{ success, data }`), portfolio does not — below the 0.8 duplicate-detection threshold so the CI gate can't see it. Any envelope change silently breaks portfolio CSRF.

- [ ] **Step 1: Read both files side by side; copy admin's envelope handling into portfolio's `extractCsrfToken` (or whichever direction makes both identical — admin's is the newer, envelope-aware version).**
- [ ] **Step 2: Write test in portfolio mirroring admin's envelope-handling tests** (exact same cases: raw header, envelope-wrapped, missing).
- [ ] **Step 3: Run portfolio tests. Commit** `fix(portfolio): adopt envelope-aware CSRF token extraction to match admin`

---

### Task 10: Replace audit-page pagination with `useInfiniteQuery`

**Files:**

- Modify: `artifacts/admin/src/features/audit/index.tsx:50-84`
- Test: `artifacts/admin/src/features/audit/*.test.*`

**Root cause:** `useEffect` mirrors `useQuery` data into `useState` and hand-rolls "Load more" — two extra effects, duplicated fetch logic, stale-state risk. React Query's `useInfiniteQuery` is the established pattern elsewhere in admin.

- [ ] **Step 1: Read the file; identify the fetcher signature and page param.** Rewrite as:

```tsx
const query = useInfiniteQuery({
  queryKey: ["audit-logs", filters],
  queryFn: ({ pageParam }) => fetchAuditLogs({ ...filters, cursor: pageParam }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});
const rows = query.data?.pages.flatMap((p) => p.items) ?? [];
```

(Adjust names to actual API; keep component under 100 lines for new code.)

- [ ] **Step 2: Update tests** — loading/error/empty states + "Load more" triggers `fetchNextPage`. Mutation-check: break `getNextPageParam` and confirm a test fails.
- [ ] **Step 3: Run admin project tests. Commit** `refactor(admin): audit log pagination via useInfiniteQuery`

---

### Task 11: Hook filename convention + ESLint enforcement

**Files:**

- Rename: kebab↔camel outliers in `artifacts/portfolio/src/hooks/` and `artifacts/admin/src/hooks/` (outliers found: `artifacts/portfolio/src/hooks/use-reveal.ts`, `useSupabaseTheme.ts` vs siblings; `artifacts/admin/src/hooks/useKeyboardShortcuts.ts`, `usePrefetchRoutes.ts`, `use-deep-link-editor.ts`, `use-before-unload.ts` — re-run `Get-ChildItem artifacts/*/src/hooks` to get the full list; standardize on camelCase `useXxx.ts` since that dominates)
- Modify: `eslint.config.js` (add `filenames/match-regex` for hook dirs)

- [ ] **Step 1: Enumerate both hooks dirs; pick dominant convention; `git mv` outliers + update all import sites (rg for old names).**
- [ ] **Step 2: Add rule** (plugin `eslint-plugin-filenames` may not be installed — prefer zero-dep approach: add `no-restricted-imports`? No — cleanest is `eslint-plugin-filenames`; if not installed, use `pnpm add -D -w eslint-plugin-filenames` and configure `files: ["**/src/hooks/*"]`, `@typescript-eslint/naming-convention` won't cover filenames):

```js
"filenames/match-regex": ["error", "^use[A-Z][A-Za-z0-9]*$", true], // scoped to hooks dirs via overrides
```

- [ ] **Step 3: Run lint (`--max-warnings=0` must pass), full typecheck. Commit** `chore(lint): standardize hook filenames on camelCase, enforce via ESLint`

---

### Task 12: ESLint import-boundary enforcement

**Files:**

- Modify: `eslint.config.js`

**Root cause:** Barrel-only imports (`@/features/<feature>`) and artifact→lib direction are convention-only (CLAUDE.md); nothing mechanically blocks deep imports or cross-layer reaches.

- [ ] **Step 1: Check plugin availability** (`pnpm add -D -w eslint-plugin-boundaries` if absent). Configure element types per artifact:

```js
{
  files: ["artifacts/*/src/**/*.{ts,tsx}"],
  settings: { "boundaries/element-types": {
    "features": { pattern: "artifacts/*/src/features/*", mode: "folder" },
    "hooks": { pattern: "artifacts/*/src/hooks/*", mode: "folder" },
    "lib": { pattern: "artifacts/*/src/lib/*", mode: "folder" },
  }},
  rules: {
    "boundaries/element-types": ["error", {
      default: "disallow",
      rules: [
        { from: ["features", "pages"], allow: ["features", "hooks", "lib"] },
        { from: "hooks", allow: ["lib"] },
        { from: "lib", allow: ["lib"] },
      ],
    }],
    "boundaries/external": "error",
  },
}
```

Start with the **deep-import ban** (import from `@/features/x` not `@/features/x/components/Foo`) — that is the rule CLAUDE.md states. Fix any violations the rule surfaces (fix by switching to barrel import, not by disabling the rule; if a barrel is missing, export from it).

- [ ] **Step 2: Run lint; fix violations; iterate until clean with `--max-warnings=0`.**
- [ ] **Step 3: Commit** `chore(lint): enforce feature barrel imports via eslint-plugin-boundaries`

---

### Task 13: Stale docs purge + repo hygiene

**Files:**

- Modify: `HOW_TO_USE.md`, `DEPLOYMENT.md`, `MEMORY_BANK.md`, `docs/deployment.md`, `artifacts/admin/README.md` — remove/replace all `VITE_SUPABASE_SERVICE_ROLE_KEY` instructions with current reality (admin uses anon key via `@workspace/supabase/client`; API server holds `SUPABASE_SERVICE_ROLE_KEY` server-side only)
- Modify: `.gitignore` — add `graphify-out/`, `testsprite_tests/`, `attached_assets/`, `list/`, `.freebuff/`, `.openclaude/`, `playwright-report/`, `test-results/`, `*.tmp.mjs`, `screenshots/` (check which are already ignored; add missing; do NOT gitignore anything that's committed source — check `git ls-files` first for each path; if any are tracked, `git rm -r --cached` only if they are pure tool output)
- Move: dated session logs in `docs/` (`tasks-done-2026-05-26.md` …, `ux-audit-fixed.md`, `VERIFICATION_REPORT.md` if still present) → `docs/archive/`
- Add: `docs/README.md` index listing canonical docs (ARCHITECTURE, api, database, validation, testing, decisions/) vs archive

**Root cause:** Stale docs instruct reintroducing the service-role key into admin env (secret-leak pattern); tool-output dirs pollute the root.

- [ ] **Step 1: Purge/replace service-role references (grep -l to enumerate; rewrite each section, don't just delete context).**
- [ ] **Step 2: Update `.gitignore` + untrack tool output.** Note `artifacts/admin/.env.local` contains a stale service-role JWT for the deleted project and `TESTSPRITE_API_KEY` — it's git-ignored; leave on disk but scrub the stale `VITE_ADMIN_EMAILS` and service-key lines (it is a local file, safe to edit; preserve `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, Clerk keys, `VITE_API_URL`).
- [ ] **Step 3: Move dated docs to `docs/archive/`, write `docs/README.md`.**
- [ ] **Step 4: Verify:** `rg -n "VITE_SUPABASE_SERVICE_ROLE_KEY" --glob "!node_modules"` → only historical/archive mentions or zero. `git status` clean of tracked tool output. Commit\*\* `docs: purge service-role env guidance, archive session logs, ignore tool output`

---

### Task 14: Split `MessagesManager.tsx` (775 lines)

**Files:**

- Modify: `artifacts/admin/src/features/messages/components/MessagesManager.tsx`
- Create: `artifacts/admin/src/features/messages/hooks/useMessageFilters.ts`
- Create: `artifacts/admin/src/features/messages/hooks/useMessageActions.ts`
- Create: `artifacts/admin/src/features/messages/components/` splits as needed (e.g. `MessageToolbar.tsx`, `MessageDialogs.tsx`) — export via feature barrel if consumed externally

**Root cause:** 3× the 250-line cap; one default export handles filters, presets, pagination, dialogs, keyboard shortcuts.

- [ ] **Step 1: Read the whole file; map state clusters.** Extract (a) filter/preset state → `useMessageFilters`, (b) mutation actions (read/unread/delete/reply/archive) → `useMessageActions`, (c) dialog JSX blocks → child components. Keep `MessagesManager.tsx` as a thin composition shell (< 150 lines). New files under caps (250 hard, components < 100).
- [ ] **Step 2: Run existing messages feature tests first** (baseline green), again after each extraction. No behavior change — refactor only; tests must not need edits except import paths.
- [ ] **Step 3: Verify: `pnpm --filter admin typecheck; pnpm --filter admin test`. Commit** `refactor(admin): decompose MessagesManager into hooks and subcomponents`

---

### Task 15: Split `routes/admin/messages.ts` (~475 lines)

**Files:**

- Modify: `artifacts/api-server/src/routes/admin/messages.ts`
- Create: `artifacts/api-server/src/lib/messages/` modules (e.g. `view-spec.ts` for the ViewSpec DSL, `reply.ts` for reply-mail logic)

**Root cause:** Route file bundles routing + view-spec DSL + scoping + reply-mail logic; bypasses the `createCollectionRouter` pattern used by the other 20+ admin routes.

- [ ] **Step 1: Read the file; extract `ViewSpec` type + `applyViewSpec` into `src/lib/messages/view-spec.ts` (with its tests moved/added there), and reply-mail flow into `src/lib/messages/reply.ts`.** Route file keeps HTTP concerns only, target < 250 lines. Preserve exact Zod schemas and envelope responses.
- [ ] **Step 2: Run api-server tests (messages suites) — behavior identical.**
- [ ] **Step 3: Commit** `refactor(api): extract view-spec and reply logic from admin messages route`

---

### Task 16: Final verification gate

- [ ] **Step 1:** `pnpm -r typecheck` → 0 errors
- [ ] **Step 2:** `pnpm -r lint` (warnings fatal) → 0 errors, within warning budget
- [ ] **Step 3:** `pnpm -r test` → all 8 Vitest projects green
- [ ] **Step 4:** `pnpm --filter portfolio build; pnpm --filter admin build; pnpm --filter api-server build` → all succeed; run bundle-size check `node scripts/... check-bundle-size` (or its CI invocation) → within budgets
- [ ] **Step 5:** `pnpm audit --prod` → 0 HIGH
- [ ] **Step 6: Commit any stragglers; leave branch ready for review/merge.**

---

## Out of Scope (documented, with rationale)

1. **Admin client-side validation (validation layer 4)** — feature-sized: needs schema wiring for every admin form. Track separately; server-side Zod already guards all writes.
2. **Admin components calling Supabase directly** (`ArabicStatus.tsx`, `CvManager.tsx`, `ProjectEditor.tsx` `listEntityImages`) — requires new/changed API endpoints; design decision, track separately.
3. **Portfolio `@workspace/db` direct reads** — deliberate architecture (anon key + RLS + static fallback); migrating to api-server is a redesign, not a bug fix.
4. **Redis-backed rate limiting** — needs infra (`REDIS_URL`); current per-instance limits are self-documented.
5. **Sweep of ~144 `as` assertions** — mechanical mega-change; the unsafe DOM casts are the only urgent ones and can ride along with Task 11 if cheap.
6. **`cv_settings` "draft leak"** — corrected premise: column doesn't exist; no issue.
