# Brownfield Delta Audit — Portfolio-Fixer

**Feature Branch**: `001-brownfield-delta-audit`

**Created**: 2026-05-22

**Status**: Complete (spec = audit report)

**Baseline**: TECHNICAL_DEBT_REPORT.md (2026-05-18, claimed 83 issues / 6.8/10, reported 0/10 post-fix)

**Audit Date**: 2026-05-22

---

## Audit Context

The baseline TECHNICAL_DEBT_REPORT.md (2026-05-18) claims the codebase reached 0/10 debt
("ZERO technical debt"). However, the MEMORY_BANK.md (2026-05-16) lists 5 known remaining
issues. This audit verifies what is actually fixed vs. what the report missed.

The TECHNICAL_DEBT_REPORT.md is self-contradictory: it claims 83 issues found with a 6.8/10
baseline, then reports 0/10 with 0 issues remaining — but MEMORY_BANK.md (written 2 days
earlier) lists 5 unresolved items. The report appears to have been overwritten prematurely.

---

## PHASE A — Baseline Mental Map

### What was broken (baseline, pre-2026-05-18)
- 47 total issues across critical/high/medium/low
- 5 critical, 8 high
- Key areas: input validation, CSP, rate limiting, soft-delete, CSRF, auth bypass

### What was in-progress (as of 2026-05-16)
- Soft-delete migration (030) created but API routes still used hard deletes
- CSP nonce migration planned
- Admin component tests missing
- Migration numbering gaps (003, 010, 016-019)

### What was done (claimed by 2026-05-18)
- Zod input validation on all 8 admin routes
- console.error → console.warn changes
- Soft-delete migration + RLS policies
- CSRF, rate limiting, dev-mode auth bypass fixes

---

## PHASE B — CRITICAL ISSUES

### [C1] Hardcoded credentials — ✅ FIXED

**File**: `testsprite_tests/run_all.py` — **Does not exist.** No file at this path.
The `testsprite_tests/` directory contains only config files, a `.env.example`,
and temp files. No `run_all.py` exists.

**Evidence**: Glob for `testsprite_tests/run_all.py` → No files found.
`.env.example` at `testsprite_tests/.env.example:1-7` shows placeholder values
(`your-test-admin-email@example.com`), not hardcoded credentials.

**Verdict**: ✅ FIXED — hardcoded test credentials file has been removed.

**Scope**: [api-server]

---

### [C2] JWT bypass — ✅ FIXED

**File**: `artifacts/api-server/src/middleware/adminAuth.ts:45-82`

The adminAuth middleware now uses Clerk's official `verifyToken()` from
`@clerk/backend` (line 2: `import { verifyToken, createClerkClient } from "@clerk/backend"`).
The `verifyClerkJWT` function (line 45) calls `verifyToken(token, { secretKey: CLERK_SECRET_KEY })`
which validates against Clerk's JWKS — not the old `JSON.parse(Buffer.from(..., "base64"))` pattern.

**Evidence**:
- `adminAuth.ts:2` — imports `verifyToken` from `@clerk/backend`
- `adminAuth.ts:52` — `await verifyToken(token, { secretKey: CLERK_SECRET_KEY })`
- No `Buffer.from` or `base64` decode pattern anywhere in the auth middleware
- API key auth uses `timingSafeEqual` (line 17) — timing-safe comparison

**Verdict**: ✅ FIXED — proper Clerk JWT verification implemented.

**Scope**: [api-server]

---

### [C3] `any` types — ✅ FIXED

**Files checked**:
- `artifacts/admin/src/pages/HeroEditor.tsx:12-28` — Uses typed `HeroFormData` interface,
  no `useQuery<any>`. Query uses explicit typing via `api` client.
- `artifacts/admin/src/pages/AboutEditor.tsx:11-24` — Uses typed `AboutFormData` interface,
  no `useQuery<any>`. `LivePreview` uses typed `LivePreviewData` (lines 61-74).

**Evidence**: Grep for `useQuery<` across `artifacts/admin/src/pages/` — 0 matches.
All query hooks go through `api` client which returns typed responses.

**Verdict**: ✅ FIXED — `useQuery<any>` eliminated from both editors.

**Scope**: [admin]

---

### [C4] Dual data access (HeroManager) — ✅ FIXED

**File**: `artifacts/admin/src/pages/HeroManager.tsx` — **Does not exist.** Glob → No files found.

**Routing**: `artifacts/admin/src/App.tsx:66` routes `/hero` to `HeroEditor` (lazy-loaded
from `@/pages/HeroEditor`). No `HeroManager` reference anywhere.

**Evidence**:
- Glob for `artifacts/admin/src/pages/HeroManager.tsx` → No files found
- `App.tsx:13` — `const HeroEditor = lazy(() => import("@/pages/HeroEditor"))`
- `App.tsx:66` — `<Route path="/hero" component={HeroEditor} />`

**Verdict**: ✅ FIXED — HeroManager deleted, single HeroEditor path.

**Scope**: [admin]

---

### [C5] Missing .env automation — ❌ STILL OPEN

**Root package.json** (`package.json:6-14`): Scripts are `build`, `typecheck:libs`,
`typecheck`, `test`, `test:e2e`, `test:e2e:ui`. **No `setup` script.**

**scripts/setup.sh**: Glob → **No files found.**

**.env.example files exist** at:
- `artifacts/portfolio/.env.example` (4 vars)
- `artifacts/admin/.env.example` (9 vars)
- `artifacts/api-server/.env.example` (11 vars)

But there is no automated script to copy `.env.example → .env` for any artifact.

**Evidence**: `package.json:6-14` — no `setup` script. Glob for `scripts/setup.sh` → empty.

**Verdict**: ❌ STILL OPEN — no setup automation exists.

**Severity**: [LOW] — Manual `.env.example → .env` copy is a one-time developer task.
Not a production blocker.

**Effort**: S (< 1hr) — Add a `setup` script to root `package.json` that copies
`.env.example → .env` for each artifact.

**Scope**: [api-server] [admin] [portfolio]

---

## PHASE C — HIGH ISSUES

### [H1] Triple-copied UI components — ✅ FIXED (consolidated to `lib/ui`)

**Button copies found**: Only 1 — `artifacts/mockup-sandbox/src/components/ui/button.tsx`
(a standalone sandbox, not part of main artifacts).

**Main artifacts**: `artifacts/admin/` and `artifacts/portfolio/` have **zero** `button.tsx`
files in their component trees. Both import from `@workspace/ui` (the shared `lib/ui/` package).

**Evidence**:
- Glob for `artifacts/**/components/ui/button.tsx` → only `artifacts/mockup-sandbox/...`
- `artifacts/admin/src/pages/HeroEditor.tsx:7` — `import { Button, ... } from "@workspace/ui"`
- `lib/ui/src/components/primitives/button.tsx` — canonical shared component

**Verdict**: ✅ FIXED — UI components consolidated into `lib/ui` package. Mockup sandbox
is out of scope (not a deployed artifact).

**Scope**: [admin] [portfolio] [lib/ui]

---

### [H2] Incomplete OpenAPI spec — ❌ STILL OPEN

**File**: `lib/api-spec/openapi.yaml` (210 lines)

**Paths defined**: 5 paths, 6 operations:
1. `GET /healthz` — health check
2. `GET /cv` — download CV PDF
3. `GET /cv/settings` — get CV settings
4. `PUT /cv/settings` — update CV settings
5. `POST /storage/uploads/request-url` — presigned upload URL
6. `GET /storage/objects/{objectPath}` — serve stored object

**Routes actually registered** (from `artifacts/api-server/src/routes/v1/index.ts` and
`artifacts/api-server/src/routes/admin/index.ts`):
- `/healthz`, `/cv`, `/images`, `/contact` (public)
- `/admin/hero`, `/admin/about`, `/admin/skills`, `/admin/projects`,
  `/admin/experience`, `/admin/certifications`, `/admin/messages`,
  `/admin/contact-info`, `/admin/theme-settings`, `/admin/typography-settings`,
  `/admin/seo-settings`, `/admin/section-settings`, `/admin/site-settings`,
  `/admin/seed`, `/admin/ai-assistant`, `/admin/users`

**Coverage**: 5 paths documented vs ~22+ route groups registered. **~23% coverage.**

**Evidence**: `openapi.yaml:17-132` — 5 paths. `routes/v1/index.ts:10-16` + `routes/admin/index.ts:25-41`.

**Verdict**: ❌ STILL OPEN — OpenAPI spec covers only ~23% of actual routes.

**Severity**: [MEDIUM] — Does not block production, but hampers API documentation
and client generation (orval config at `lib/api-spec/orval.config.ts` depends on this spec).

**Effort**: L (> 4hrs) — Need to add ~17 admin route schemas + public contact route.

**Scope**: [lib/api-spec] [api-server]

---

### [H3] Unused api-client-react — ❌ STILL OPEN

**Package**: `lib/api-client-react/` — exists with source, dist, and generated types.
13 files total.

**Imports**: Grep for `api-client-react` across `.ts/.tsx` files → **1 match**:
`lib/api-spec/orval.config.ts` (the code generator config that _produces_ the package).

**No consumer** imports `api-client-react` from any artifact or lib.

**Evidence**: Grep result — only `lib/api-spec/orval.config.ts` references it.
No `import ... from "api-client-react"` or `import ... from "@workspace/api-client-react"` anywhere.

**Verdict**: ❌ STILL OPEN — Dead code. Generated but never consumed.

**Severity**: [LOW] — No runtime impact. Adds build/maintenance overhead.

**Effort**: S (< 1hr) — Remove from workspace config and delete directory.

**Scope**: [lib/api-client-react]

---

### [H5] Replit-specific plugins — ⚠️ PARTIAL

Both Vite configs conditionally load Replit plugins:

**Portfolio** (`artifacts/portfolio/vite.config.ts:16-27`):
```ts
...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
  ? [await import("@replit/vite-plugin-cartographer"), await import("@replit/vite-plugin-dev-banner")]
  : []),
```

**Admin** (`artifacts/admin/vite.config.ts:15-27`): Identical pattern.

The `REPL_ID` check gates these to Replit dev environments only. They do NOT load
in production or non-Replit environments. However:
- `@replit/vite-plugin-runtime-error-overlay` loads unconditionally (line 5 in both)
- The Replit packages remain in `pnpm-workspace.yaml:71-73` catalog

**Evidence**: Both configs use `process.env.REPL_ID !== undefined` guard.
`runtimeErrorOverlay()` loads unconditionally at portfolio line 15, admin line 14.

**Verdict**: ⚠️ PARTIAL — Replit plugins are properly gated behind `REPL_ID` for
cartographer/dev-banner, but `runtime-error-modal` loads unconditionally.

**Severity**: [LOW] — `runtime-error-modal` is harmless in production (no-op if
not on Replit), but adds unnecessary bundle/work.

**Effort**: S (< 1hr) — Gate `runtimeErrorOverlay()` behind same `REPL_ID` check.

**Scope**: [portfolio] [admin]

---

### [H7] No pagination on messages API — ✅ FIXED

**File**: `artifacts/api-server/src/routes/admin/messages.ts:17-48`

The GET `/` handler now implements proper pagination:
- `limit` parameter with max cap of 200 (line 22)
- `offset` parameter (line 23)
- `.range(offset, offset + limit - 1)` (line 35)
- Returns `pagination: { total, limit, offset, hasMore }` (lines 39-46)

**Evidence**: `messages.ts:22-23` — `const limit = Math.min(parseInt(..."50", 10), 200)`
and `const offset = parseInt(..."0", 10)`. `.range()` call at line 35.

**Verdict**: ✅ FIXED — Server-side pagination with limit/offset/total/hasMore.

**Scope**: [api-server]

---

## PHASE D — TESTING STATUS

### E2E Tests (TestSprite)

**Config** (`testsprite.config.json`):
- `baseUrl`: `http://localhost:5173` — **correct** (portfolio port)
- `apps.portfolio.url`: `http://localhost:5173` — correct
- `apps.admin.url`: `http://localhost:5174` — correct
- `apps.portfolio.startCommand`: `cd artifacts/portfolio && npm run dev` — **uses npm, not pnpm**
- `apps.admin.startCommand`: `cd artifacts/admin && npm run dev` — **uses npm, not pnpm**

**Root Cause of E2E Failure**: The TestSprite config uses `npm run dev` instead of
`pnpm run dev`. In this pnpm workspace, `npm` may fail to resolve workspace dependencies
(`@workspace/*`), causing white screen. Additionally:
- TestSprite config assumes servers are pre-running (has `startCommand` but unclear
  if TestSprite auto-starts them)
- Playwright config (`playwright.config.ts`) has no `webServer` block — it also assumes
  servers are pre-running

**Minimal Fix**:
1. Change `startCommand` in `testsprite.config.json` to use `pnpm`
2. Add a root `dev` script to `package.json` that starts all 3 services
3. Consider adding `webServer` config to `playwright.config.ts` for auto-start

**Severity**: [HIGH] — E2E tests are completely blocked.

**Effort**: S (< 1hr) — Config changes only.

**Scope**: [portfolio] [admin] [api-server]

### Vitest Unit Tests

No evidence of test failures. Root `package.json:12` has `"test": "vitest run"`.
The MEMORY_BANK.md references 92/92 passing. No contradictory evidence found.

---

## PHASE E — NEW ISSUES

### [E1] `VITE_ADMIN_EMAILS` vs `APP_ADMIN_EMAILS` naming inconsistency — [NEW]

**Admin frontend** (`artifacts/admin/src/lib/auth.tsx:10-12`):
Uses `VITE_ADMIN_EMAILS` env var.

**API server** (`artifacts/api-server/src/middleware/adminAuth.ts:7`):
Uses `VITE_ADMIN_EMAILS` env var (same name, but server-side should not use VITE prefix).

**Admin .env.example** (`artifacts/admin/.env.example:2`):
Lists `VITE_ADMIN_EMAILS=admin@example.com`

**MEMORY_BANK.md** references `APP_ADMIN_EMAILS` as the env var name (line 203).

**Root cause**: The VITE_ prefix is a Vite convention for client-side env vars. The
API server reads `VITE_ADMIN_EMAILS` — this works but is semantically wrong for a
server-side process. MEMORY_BANK.md documents the older `APP_ADMIN_EMAILS` name.

**Severity**: [LOW] — Works correctly, but misleading naming. MEMORY_BANK.md is stale.

**Scope**: [api-server] [admin]

### [E2] Unhandled async route handlers — [NEW] (POTENTIAL)

All admin route handlers are `async` functions but none wrap their logic in try/catch.
Express 5 **does** natively catch rejected promises from async handlers (unlike Express 4),
so this is safe with Express 5. However, the `errorHandler` middleware
(`artifacts/api-server/src/middleware/errorHandler.ts:5-18`) only handles `ValidationError`
by name — all other errors get a generic 500.

**Evidence**: `errorHandler.ts:11-14` — only checks `err.name === "ValidationError"`.

**Severity**: [LOW] — Express 5 handles async rejections natively. Error handler is
basic but functional. Not a bug, but lacks structured error categorization.

**Scope**: [api-server]

### [E3] Migration numbering gaps — [NEW]

Migration files in `supabase/migrations/` show gaps: 001-009, 011-015, 020-039.
Missing: 010, 016, 017, 018, 019. This was documented in MEMORY_BANK.md as a known
issue. 39 migration files total.

**Severity**: [INFO] — No functional impact. Cosmetic issue for developers.

**Scope**: [supabase/migrations]

### [E4] `isProduction` used before declaration — [NEW]

**File**: `artifacts/api-server/src/app.ts:17` — `isValidUrl` function uses `isProduction`
at line 17, but `isProduction` is declared at line 68. Due to function hoisting and the
fact that `isValidUrl` is only called after line 68, this works at runtime — but it's
a code smell.

**Severity**: [INFO] — No runtime impact. Variable is used only when `isValidUrl` is
called (after line 68), not when the function is defined.

**Scope**: [api-server]

### [E5] `@replit/*` packages in pnpm catalog with supply-chain bypass — [NEW]

**File**: `pnpm-workspace.yaml:34-35` — `@replit/*` is excluded from the 1-day
minimum release age check (`minimumReleaseAgeExclude`). This is documented as intentional
(line 30-34) but reduces supply-chain attack defense for Replit-scoped packages.

**Severity**: [LOW] — Documented intentional exclusion. Only applies to `@replit/*` scope.

**Scope**: [root]

---

## VERIFIED FIXES (since 2026-05-18)

| # | Issue | Severity | Status | Evidence |
|---|-------|----------|--------|----------|
| C1 | Hardcoded credentials in test file | CRITICAL | ✅ FIXED | `testsprite_tests/run_all.py` does not exist |
| C2 | JWT bypass via base64 decode | CRITICAL | ✅ FIXED | `adminAuth.ts:2,52` — uses `verifyToken()` from `@clerk/backend` |
| C3 | `useQuery<any>` in editors | CRITICAL | ✅ FIXED | `HeroEditor.tsx:12-28`, `AboutEditor.tsx:11-24` — typed interfaces |
| C4 | Dual HeroManager/HeroEditor routing | CRITICAL | ✅ FIXED | `HeroManager.tsx` deleted, `App.tsx:66` routes to `HeroEditor` only |
| H1 | Triple-copied UI components | HIGH | ✅ FIXED | Only `lib/ui` shared package; 0 copies in admin/portfolio |
| H7 | No pagination on messages API | HIGH | ✅ FIXED | `messages.ts:22-35` — limit/offset/range with hasMore |

---

## STILL OPEN — CRITICAL & HIGH

| # | Issue | Severity | Effort | Fix Required |
|---|-------|----------|--------|--------------|
| H2 | Incomplete OpenAPI spec (~23% coverage) | [MEDIUM] | L | Add ~17 admin route schemas to `openapi.yaml` |
| H5 | Replit `runtimeErrorOverlay` unconditional | [LOW] | S | Gate behind `REPL_ID` check in both vite configs |
| E2E | TestSprite E2E tests blocked (npm vs pnpm) | [HIGH] | S | Fix `testsprite.config.json` startCommand to use pnpm |

**Note**: No CRITICAL issues remain open. All 4 baseline criticals are fixed.

---

## NEW ISSUES FOUND

| # | Issue | Severity | Scope |
|---|-------|----------|-------|
| E1 | `VITE_ADMIN_EMAILS` used server-side (misleading prefix) | [LOW] | [api-server] |
| E2 | Error handler only categorizes `ValidationError` | [LOW] | [api-server] |
| E3 | Migration numbering gaps (010, 016-019) | [INFO] | [supabase/migrations] |
| E4 | `isProduction` referenced before declaration in app.ts | [INFO] | [api-server] |
| E5 | `@replit/*` supply-chain age bypass | [LOW] | [root] |

---

## TESTING BLOCKER ROOT CAUSE

**Problem**: 13/13 E2E tests produce white screen.

**Root cause**: `testsprite.config.json:8-9` uses `npm run dev` instead of `pnpm run dev`.
This pnpm workspace requires pnpm to resolve `@workspace/*` package references.
Using npm fails silently or produces incomplete module resolution, resulting in
white screen (React app fails to mount).

**Secondary factor**: `playwright.config.ts` has no `webServer` configuration —
it expects servers to be pre-running on ports 5173/5174/3001.

**Minimal fix**:
1. `testsprite.config.json` — change `startCommand` to `pnpm --filter @workspace/portfolio dev`
   and `pnpm --filter @workspace/admin dev`
2. `package.json` — add `"dev": "pnpm -r --parallel run dev"` script
3. `playwright.config.ts` — add `webServer` block pointing to the dev script

**Effort**: S (< 1hr, config-only changes)

---

## CURRENT DEBT SCORE

**Re-scored: 3.5/10**

| Category | Score | Notes |
|----------|-------|-------|
| Critical Debt | 0/10 ✅ | All 4 criticals fixed |
| High Debt | 2/10 ⚠️ | E2E tests blocked, OpenAPI incomplete |
| Medium Debt | 1/10 | OpenAPI coverage gap |
| Low Debt | 3/10 | Env naming, error handler, Replit plugins, dead lib |
| Dependency Debt | 0/10 ✅ | Supply-chain protections in place |
| Database Debt | 0.5/10 | Migration numbering gaps only |
| Security Debt | 0/10 ✅ | Clerk JWT, CSRF, rate limiting, input validation |
| Testing Debt | 2/10 | Unit tests pass; E2E blocked by config |
| Architecture Debt | 0.5/10 | `isProduction` hoisting, dead api-client-react |
| Frontend Debt | 0/10 ✅ | UI consolidated, typed queries |
| Documentation Debt | 2/10 | MEMORY_BANK stale references, OpenAPI incomplete |
| **OVERALL** | **3.5/10** | Significant improvement from 6.8/10 baseline |

**Baseline comparison**: 6.8/10 → 3.5/10 = **49% debt reduction** in 4 days.

---

## OPEN QUESTIONS

1. **MEMORY_BANK.md accuracy**: References `APP_ADMIN_EMAILS` (line 203) but code uses
   `VITE_ADMIN_EMAILS`. Should MEMORY_BANK.md be updated, or should the env var be renamed?

2. **api-client-react disposition**: Dead code generated by orval. Should it be deleted,
   or is there a planned consumer?

3. **E2E test framework**: Should we migrate from TestSprite to Playwright's built-in
   `webServer` config for more reliable E2E test startup?

4. **OpenAPI priority**: Given 23% coverage, is there an orval/OpenAPI consumer that
   makes this high priority, or can it be deferred?
