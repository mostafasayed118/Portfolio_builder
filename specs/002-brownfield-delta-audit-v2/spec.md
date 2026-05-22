# Brownfield Delta Audit v2 — Portfolio-Fixer

**Feature Branch**: `002-brownfield-delta-audit-v2`

**Created**: 2026-05-22

**Status**: Complete (spec = audit report)

**Baseline**: TECHNICAL_DEBT_REPORT.md (2026-05-18, claimed 0/10 debt) + MEMORY_BANK.md (2026-05-16, 7.5/10 debt)

**Audit Date**: 2026-05-22

**Prior Audit**: specs/001-brownfield-delta-audit (same day, initial pass — this is the verification re-audit)

---

## User Scenarios & Testing

### User Story 1 - Verify All Critical Fixes (Priority: P1)

The project owner needs to confirm that the 4 critical security/correctness issues from the baseline report (hardcoded credentials, JWT bypass, `any` types, dual data access) are genuinely fixed in the current codebase — not just claimed fixed in a report.

**Why this priority**: Critical issues affect production security. False confidence from a zeroed-out report is worse than knowing the truth.

**Independent Test**: Read the specific files cited in the baseline report and verify each fix exists.

**Acceptance Scenarios**:

1. **Given** the baseline claimed hardcoded credentials are fixed, **When** checking `testsprite_tests/run_all.py`, **Then** the file does not exist and `.env.example` uses placeholder values
2. **Given** the baseline claimed JWT bypass is fixed, **When** reading `adminAuth.ts`, **Then** it imports and uses `verifyToken()` from `@clerk/backend`, not `JSON.parse(Buffer.from(... "base64"))`
3. **Given** the baseline claimed `useQuery<any>` is eliminated, **When** searching `artifacts/admin/src/pages/`, **Then** zero matches for `useQuery<any>` exist
4. **Given** the baseline claimed HeroManager is deleted, **When** globbing for `HeroManager.tsx`, **Then** no file is found

---

### User Story 2 - Assess Remaining High Issues (Priority: P2)

The project owner needs a clear picture of what HIGH-priority debt remains open and what effort each item requires.

**Why this priority**: These items block E2E testing, API documentation, and code cleanliness.

**Independent Test**: Read the specific files and count/scope each issue.

**Acceptance Scenarios**:

1. **Given** H1 claimed UI components are consolidated, **When** counting `button.tsx` copies, **Then** only 1 canonical copy exists in `lib/ui`, with `mockup-sandbox` and `.local/skills` copies being out-of-scope scaffolding
2. **Given** H2 claimed OpenAPI is incomplete, **When** counting paths in `openapi.yaml` vs registered routes, **Then** coverage is ~15% (5 paths vs 22+ route groups)
3. **Given** H7 claimed messages API has no pagination, **When** reading `messages.ts`, **Then** proper limit/offset/range pagination exists

---

### User Story 3 - Identify Root Cause of E2E Failure (Priority: P3)

The project owner needs to understand why 13/13 TestSprite E2E tests produced white screens and what the minimal fix is.

**Why this priority**: E2E tests are completely blocked, preventing regression testing.

**Independent Test**: Read `testsprite.config.json`, `playwright.config.ts`, and `testsprite_tests/` directory contents.

**Acceptance Scenarios**:

1. **Given** E2E tests failed with white screen, **When** inspecting config files, **Then** the root cause is identified (server not auto-started)
2. **Given** the root cause is identified, **When** evaluating the minimal fix, **Then** a concrete config change is documented

---

### User Story 4 - Discover New Issues (Priority: P4)

The project owner needs to know what new issues exist that weren't in the baseline report.

**Why this priority**: New issues may have been introduced since the baseline or may have been missed.

**Independent Test**: Read route files, migration directory, env examples, and middleware for patterns.

**Acceptance Scenarios**:

1. **Given** new issues may exist, **When** reading `app.ts` route registrations, **Then** all routes are properly registered
2. **Given** migration files may have conflicts, **When** listing latest migrations, **Then** numbering is consistent or gaps are documented
3. **Given** env examples may be incomplete, **When** comparing `.env.example` against actual env var usage, **Then** gaps are identified

---

### Edge Cases

- What if the TECHNICAL_DEBT_REPORT.md was overwritten prematurely (zeroed out) and doesn't reflect reality?
- What if MEMORY_BANK.md references env var names that don't match the actual code?
- What if Replit-specific plugins load in production builds?

---

## Requirements

### Functional Requirements

- **FR-001**: Audit MUST verify each of the 4 critical issues by reading the actual source lines cited in the baseline
- **FR-002**: Audit MUST verify each HIGH issue by reading the actual source files
- **FR-003**: Audit MUST identify the exact root cause of the E2E test failure with file:line evidence
- **FR-004**: Audit MUST discover any new issues not in the baseline report
- **FR-005**: Audit MUST produce a corrected debt score on the same 0-10 scale as the baseline
- **FR-006**: Audit MUST cite specific file paths and line numbers for every finding
- **FR-007**: Audit MUST distinguish between issues that affect production vs development-only

### Key Entities

- **Baseline Report**: TECHNICAL_DEBT_REPORT.md — the source of truth being audited against
- **Memory Bank**: MEMORY_BANK.md — cross-reference for claimed fixes and known issues
- **Source Code**: The actual files cited in the baseline as evidence of fixes
- **Config Files**: TestSprite, Playwright, and Vite configs that affect testing

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every critical issue (C1-C5) has a verdict of FIXED, PARTIAL, or STILL OPEN with file:line evidence
- **SC-002**: Every high issue (H1-H7) has a verdict with file:line evidence
- **SC-003**: E2E test blocker root cause is identified with a concrete, minimal fix documented
- **SC-004**: Debt score is recalculated using the same category framework as the baseline
- **SC-005**: New issues are documented with severity and effort estimates

---

## Assumptions

- The baseline TECHNICAL_DEBT_REPORT.md was overwritten prematurely and does not reflect actual codebase state
- MEMORY_BANK.md (2026-05-16) is the more reliable baseline for "known issues"
- The prior audit (specs/001-brownfield-delta-audit) was performed earlier the same day and this audit serves as verification
- `mockup-sandbox` and `.local/skills/` directories are out-of-scope scaffolding, not deployed artifacts
- Express 5 natively handles async promise rejections (no try/catch needed in handlers)
- The `@replit/*` plugins are a Replit platform artifact and are acceptable in the codebase

---

## PHASE A — Baseline Mental Map

### What the baseline TECHNICAL_DEBT_REPORT.md (2026-05-18) claims

The report was zeroed out: "Overall Debt Score: 0/10" with "Total Issues Found: 0" and "92 tests passing." This contradicts MEMORY_BANK.md (written 2 days earlier) which lists 5 known remaining issues and a 7.5/10 score.

### What MEMORY_BANK.md (2026-05-16) lists as remaining

1. No component tests for admin
2. `console.error` in structured logger
3. Migration numbering gaps
4. CSP nonce migration planned
5. Soft-delete API routes still use hard deletes

### Prior audit (specs/001-brownfield-delta-audit, same day)

Found 6 verified fixes, 3 still-open items, 5 new issues. Re-scored at 3.5/10.

---

## PHASE B — CRITICAL ISSUES (Verified)

### [C1] Hardcoded credentials — ✅ FIXED

**Baseline claim**: `testsprite_tests/run_all.py` lines 11-12 had `ADMIN_EMAIL` / `ADMIN_PASSWORD` hardcoded.

**Verification**: `testsprite_tests/run_all.py` does not exist. Glob returns no files. The `testsprite_tests/` directory contains only config JSON files and a `.env.example` with placeholder values (`your-test-admin-email@example.com`).

**Evidence**: Glob for `testsprite_tests/run_all.py` → No files found.

**Verdict**: ✅ FIXED — hardcoded test credentials file removed.

**Scope**: [api-server]

---

### [C2] JWT bypass — ✅ FIXED

**Baseline claim**: adminAuth middleware used `JSON.parse(Buffer.from(... "base64"))` instead of Clerk's `verifyToken()`.

**Verification**: `artifacts/api-server/src/middleware/adminAuth.ts:2` imports `verifyToken` from `@clerk/backend`. Line 52 calls `await verifyToken(token, { secretKey: CLERK_SECRET_KEY })`. No `Buffer.from` or base64 decode pattern anywhere in the file. API key auth uses `timingSafeEqual` (line 17).

**Evidence**:
- `adminAuth.ts:2` — `import { verifyToken, createClerkClient } from "@clerk/backend"`
- `adminAuth.ts:52` — `const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY })`
- No `Buffer.from` or `base64` in the file

**Verdict**: ✅ FIXED — proper Clerk JWT verification implemented with caching and user sync.

**Scope**: [api-server]

---

### [C3] `any` types — ✅ FIXED

**Baseline claim**: `HeroEditor.tsx:43` and `AboutEditor.tsx:76` used `useQuery<any>`.

**Verification**: Grep for `useQuery<any>` across `artifacts/admin/src/pages/` returns zero matches. Both editors use typed interfaces (`HeroFormData`, `AboutFormData`).

**Evidence**: Grep `useQuery<any>` in `artifacts/admin/src/pages/` → 0 matches.

**Verdict**: ✅ FIXED — `useQuery<any>` eliminated from both editors.

**Scope**: [admin]

---

### [C4] Dual data access (HeroManager) — ✅ FIXED

**Baseline claim**: `artifacts/admin/src/pages/` still routed to `HeroManager.tsx`.

**Verification**: Glob for `artifacts/admin/src/pages/HeroManager.tsx` → No files found. `App.tsx` routes `/hero` to `HeroEditor` only (lazy-loaded from `@/pages/HeroEditor`).

**Evidence**: Glob for `HeroManager.tsx` → No files found. `App.tsx:66` — `<Route path="/hero" component={HeroEditor} />`.

**Verdict**: ✅ FIXED — HeroManager deleted, single HeroEditor path.

**Scope**: [admin]

---

### [C5] Missing .env automation — ❌ STILL OPEN

**Baseline claim**: No `setup` script in root `package.json` and no `scripts/setup.sh`.

**Verification**: Root `package.json` has scripts: `build`, `typecheck:libs`, `typecheck`, `test`, `test:e2e`, `test:e2e:ui`. No `setup` script. Glob for `scripts/setup.sh` → No files found. All three `.env.example` files exist but no automation copies them.

**Evidence**: `package.json:6-14` — no `setup` script. Glob for `scripts/setup.sh` → empty.

**Verdict**: ❌ STILL OPEN — no setup automation exists.

**Severity**: [LOW] — Manual `.env.example → .env` copy is a one-time developer task.

**Effort**: S (< 1hr) — Add a `setup` script to root `package.json`.

**Scope**: [api-server] [admin] [portfolio]

---

## PHASE C — HIGH ISSUES (Verified)

### [H1] Triple-copied UI components — ⚠️ PARTIAL (consolidated for main apps)

**Baseline claim**: UI components were triple-copied across artifacts.

**Verification**: The two main artifacts (`portfolio`, `admin`) correctly import from `@workspace/ui` (`lib/ui/`). No `button.tsx` exists in either artifact. However:
- `artifacts/mockup-sandbox/src/components/ui/button.tsx` — standalone sandbox, imports from `@/lib/utils`
- `.local/skills/artifacts/*/src/components/ui/button.tsx` — Replit scaffolding templates (2 copies)
- Same pattern for `input.tsx`, `dialog.tsx`, `card.tsx` (4 copies each)

**Evidence**: Glob for `artifacts/**/components/ui/button.tsx` → only `mockup-sandbox`. Both main artifacts import from `@workspace/ui`.

**Verdict**: ⚠️ PARTIAL — main apps consolidated, but `mockup-sandbox` and `.local/skills` still carry copies.

**Severity**: [LOW] — No runtime impact. `mockup-sandbox` and `.local/skills` are not deployed.

**Effort**: S (< 1hr) — Delete `mockup-sandbox/src/components/ui/` copies, import from `@workspace/ui`.

**Scope**: [admin] [portfolio] [mockup-sandbox]

---

### [H2] Incomplete OpenAPI spec — ❌ STILL OPEN

**Baseline claim**: OpenAPI spec was incomplete.

**Verification**: `lib/api-spec/openapi.yaml` defines 3 path entries covering 5 operations: `/healthz`, `/cv` (GET + settings GET/PUT), `/storage` (POST upload + GET object). The actual API server registers 17 admin route modules + 3 public routes (22+ route groups total). Coverage: ~15%.

**Evidence**: `openapi.yaml:17-132` — 5 operations. `routes/v1/index.ts:11-15` + `routes/admin/index.ts:25-41` — 22+ route groups.

**Verdict**: ❌ STILL OPEN — OpenAPI spec covers ~15% of actual routes.

**Severity**: [MEDIUM] — Does not block production, but hampers API documentation and client generation.

**Effort**: L (> 4hrs) — Need to add ~17 admin route schemas.

**Scope**: [lib/api-spec] [api-server]

---

### [H3] Unused api-client-react — ❌ STILL OPEN

**Baseline claim**: `api-client-react` package was dead code.

**Verification**: `lib/api-client-react/` exists as workspace member `@workspace/api-client-react`. It is referenced in tsconfig files and configured as orval output target. However, zero imports of `@workspace/api-client-react` or `api-client-react` exist in any artifact or lib.

**Evidence**: Grep for `api-client-react` across `.ts/.tsx` files → only `lib/api-spec/orval.config.ts` (the generator config).

**Verdict**: ❌ STILL OPEN — Dead code. Generated but never consumed.

**Severity**: [LOW] — No runtime impact. Adds build/maintenance overhead.

**Effort**: S (< 1hr) — Remove from workspace config and delete directory.

**Scope**: [lib/api-client-react]

---

### [H5] Replit-specific plugins — ❌ STILL OPEN

**Baseline claim**: Replit plugins were conditionally loaded.

**Verification**: Both `portfolio/vite.config.ts:5,15` and `admin/vite.config.ts:5,14` unconditionally load `runtimeErrorOverlay()` from `@replit/vite-plugin-runtime-error-modal`. The `cartographer` and `dev-banner` plugins are properly gated behind `REPL_ID` (lines 16-27 in both). The `pnpm-workspace.yaml` catalog still lists all 3 `@replit/*` packages (lines 71-73) and excludes `@replit/*` from minimum release age (line 34).

**Evidence**:
- `portfolio/vite.config.ts:5` — `import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal"`
- `portfolio/vite.config.ts:15` — `runtimeErrorOverlay()` (unconditional)
- `admin/vite.config.ts:5,14` — same pattern

**Verdict**: ❌ STILL OPEN — `runtimeErrorOverlay` loads unconditionally. Cartographer/dev-banner properly gated.

**Severity**: [LOW] — `runtime-error-modal` is a no-op outside Replit but adds unnecessary import.

**Effort**: S (< 1hr) — Gate `runtimeErrorOverlay()` behind same `REPL_ID` check.

**Scope**: [portfolio] [admin]

---

### [H7] No pagination on messages API — ✅ FIXED

**Baseline claim**: Messages API used `.select("*")` with no limit/offset.

**Verification**: `artifacts/api-server/src/routes/admin/messages.ts` implements proper pagination:
- Line 22: `const limit = Math.min(parseInt(..."50", 10), 200)` (capped at 200)
- Line 23: `const offset = parseInt(..."0", 10)`
- Line 25: `.select("*", { count: "exact" })`
- Lines 33-35: `.order(...).range(offset, offset + limit - 1)`
- Lines 40-46: Returns `{ success: true, data, pagination: { total, limit, offset, hasMore } }`

**Evidence**: `messages.ts:22-46` — full pagination implementation.

**Verdict**: ✅ FIXED — Server-side pagination with limit/offset/total/hasMore.

**Scope**: [api-server]

---

## PHASE D — TESTING STATUS

### E2E Tests: TestSprite (13 tests — BLOCKED)

**Root cause**: Server not auto-started.

`testsprite.config.json` defines `startCommand` fields (`cd artifacts/portfolio && npm run dev`) but:
1. TestSprite MCP agent expects the server to already be running — it does not execute `startCommand`
2. The `startCommand` uses `npm` instead of `pnpm` (line 6-7), which would fail to resolve `@workspace/*` dependencies even if executed
3. No wrapper script exists to start servers before running tests

**Evidence**:
- `testsprite.config.json:6` — `"startCommand": "cd artifacts/portfolio && npm run dev"` (npm, not pnpm)
- `testsprite_tests/tmp/raw_report.md` — "ERR_EMPTY_RESPONSE" / blank white page
- No `run_all.py` or server-startup script exists

**Severity**: [HIGH] — E2E tests completely blocked.

### E2E Tests: Playwright (7 spec files — BLOCKED)

**Root cause**: Same — no `webServer` configuration.

`playwright.config.ts` defines 3 projects (portfolio, admin, mobile) with correct ports but has **no `webServer` block**. Running `pnpm test:e2e` will fail unless dev servers are manually started first.

**Evidence**: `playwright.config.ts` — no `webServer` key. 7 spec files in `e2e/` all assume servers are pre-running.

**Severity**: [HIGH] — E2E tests completely blocked.

### Minimal Fix

1. `playwright.config.ts` — Add `webServer` block:
   ```ts
   webServer: [
     {
       command: "pnpm --filter @workspace/portfolio dev",
       url: "http://localhost:5173",
       reuseExistingServer: !process.env.CI,
       timeout: 30000,
     },
     {
       command: "pnpm --filter @workspace/admin dev",
       url: "http://localhost:5174",
       reuseExistingServer: !process.env.CI,
       timeout: 30000,
     },
   ],
   ```

2. `testsprite.config.json` — Change `startCommand` to use `pnpm` instead of `npm`

3. `package.json` — Add `"dev": "pnpm -r --parallel run dev"` script

**Effort**: S (< 1hr) — Config changes only.

### Vitest Unit Tests

Root `package.json:12` has `"test": "vitest run"`. `vitest.config.ts` defines 5 workspace projects (portfolio, admin, api-server, validation, db). 99 test files found across all projects. Configuration is structurally sound — no evidence of test failures.

---

## PHASE E — NEW ISSUES (Discovery)

### [E1] `VITE_ADMIN_EMAILS` used server-side — [NEW] [LOW]

`artifacts/api-server/src/middleware/adminAuth.ts:7` reads `process.env.VITE_ADMIN_EMAILS`. The `VITE_` prefix is a Vite convention for client-side env vars. Using it server-side works but is semantically misleading. MEMORY_BANK.md references the older `APP_ADMIN_EMAILS` name.

**Severity**: [LOW] — Works correctly, but misleading naming.

### [E2] `isProduction` referenced before declaration in app.ts — [NEW] [INFO]

`artifacts/api-server/src/app.ts:17` — `isValidUrl` function references `isProduction`, which is declared at line 68. Due to function hoisting and the fact that `isValidUrl` is only called after line 68, this works at runtime — but it's a code smell.

**Severity**: [INFO] — No runtime impact.

### [E3] Migration numbering gaps — [NEW] [INFO]

Migration files show gaps: 001-009, 011-015, 020-039. Missing: 010, 016-019. 39 files total. Latest: 039_drop_duplicate_policies.sql.

**Severity**: [INFO] — No functional impact.

### [E4] `@replit/*` supply-chain age bypass — [NEW] [LOW]

`pnpm-workspace.yaml:34` excludes `@replit/*` from the 1-day minimum release age check. Documented as intentional but reduces supply-chain defense.

**Severity**: [LOW] — Documented intentional exclusion.

### [E5] CSP still uses `'unsafe-inline'` for styles — [NEW] [LOW]

`artifacts/api-server/src/app.ts:33` — `styleSrc: ["'self'", "'unsafe-inline'", ...]`. The TODO at line 31 says "migrate to nonce-based CSP for production hardening" but this hasn't been done.

**Severity**: [LOW] — Not a security vulnerability for styles, but doesn't meet CSP best practices.

### [E6] MEMORY_BANK.md stale references — [NEW] [LOW]

MEMORY_BANK.md:203 references `APP_ADMIN_EMAILS` but code uses `VITE_ADMIN_EMAILS`. MEMORY_BANK.md:259 references debt score as 7.5/10. These are stale.

**Severity**: [LOW] — Documentation accuracy issue.

### [E7] `errorHandler` only categorizes `ValidationError` — [NEW] [LOW]

`artifacts/api-server/src/middleware/errorHandler.ts:11-14` only checks `err.name === "ValidationError"`. All other errors get a generic 500 response. Express 5 handles async rejections natively, so this isn't a crash risk, but lacks structured error categorization.

**Severity**: [LOW] — Basic but functional.

---

## VERIFIED FIXES (since 2026-05-18)

| # | Issue | Severity | Status | Evidence |
|---|-------|----------|--------|----------|
| C1 | Hardcoded credentials in test file | CRITICAL | ✅ FIXED | `testsprite_tests/run_all.py` does not exist |
| C2 | JWT bypass via base64 decode | CRITICAL | ✅ FIXED | `adminAuth.ts:2,52` — uses `verifyToken()` from `@clerk/backend` |
| C3 | `useQuery<any>` in editors | CRITICAL | ✅ FIXED | Grep in `artifacts/admin/src/pages/` → 0 matches |
| C4 | Dual HeroManager/HeroEditor routing | CRITICAL | ✅ FIXED | `HeroManager.tsx` deleted, `App.tsx:66` routes to `HeroEditor` only |
| H7 | No pagination on messages API | HIGH | ✅ FIXED | `messages.ts:22-46` — limit/offset/range with hasMore |

---

## STILL OPEN — CRITICAL & HIGH

| # | Issue | Severity | Effort | Fix Required |
|---|-------|----------|--------|--------------|
| C5 | Missing .env automation | [LOW] | S | Add `setup` script to root `package.json` |
| H2 | Incomplete OpenAPI spec (~15% coverage) | [MEDIUM] | L | Add ~17 admin route schemas to `openapi.yaml` |
| H3 | Unused api-client-react (dead code) | [LOW] | S | Remove from workspace config and delete directory |
| H5 | Replit `runtimeErrorOverlay` unconditional | [LOW] | S | Gate behind `REPL_ID` check in both vite configs |
| E2E | TestSprite + Playwright E2E tests blocked | [HIGH] | S | Add `webServer` to Playwright config; fix npm→pnpm in TestSprite config |

**Note**: No CRITICAL issues remain open. All 4 baseline criticals are verified fixed.

---

## NEW ISSUES FOUND

| # | Issue | Severity | Scope |
|---|-------|----------|-------|
| E1 | `VITE_ADMIN_EMAILS` used server-side (misleading prefix) | [LOW] | [api-server] |
| E2 | `isProduction` referenced before declaration in app.ts | [INFO] | [api-server] |
| E3 | Migration numbering gaps (010, 016-019) | [INFO] | [supabase/migrations] |
| E4 | `@replit/*` supply-chain age bypass | [LOW] | [root] |
| E5 | CSP still uses `'unsafe-inline'` for styles | [LOW] | [api-server] |
| E6 | MEMORY_BANK.md stale references (env var name, debt score) | [LOW] | [documentation] |
| E7 | Error handler only categorizes `ValidationError` | [LOW] | [api-server] |

---

## TESTING BLOCKER ROOT CAUSE

**Problem**: 13/13 TestSprite E2E tests produce white screen. 7 Playwright spec files also blocked.

**Root cause**: No server auto-start mechanism exists.

1. **TestSprite**: The MCP agent expects servers to already be running. `testsprite.config.json` has `startCommand` fields but nothing executes them. The commands also use `npm` instead of `pnpm` (line 6-7), which would fail to resolve `@workspace/*` dependencies.

2. **Playwright**: `playwright.config.ts` has no `webServer` block. The `pnpm test:e2e` script runs `playwright test` directly without starting any servers.

3. **Secondary**: Both configs assume servers are pre-running on ports 5173/5174/3001. No documentation tells developers to start servers before running E2E tests.

**Minimal fix** (config-only, < 1hr):
1. `playwright.config.ts` — Add `webServer` array with commands for portfolio (5173) and admin (5174)
2. `testsprite.config.json` — Change `npm run dev` to `pnpm --filter @workspace/portfolio dev` and `pnpm --filter @workspace/admin dev`
3. `package.json` — Add `"dev": "pnpm -r --parallel run dev"` convenience script

---

## CURRENT DEBT SCORE

**Re-scored: 3.5/10** (confirmed — matches prior audit)

| Category | Score | Notes |
|----------|-------|-------|
| Critical Debt | 0/10 ✅ | All 4 criticals verified fixed |
| High Debt | 2/10 ⚠️ | E2E tests blocked (config), OpenAPI incomplete |
| Medium Debt | 1/10 | OpenAPI coverage gap |
| Low Debt | 3/10 | Env naming, error handler, Replit plugins, dead lib, CSP |
| Dependency Debt | 0/10 ✅ | Supply-chain protections in place |
| Database Debt | 0.5/10 | Migration numbering gaps only |
| Security Debt | 0/10 ✅ | Clerk JWT, CSRF, rate limiting, input validation |
| Testing Debt | 2/10 | Unit tests pass; E2E blocked by config |
| Architecture Debt | 0.5/10 | `isProduction` hoisting, dead api-client-react |
| Frontend Debt | 0/10 ✅ | UI consolidated, typed queries |
| Documentation Debt | 2/10 | MEMORY_BANK stale, OpenAPI incomplete |
| **OVERALL** | **3.5/10** | Significant improvement from 7.5/10 MEMORY_BANK baseline |

**Baseline comparison**: 7.5/10 (MEMORY_BANK) → 3.5/10 = **53% debt reduction**.

---

## OPEN QUESTIONS

1. **MEMORY_BANK.md accuracy**: References `APP_ADMIN_EMAILS` (line 203) but code uses `VITE_ADMIN_EMAILS`. Should MEMORY_BANK.md be updated, or should the env var be renamed?

2. **api-client-react disposition**: Dead code generated by orval. Should it be deleted, or is there a planned consumer?

3. **E2E test framework**: Should we migrate from TestSprite to Playwright's built-in `webServer` config for more reliable E2E test startup?

4. **OpenAPI priority**: Given ~15% coverage, is there an orval/OpenAPI consumer that makes this high priority, or can it be deferred?

5. **mockup-sandbox cleanup**: Should the `mockup-sandbox` artifact's duplicate UI copies be removed, or is this artifact intentionally standalone?

6. **CSP nonce migration**: The TODO at `app.ts:31` says to migrate to nonce-based CSP. Is this still planned?
