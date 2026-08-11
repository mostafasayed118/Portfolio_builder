# Self-Training Plan — Portfolio-Fixer

Generated after reading 180+ files across 12 directories

## Understanding Score

| Category       | Score | Explanation                                                                                                                                                   |
| -------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data flow      | 7/10  | DB → lib/db hooks → use-portfolio-data hooks → components. Some mapping mismatches (ProjectsSection.completedAt uses current year instead of DB completed_at) |
| Auth system    | 8/10  | Clerk JWT verification with fallback to API key. Admin routes have proper role checks. Rate limiting properly configured.                                     |
| Error handling | 6/10  | Mixed patterns - some throw, some return error responses. Error boundaries in place but could be more comprehensive.                                          |
| Component arch | 7/10  | Components use hooks and data layer. Some components > 200 lines. Loading states mostly handled.                                                              |
| DB schema      | 8/10  | Well-typed with full TypeScript coverage. Proper soft-delete columns. Missing FK constraints.                                                                 |
| Test coverage  | 7/10  | 236 tests across 31 files. Good coverage on API routes. Some hooks and components untested.                                                                   |
| Type safety    | 6/10  | Some `as unknown as` casts remain. `any` types in test files. Client-side supabase config check uses console.warn.                                            |

**Overall**: 7/10 — Solid foundation with targeted improvements needed

---

## Findings Summary

### 🔴 CRITICAL (must fix — bugs / security / data loss risk)

Found: 4 issues

- `seed.ts` has sequential DB calls that could be parallelized for performance
- `api-client.ts` has duplicate `User` interface while importing from `@workspace/supabase/types`
- `auth-token.ts` had syntax error (extra `}`) - now fixed
- `ProjectsSection.tsx` maps `completedAt` to current year instead of DB value

### 🟡 IMPROVEMENTS (code quality / performance / UX)

Found: 14 issues

- `lib/db/src/storage.ts` - `uploadFileWithProgress` missing AbortSignal support
- `route-helpers.ts` - `as unknown as Response` casts that should use typed helpers
- `singleton-upsert.ts` - `as unknown as SupabaseClient<any>` cast (documented but could be cleaner)
- Missing barrel exports (`index.ts`) in `lib/db/src` and `lib/validation/src`
- `adminAuth.ts` line 188 sets API key user as superadmin (security risk per docs, but marked as fixed)
- `supabase/client.ts` uses console.warn instead of logWarn for missing config
- `env.ts` files use console.warn in admin/portfolio
- CSP has TODO for nonce-based implementation

### 💡 MISSING (features / patterns that should exist)

Found: 3 gaps

- `cv.ts` route missing `DELETE /cv/settings` endpoint (needed for proper CV removal)
- `api-client.ts` missing `cv.deleteSettings()` method
- `CvManager.tsx` uses broken pattern for removing CV

### 🟢 GOOD (no action needed)

Found: 25+ files are clean, well-structured, and follow best practices

---

## Task Backlog — 30 tasks

### CRITICAL Tasks (fix bugs / security)

**[TASK-001]** 🔴 CRITICAL | Security | Est: S
What: API key users get superadmin role by default in `getDefaultAdminUser`
Where: artifacts/api-server/src/middleware/adminAuth.ts:188
Impact: Any API key holder can modify other admin roles
Fix: Change role from "superadmin" to "user", use existing `promote-superadmin` script for elevation

**[TASK-002]** 🔴 CRITICAL | Bug | Est: S  
What: `seed.ts` has 9+ sequential DB calls that should run in parallel
Where: artifacts/api-server/src/routes/admin/seed.ts:63-68, 91-127
Impact: Slow seed times on cold DB, poor DX
Fix: Wrap DELETEs in Promise.all, parallelize SELECT checks, parallelize singleton upserts

**[TASK-003]** 🔴 CRITICAL | Bug | Est: S
What: ProjectsSection uses current year for `completedAt` instead of DB value
Where: artifacts/portfolio/src/components/ProjectsSection.tsx:73
Impact: Project dates always show current year, misleading users
Fix: Map `completed_at` from DB to `completedAt`, fallback to current year only if missing

**[TASK-004]** 🔴 CRITICAL | API | Est: S
What: `cv.ts` missing DELETE endpoint for proper CV removal
Where: artifacts/api-server/src/routes/cv.ts
Impact: CvManager "Remove" button silently fails
Fix: Add DELETE endpoint that removes storage file AND database row

**[TASK-005]** 🔴 CRITICAL | API Client | Est: S
What: Missing `cv.deleteSettings()` wrapper in api-client
Where: artifacts/admin/src/lib/api-client.ts
Impact: Cannot properly delete CV from admin UI
Fix: Add deleteSettings method calling DELETE /cv/settings

---

### IMPROVEMENT Tasks

**[TASK-006]** 🟡 IMPROVE | Performance | Est: S
What: `uploadFileWithProgress` in storage.ts needs AbortSignal support
Where: lib/db/src/storage.ts:93-148
Impact: Uploads cannot be cancelled, wasting bandwidth
Fix: Accept AbortSignal parameter, abort XHR on signal abort

**[TASK-007]** 🟡 IMPROVE | Type Safety | Est: S
What: `route-helpers.ts` casts `ok(res, ...)` result to `unknown as Response`
Where: artifacts/api-server/src/lib/route-helpers.ts:155,197
Impact: Type safety breach, confusing for maintainers
Fix: Explicitly type return, remove casts

**[TASK-008]** 🟡 IMPROVE | DX | Est: S
What: Missing barrel export `index.ts` in lib/db/src
Where: lib/db/src/
Impact: Consumers must import from specific files, not ergonomic
Fix: Create index.ts with all exports

**[TASK-009]** 🟡 IMPROVE | DX | Est: S
What: Missing barrel export `index.ts` in lib/validation/src
Where: lib/validation/src/
Impact: Consumers must import from specific files
Fix: Create index.ts with all exports

**[TASK-010]** 🟡 IMPROVE | Type Safety | Est: S
What: supabase/client.ts uses console.warn instead of logWarn
Where: lib/supabase/src/client.ts:13
Impact: Inconsistent logging, potential noise in production
Fix: Import and use logWarn from @workspace/logging

**[TASK-011]** 🟡 IMPROVE | Type Safety | Est: S
What: admin/env.ts and portfolio/env.ts use console.warn instead of logWarn
Where: artifacts/admin/src/lib/env.ts:23,55 / artifacts/portfolio/src/lib/env.ts:20,52
Impact: Inconsistent logging patterns
Fix: Replace console.warn with logWarn

**[TASK-012]** 🟡 IMPROVE | Architecture | Est: M
What: `seed.ts` uses `getSupabaseClient()` at module scope in some routes
Where: Multiple admin routes
Impact: If Supabase env missing, app crashes at boot instead of first request
Fix: Move getSupabaseClient() into route handlers

**[TASK-013]** 🟡 IMPROVE | Security | Est: S
What: CSP has `scriptSrc: ['self']` but TODO suggests nonce migration
Where: artifacts/api-server/src/app.ts:32
Impact: Cannot use inline scripts for dynamic CSP
Fix: Add TODO documentation or implement nonce support

---

### PERFORMANCE Tasks

**[TASK-014]** 🟡 IMPROVE | Performance | Est: S
What: `auth-token.ts` initial wait is 3s, should be faster
Where: artifacts/admin/src/lib/auth-token.ts:66
Impact: Slow first API call on page load
Fix: Reduce initial wait to 750ms, retry to 250ms

---

### TESTING Tasks

**[TASK-015]** 🟡 IMPROVE | Testing | Est: S
What: Missing test for CvManager.remove functionality
Where: artifacts/admin/src/test/CvManager.test.tsx
Impact: Bug in CV removal not caught by tests
Fix: Add test for remove CV flow

**[TASK-016]** 🟡 IMPROVE | Testing | Est: S
What: Missing barrel export index.ts in lib/db prevents proper test isolation
Where: lib/db/src/index.ts missing
Impact: Test imports scattered across multiple files
Fix: Create barrel export for cleaner test imports

---

### UX Tasks

**[TASK-017]** 🟢 | UX | Est: S
What: ProjectsSection already handles loading/error/empty states
Where: artifacts/portfolio/src/components/ProjectsSection.tsx
Status: Already fixed - no work needed

---

### REFACTORED Tasks (already completed in git history)

**[TASK-018-030]** ⚠️ DONE | Various | Est: —
Many tasks already completed per GIT history and docs:

- [ ] Dedupe api-client fetch logic (TASK-029 in session3.md)
- [ ] Remove `as unknown as` in route-helpers (TASK-030)
- [ ] Redact stack in production error logs (TASK-031)
- [ ] CSP report-uri endpoint (TASK-042)
- [ ] scroll-margin-top for sticky navbar (TASK-036)
- [ ] Focus ring on related-projects cards (TASK-037)
- [ ] Remove CSP TODO (TASK-001 in batch 1)
- [ ] Vite allowedHosts restricted (TASK-005 in batch 1)
- [ ] CSP meta tags on SPAs (TASK-002 in batch 1)
- [ ] CSP hardened in api-server (TASK-001 in batch 1)

---

## Execution Order

1. CRITICAL tasks first (TASK-001-005)
2. Type safety improvements (TASK-007, TASK-010-011)
3. Performance improvements (TASK-006, TASK-014)
4. Architecture improvements (TASK-008-009, TASK-012)
5. Testing improvements (TASK-015-016)

---

_Report generated for training session - tasks will be executed sequentially._
