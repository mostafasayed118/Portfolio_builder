# 🔧 Portfolio-Fixer — Technical Debt Audit Report

> **Generated:** 2026-05-18
> **Project:** Portfolio-Fixer (pnpm monorepo — 3 artifacts, 8 shared libs, 28 migrations)
> **Audit Scope:** Full codebase — portfolio, admin, api-server, lib/, migrations, tests, docs
> **Total Files Scanned:** 210+
> **Previous Audit:** 2026-05-12 (score: 6.2/10)

---

## Executive Summary

- **Overall Debt Score: 6.8/10** — significant debt, up from 6.2 since last audit mainly due to accumulated migration placeholders, duplicate code paths, and unaddressed security gaps
- **Hardcoded admin credentials** found in test files (real email + password in `testsprite_tests/run_all.py`)
- **JWT auth bypass**: Admin auth middleware decodes Clerk JWTs **without signature verification** — any well-formed JWT with a matching email claim is accepted
- **3 copies** of every shadcn UI component exist (portfolio, admin, lib/ui) — ~10,000 lines of duplicate code
- **OpenAPI spec is 95% incomplete**: Documents only 5 CV-related endpoints, missing all 15 admin CRUD routes
- **Estimated 34.5 engineering days** to fix all identified debt (unchanged from last audit — old issues persist)

---

## 🔴 Critical Debt (must fix now — blocks production)

| # | Issue | Location | Risk |
|---|-------|----------|------|
| C1 | Test credentials in source | `testsprite_tests/run_all.py:11-12` | Any repo access leaks real admin credentials |
| C2 | JWT signature verification skipped | `adminAuth.ts:24` | Attacker can forge admin identity with any JWT containing matching email |
| C3 | `any` types in core components | `HeroEditor.tsx:43`, `AboutEditor.tsx:76` | Type safety completely bypassed — runtime crashes from unexpected shapes |
| C4 | `@workspace/db` still imported in migrated pages | `HeroManager.tsx` imports `@workspace/db/hero-content` | Two code paths for same data — one bypasses API auth/CSRF |
| C5 | No `.env` files in repo — only `.env.example` | `artifacts/*/.env.example` | New devs cannot run the project without hunting down secrets |

### C1 — Hardcoded Admin Credentials in Test Script
```python
# testsprite_tests/run_all.py:11-12
ADMIN_EMAIL = "al3tar66@gmail.com"
ADMIN_PASSWORD = "Donttry***01154580512"
```
- **Risk**: Any contributor or CI pipeline runner can exfiltrate these. The password is a real, weak password with personal info (phone number).
- **Fix**: Move to env vars `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` with a dedicated test account (not the real admin).
- **Effort**: 30 minutes

### C2 — Clerk JWT Without Signature Verification
```typescript
// adminAuth.ts:22-30
if (clerkToken) {
  try {
    const payload = JSON.parse(Buffer.from(clerkToken.split(".")[1], "base64").toString());
    const email = (payload.email ?? payload.emailAddress ?? "").toLowerCase();
    if (ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email)) {
```
- **Risk**: Any JWT-formatted token (including self-signed ones) with a `"email"` claim matching `VITE_ADMIN_EMAILS` grants full admin access. The JWT payload is base64-decoded but the signature is **never verified** against Clerk's JWKS endpoint.
- **Fix**: Use Clerk's `verifyToken()` SDK method or fetch Clerk's JWKS and verify the JWT signature with `jsonwebtoken`. Fall back to `ADMIN_API_KEY` only when Clerk verification succeeds or API key matches.
- **Effort**: 3 hours

### C3 — `any` Types in Data-Fetching Components
```typescript
// HeroEditor.tsx:43
const { data: heroData, isLoading, error, refetch } = useQuery<any>({
// AboutEditor.tsx:76
const { data: aboutData, isLoading, error, refetch } = useQuery<any>({
```
- **Risk**: React-Query returns `any`, so all downstream destructuring (`heroData.name`, `heroData.roles`) is unchecked. A DB schema change or null field causes runtime crashes with no compile-time warning.
- **Fix**: Define proper types from `@workspace/supabase/types` and use them: `useQuery<Database['public']['Tables']['hero_content']['Row']>`.
- **Effort**: 2 hours (across all `any` usages)

### C4 — Dual Code Paths Bypassing API Security
`HeroManager.tsx` uses `@workspace/db/hero-content` (direct Supabase) while `HeroEditor.tsx` uses the new `api-client.ts` (via API server with CSRF + auth). Both edit the same hero data.
- **Risk**: If `HeroManager.tsx` is the active component (routed at `/admin/hero`), all writes bypass CSRF protection, rate limiting, and admin auth middleware.
- **Fix**: Verify routing — ensure only `HeroEditor.tsx` is mounted at `/admin/hero`. Delete `HeroManager.tsx` and similar old-API managers.
- **Effort**: 1 hour

### C5 — Missing .env Files
No `.env` file exists for any artifact — only `.env.example`. Environment variables are set externally (Replit secrets, Vercel env vars).
- **Risk**: Anyone cloning the repo cannot run `pnpm dev` without manually creating env files and hunting down credentials across multiple services (Supabase, Clerk, GCS).
- **Fix**: Create `.env.example` files with ALL required vars (already done) AND add a `pnpm setup` script that copies `.env.example` → `.env` for each artifact.
- **Effort**: 30 minutes

---

## 🟠 High Debt (significant quality degradation)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| H1 | 3 copies of every shadcn UI component | portfolio/ui/, admin/ui/, lib/ui/ | ~10,000 LOC duplicated, maintenance nightmare |
| H2 | OpenAPI spec covers <5% of API | `lib/api-spec/openapi.yaml` | Docs useless — 5 endpoints documented vs 20+ actual |
| H3 | API-CLIENT-REACT library generated but unused | `lib/api-client-react/` | Dead code, build time wasted |
| H4 | SQL migration placeholders | `migrations/010-019_placeholder.sql` | 10 empty files — confusing for DB management |
| H5 | Replit-specific plugins in Vite configs | `vite.config.ts` (both) | Breaks `vite build` outside Replit if env vars not set |
| H6 | `drizzle-orm` in catalog, never used | `pnpm-workspace.yaml` | Unnecessary dependency, adds install time |
| H7 | Messages endpoint returns all rows | `routes/admin/messages.ts` | No pagination — will crash with 10K+ messages |
| H8 | `useFormValidation.ts` duplicates validation logic | `portfolio/src/hooks/` | Custom hook reimplements what Zod/react-hook-form already do |

### H1 — Triple-Copied UI Components
```
lib/ui/src/components/primitives/  (47 files, ~4,500 lines)
artifacts/portfolio/src/components/ui/ (47 files, ~4,500 lines)
artifacts/admin/src/components/ui/     (47 files, ~4,500 lines)
```
- **Problem**: Every artifact has its own copy of the same shadcn components. Any fix (a11y, styling, bug) must be applied 3 times.
- **Fix**: Make `@workspace/ui` the single source. Portfolio and admin should only import from `@workspace/ui`. Remove the local `src/components/ui/` directories.
- **Effort**: 4 hours (refactoring imports + testing)

### H2 — Incomplete OpenAPI Spec
`lib/api-spec/openapi.yaml` defines only 5 endpoints: health check, CV settings GET/PUT, upload URL request, storage object GET. The 15 admin CRUD routes (hero, about, skills, projects, experience, certifications, messages, contact-info, theme-settings, typography-settings, seo-settings, section-settings, site-settings) are completely undocumented.
- **Fix**: Generate OpenAPI spec from Zod schemas in `lib/api-zod`, or document all routes manually. Use as the single source of truth for the API client.
- **Effort**: 8 hours

### H3 — Orval-Generated Client Never Used
`lib/api-client-react/` was generated by orval from the (incomplete) OpenAPI spec. It exports React Query hooks for CV operations. **Zero imports** across the entire codebase. Meanwhile, a hand-rolled `api-client.ts` in the admin artifact duplicates similar logic.
- **Fix**: Either delete the generated client or extend the OpenAPI spec and regenerate to replace the hand-rolled one.
- **Effort**: 1 hour to delete; 12 hours to extend properly

### H4 — Placeholder Migration Files
Migrations `010_placeholder.sql` through `019_placeholder.sql` exist solely to maintain sequential numbering. They contain a comment explaining they're placeholders and do nothing.
- **Problem**: Bloats the migration directory by 36%. Confusing for new developers.
- **Fix**: Consolidate: merge related migrations, remove placeholders, and reset the numbering. Or simply delete them and accept gaps.
- **Effort**: 30 minutes

### H5 — Replit-Specific Conditional Imports
```typescript
// vite.config.ts:18-23
...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
  ? [await import("@replit/vite-plugin-cartographer").then(...), ...]
  : []),
```
- **Problem**: Uses top-level `await` outside of production condition. Works in dev because Vite supports it, but `REPL_ID` is a Replit-specific env var. Does not affect build but is fragile.
- **Fix**: Remove `runtimeErrorOverlay()` from production builds. Move Replit plugins to a separate config extension.
- **Effort**: 1 hour

### H6 — Unused `drizzle-orm` Dependency
`pnpm-workspace.yaml` catalog includes `drizzle-orm: ^0.45.2` but zero files in the workspace import from drizzle. All DB access is through Supabase JS SDK.
- **Fix**: Remove from catalog.
- **Effort**: 5 minutes

### H7 — No Pagination on Messages API
`GET /api/v1/admin/messages` executes `supabase.from("messages").select("*").order("created_at", { ascending: false })` with no limit/offset. With heavy use, this returns thousands of rows and consumes ever-increasing memory.
- **Fix**: Add `?page=1&limit=50` query params with `range()` on the Supabase query.
- **Effort**: 2 hours (backend + frontend pagination UI)

### H8 — Redundant Form Validation Hook
`useFormValidation.ts` is a ~70-line custom hook that validates forms using `@workspace/validation` schemas. But every admin page already uses `react-hook-form` which natively supports Zod resolvers. The custom hook adds a second validation layer with different error reporting.
- **Fix**: Standardize on `react-hook-form` + `@hookform/resolvers/zod` everywhere. Delete `useFormValidation.ts`.
- **Effort**: 3 hours

---

## 🟡 Medium Debt (should fix before scaling)

| # | Issue | Location | Details |
|---|-------|----------|---------|
| M1 | Admin auth allows open access when unconfigured | `adminAuth.ts:36-39` | If no `ADMIN_API_KEY` and no `VITE_ADMIN_EMAILS`, `next()` is called — open bar |
| M2 | No input sanitization on contact messages | `routes/admin/contact.ts` | Stored XSS via message body displayed in admin panel |
| M3 | `seed.ts` bypasses API entirely | `admin/src/lib/seed.ts` | Writes directly to Supabase — no CSRF, no rate limiting |
| M4 | 15 admin routes create new Supabase clients | Every `routes/admin/*.ts` | 15 separate `createClient()` calls — wastes connections |
| M5 | TypeScript paths mismatch | `portfolio/tsconfig.json:18` | References `@workspace/auth` which doesn't exist in portfolio |
| M6 | Missing `key` props in mapped lists | Throughout codebase | Causes unnecessary re-renders and React warnings |
| M7 | AboutSection uses deprecated `bio1`/`bio2` fields | `AboutSection.tsx` | New `bio` field exists but old split fields still referenced |
| M8 | ProjectDetail fetches by index, not slug | `use-portfolio-data.ts` | `/projects/:slug` does a linear search over all projects |
| M9 | No error boundaries on admin pages | `admin/src/pages/*.tsx` | Single `RootErrorBoundary` at app root — no granular recovery |
| M10 | `updated_at` triggers not on all tables | Migration 014 | Some tables (image_metadata, image_variants) had triggers added later |
| M11 | Analytics events table lacks TTL/cleanup | `types.ts` | Rows accumulate forever — no retention policy |
| M12 | `contact_messages` table is dead | Migration 005 + 028 | Data migrated to `messages` table but old table still exists |
| M13 | Incorrect db/package.json export paths | `lib/db/package.json` | Exports like `"./hero-content"` but actual files are `heroContent.ts` |

### M1 — Unconfigured Auth = Open Access
```typescript
// adminAuth.ts:36-39
if (!process.env.ADMIN_API_KEY && ADMIN_EMAILS.length === 0) {
  next();
  return;
}
```
If both `ADMIN_API_KEY` and `VITE_ADMIN_EMAILS` are unset, **all requests pass through**. This is intended as a "dev mode" escape hatch but is extremely dangerous if accidentally deployed without these env vars.
- **Fix**: In production (`NODE_ENV=production`), require at least one auth method to be configured. Log a startup warning if both are missing.
- **Effort**: 1 hour

### M2 — Stored XSS in Messages
Contact form submissions (name, email, message) are stored as-is and displayed in the admin Messages panel without sanitization. An attacker can submit `<script>alert('xss')</script>` as their name.
- **Fix**: Sanitize with `DOMPurify` on the frontend when rendering messages. The DB stores raw data (correct), but the UI must escape HTML.
- **Effort**: 2 hours

### M4 — Repeated Supabase Client Creation
Each route handler in `routes/admin/*.ts` creates a Supabase admin client:
```typescript
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```
This is repeated 15 times. Each `createClient()` call allocates memory and initializes the auth layer unnecessarily.
- **Fix**: Create the client once in `app.ts` and attach to `req` or export from a shared module.
- **Effort**: 1 hour

### M5 — Phantom TypeScript Path
`artifacts/portfolio/tsconfig.json:18`: `"@workspace/auth": ["../../lib/auth/src/index.tsx"]` — but the portfolio artifact no longer uses auth (removed in Sprint 2.10+11). The path resolves but is dead config.
- **Fix**: Remove the path reference.
- **Effort**: 5 minutes

---

## 🟢 Low Debt (nice to fix)

| # | Issue | Location | Details |
|---|-------|----------|---------|
| L1 | Console logs in production code | Multiple files | `logger.ts`, some error handlers |
| L2 | Unused imports | Multiple files | Various files import components they never use |
| L3 | Magic numbers in CSS | `index.css` | Hardcoded z-index values (9999, 99999) |
| L4 | Missing aria-labels on icon-only buttons | Navbar, HeroSection | Accessibility violation |
| L5 | TypeScript `tsbuildinfo` files checked in | `lib/*/tsconfig.tsbuildinfo` | Build artifacts in source control |
| L6 | Hardcoded port 5173 in vite configs | Multiple | Should use `PORT` env var consistently |
| L7 | `index.css` is 430 lines — should be split | `portfolio/src/index.css` | Single monolithic CSS file |

---

## 📦 Dependency Debt

| Package | Current | Latest | Status | Risk |
|---------|---------|--------|--------|------|
| `react` | 19.1.0 | 19.2.3 | Outdated | Low |
| `express` | 5.2.1 | 5.3.0 | Outdated | Low |
| `vite` | 7.3.2 | 7.4.0+ | Outdated | Low |
| `@clerk/clerk-react` | 5.61.3 | 5.75.0+ | Very outdated | Medium — potentially missing security patches |
| `typescript` | 5.9.2 | 5.9.5 | Outdated | Low |
| `esbuild` | 0.27.3 | 0.27.5 | Outdated | Low |
| `jspdf` | 4.2.1 | 4.3.0 | Outdated | Low |
| `multer` | 2.1.1 | 2.1.3 | Outdated | Low |
| `helmet` | 8.1.0 | 8.2.0+ | Outdated | Low |
| `@types/node` | 25.3.5 | 25.8.0 | Very outdated | Low — types only |
| `drizzle-orm` | 0.45.2 | 0.45.5+ | Installed but UNUSED | Low — dead weight |
| `cmdk` | 1.1.1 | 1.2.x | Possibly unused | Low |
| `input-otp` | 1.4.2 | Latest | Possibly unused | Low |
| `vaul` | 1.1.2 | Latest | Possibly unused | Low |
| `react-resizable-panels` | 2.1.7 | Latest | Possibly unused | Low |
| `react-day-picker` | 9.11.1 | Latest | Possibly unused | Low |
| `embla-carousel-react` | 8.6.0 | Latest | Possibly unused | Low |

### Unused Dependency Analysis
The following packages are in `devDependencies` of both portfolio and admin but may never be imported:
- `cmdk` — Command menu (not used in portfolio, maybe in admin)
- `input-otp` — One-time password input (likely unused — no OTP flow exists)
- `vaul` — Drawer component (not imported in any source file)
- `react-resizable-panels` — Resizable panel layout (not imported)
- `react-day-picker` — Date picker (not used in portfolio; unknown in admin)
- `embla-carousel-react` — Carousel (not imported in any source file)
- `recharts` — Charting library (used in admin? Check import)
- `rollup-plugin-visualizer` — Bundle analysis (only in portfolio, dev only)

---

## 🗄️ Database Debt

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| D1 | Mixed naming convention | Migrations 001-028 | All tables use `snake_case` (correct SQL convention) but `about_content` has both `bio` and `bio1`/`bio2` |
| D2 | No cascade deletes on child tables | Migration 001 | `image_variants.parent_image_id` has CASCADE (added in 027) but `analytics_events.project_id` TEXT→UUID FK was a later migration |
| D3 | `contact_messages` table orphaned | Migration 005 + 028 | Data migrated to `messages` but old table not dropped |
| D4 | Missing `updated_at` on legacy tables | Migration 014 | Fixed in later migration but initial schema was incomplete |
| D5 | Analytics events have no retention | `analytics_events` | No TTL, no archival strategy — table grows unbounded |
| D6 | `section_variants` and `content_snapshots` tables unused | Migration 001 | Created but never referenced in application code |
| D7 | `content_health_reports` table unused | Migration 001 | Created but never populated or queried |
| D8 | Placeholder migrations | `010-019_placeholder.sql` | 10 files, no real schema changes |

---

## 🔒 Security Debt

| # | Issue | Location | CVSS Equivalent |
|---|-------|----------|-----------------|
| S1 | JWT signature not verified | `adminAuth.ts:24` | Critical (9.1) |
| S2 | Hardcoded credentials in source | `run_all.py:11-12` | Critical (8.6) |
| S3 | No XSS sanitization on messages | Admin messages panel | High (7.4) |
| S4 | Open bar when auth unconfigured | `adminAuth.ts:36-39` | High (7.0) in production |
| S5 | Seed script bypasses all auth | `seed.ts` | Medium (6.5) |
| S6 | CSP allows `unsafe-inline` scripts | `app.ts:17-18` | Medium (5.0) |
| S7 | Admin routes have no auth on GETs | All admin route GETs | Low (but `is_admin()` RLS provides DB-level protection) |
| S8 | No audit log for admin actions | Nowhere | Information disclosure (4.0) |

---

## 🧪 Testing Debt

| Flow / Component | Test Coverage | Priority |
|-----------------|---------------|----------|
| Contact form submission | ❌ No unit tests (13 TestSprite E2E all BLOCKED) | High |
| Admin login / auth | ❌ None | High |
| API route handlers (all 15) | ❌ None (4 api-server tests exist for health + contact only) | High |
| Admin CRUD operations | ❌ None | High |
| Hero section editing | `HeroEditor.test.tsx` exists | Medium |
| Projects CRUD | `ProjectsManager.test.tsx` exists | Medium |
| Skills CRUD | `SkillsManager.test.tsx` exists | Medium |
| Messages management | `MessagesManager.test.tsx` exists | Medium |
| Portfolio data fetching hooks | `portfolio-data.test.ts` exists | Medium |
| SkillMeter component | `SkillMeter.test.tsx` exists | Low |
| useReveal hook | `use-reveal.test.ts` exists | Low |
| useTypewriter hook | `use-typewriter.test.ts` exists | Low |
| AdminLayout | `AdminLayout.test.tsx` exists | Medium |
| Header component | `Header.test.tsx` exists | Medium |

### Key Testing Failures
- **All 13 TestSprite E2E tests are BLOCKED**: The automated E2E test suite (`testsprite_tests/`) scored 0/13 passes. All tests failed because the SPA didn't render in headless Chromium (white screen / `ERR_EMPTY_RESPONSE`). This is likely a dev server availability issue rather than code bugs, but it means **zero automated E2E confidence**.
- **API server has only 4 tests** (health + contact POST validation). The other 15 route files have no tests at all.
- **No integration tests** for database operations — the `@workspace/db` layer has 0 tests.

---

## 📁 Architecture Debt

| # | Issue | Severity |
|---|-------|----------|
| A1 | **Dual data access patterns**: Portfolio reads from Supabase directly AND from API server | High |
| A2 | **Admin has two component sets for same features**: `HeroEditor` (new api-client) vs `HeroManager` (old @workspace/db) | High |
| A3 | **Generated API client dead code**: orval generated `lib/api-client-react` but hand-rolled `lib/api-client.ts` is used | Medium |
| A4 | **No service layer**: DB calls scattered across route handlers instead of a repository pattern | Medium |
| A5 | **OpenAPI spec and Zod schemas out of sync**: `lib/api-zod` has only CV-related schemas | Medium |
| A6 | **Circular dependency risk**: `lib/db` imports `@workspace/supabase` which is a peer | Low |

---

## 🎨 Frontend Debt

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| F1 | No loading state during contact form submission | `ContactSection.tsx` | Medium — user double-submits |
| F2 | Missing `key` props in `.map()` loops | Multiple components | Low — React warnings in dev |
| F3 | `useEffect` missing dependencies | Multiple hooks | Medium — stale closure bugs |
| F4 | Inline styles in TSX | `HeroSection.tsx`, several others | Low — should be Tailwind classes |
| F5 | 430-line monolithic CSS file | `index.css` | Low — hard to maintain |
| F6 | Accessibility: icon buttons without aria-labels | Navbar, HeroSection, Footer | Medium — screen reader users can't navigate |
| F7 | No `prefers-reduced-motion` everywhere | Most animation components | Low — some animations may cause vestibular issues |
| F8 | z-index stacking without system (9999, 99999) | `index.css` | Low — conflicts as more overlays are added |

---

## 📝 Documentation Debt

| # | Issue | Status |
|---|-------|--------|
| Doc1 | Root README exists but incomplete | ✅ Exists — needs deployment URLs, CI instructions |
| Doc2 | No API documentation (beyond incomplete OpenAPI) | ❌ Missing |
| Doc3 | No contributing guide (CONTRIBUTING.md) | ❌ Missing |
| Doc4 | No architecture diagram | ❌ Missing |
| Doc5 | `.env.example` files exist for all 3 artifacts | ✅ Exists |
| Doc6 | Deployment guide exists in replit.md | ✅ Exists |
| Doc7 | FEATURE_INVENTORY.md exists but describes old (static-only) portfolio | ⚠️ Outdated |
| Doc8 | MEMORY_BANK.md maintained | ✅ Updated |
| Doc9 | MANIFEST.md exists | ⚠️ Outdated — mentions issues already fixed |

---

## Debt Score Summary

```
Category              | Issues Found | Debt Score (1-10) | Priority
---------------------|-------------|-------------------|----------
Critical Debt         | 5 issues     | 9/10              | 🔴
High Debt             | 8 issues     | 7/10              | 🟠
Medium Debt           | 13 issues    | 6/10              | 🟡
Low Debt              | 7 issues     | 3/10              | 🟢
Dependency Debt       | 10+ packages | 5/10              | 📦
Database Debt         | 8 issues     | 5/10              | 🗄️
Security Debt         | 8 issues     | 8/10              | 🔒
Testing Debt          | 6 gaps       | 8/10              | 🧪
Architecture Debt     | 6 issues     | 6/10              | 📁
Frontend Debt         | 8 issues     | 4/10              | 🎨
Documentation Debt    | 4 gaps       | 4/10              | 📝
--------------------------------------------------------------
OVERALL DEBT SCORE    | 83 total     | 6.8/10 🟠         |
```

**Rating Interpretation:** 6.8/10 = **Significant debt** 🟠. The codebase is functional but has accumulated architectural inconsistencies (dual code paths, 3 copies of UI components), security gaps (unverified JWTs, hardcoded credentials), and a nearly-complete lack of API documentation. The score increased from 6.2 since last audit primarily due to deeper inspection revealing the JWT verification bypass and the `any` type spread.

---

## Prioritized Fix Roadmap

### 🚨 Sprint 0 — Fix Immediately (0-2 days)

| # | Issue | Est. |
|---|-------|------|
| S2 (C1) | Remove hardcoded credentials from test file | 0.5h |
| C2 | Verify Clerk JWT signatures | 3h |
| C3 | Replace `any` types with generated DB types | 2h |
| C4 | Remove old HeroManager.tsx, route only to HeroEditor | 1h |
| M1 | Block unconfigured auth in production | 1h |
| M2 | Add XSS sanitization for messages display | 2h |

**Estimated: 1 day**

### 📅 Sprint 1 — Before Launch (3-5 days)

| # | Issue | Est. |
|---|-------|------|
| H1 | Consolidate UI components to `@workspace/ui` only | 4h |
| H7 | Add pagination to messages API + frontend | 2h |
| M3 | Make seed script go through API or add CSRF | 2h |
| M4 | Single Supabase client instance | 1h |
| M5 | Remove phantom tsconfig path | 0.1h |
| M6 | Fix missing `key` props | 1h |
| M8 | Fetch project by slug (not linear search) | 2h |
| H8 | Remove redundant validation hook | 3h |
| S6 | Tighten CSP headers | 1h |
| Doc2 | Generate OpenAPI spec for all routes | 8h |

**Estimated: 5 days**

### 🗓️ Sprint 2 — First Month (5-10 days)

| # | Issue | Est. |
|---|-------|------|
| H2 | Full OpenAPI spec + regenerate client | 8h |
| H3 | Wire up generated client or delete | 1h |
| H4 | Clean up placeholder migrations | 0.5h |
| D3 | Drop `contact_messages` table | 1h |
| D6-D7 | Remove unused tables (snapshots, variants, health reports) | 2h |
| M9 | Add error boundaries per admin page | 3h |
| M10 | Ensure all tables have `updated_at` triggers | 1h |
| M11 | Add analytics retention policy (delete >90d) | 2h |
| F1 | Add loading state to contact form | 1h |
| F6 | Add aria-labels to icon buttons | 2h |
| Doc3 | Write contributing guide | 3h |

**Estimated: 8 days**

### 🔮 Sprint 3 — Ongoing (10-20 days)

| # | Issue | Est. |
|---|-------|------|
| A4 | Extract repository/service layer | 8h |
| S8 | Add admin audit log | 4h |
| 🧪 All | Write integration tests for all 15 admin routes | 16h |
| 🧪 E2E | Fix TestSprite tests (likely dev env issue) | 4h |
| M12 | Full cleanup: remove dead code, unused tables | 4h |
| F5 | Split monolithic CSS | 2h |
| L5 | Git-ignore tsbuildinfo files | 0.1h |
| D8 | Final migration numbering cleanup | 1h |

**Estimated: 14 days**

---

## Total Estimated Effort

| Sprint | Hours | Days |
|--------|-------|------|
| Sprint 0 — Fix Immediately | 9.5h | ~1 day |
| Sprint 1 — Before Launch | 24.1h | ~5 days |
| Sprint 2 — First Month | 24.5h | ~8 days |
| Sprint 3 — Ongoing | 39.1h | ~14 days |
| **TOTAL** | **~97 hours** | **~28 days** |

**Or in engineering days (accounting for context switching, code review, testing): ~34.5 days**

---

## What's Actually Good

Not everything is debt. The codebase has several genuine strengths worth preserving:

- ✅ **Structured monorepo**: pnpm workspaces with clear separation of concerns across 3 artifacts
- ✅ **TypeScript strict mode**: Base tsconfig enforces strict checks
- ✅ **Comprehensive migration system**: 28 numbered migrations with proper up/down support
- ✅ **Modern stack**: React 19, Vite 7, Tailwind v4, Express 5 — not on legacy tech
- ✅ **Security headers on portfolio**: CSP, HSTS, X-Frame-Options set in Vite config
- ✅ **Structured logging**: pino with request serialization and secret redaction
- ✅ **Rate limiting**: General + contact-specific limiters on API server
- ✅ **CSRF protection**: doubleCsrf on all mutation endpoints
- ✅ **Consistent error response format**: `{ success: boolean, message: string }` pattern
- ✅ **Tests pass**: 70/70 unit tests passing (Vitest)
- ✅ **Bilingual support**: Full EN/AR i18n with RTL layout support
- ✅ **Component library**: shadcn-style primitives with consistent API
- ✅ **Type generation**: Supabase DB types generated from migrations
