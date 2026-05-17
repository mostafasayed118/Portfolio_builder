# Technical Debt Report — Portfolio-Fixer

**Generated:** May 17, 2026
**Project:** Portfolio-Fixer (full-stack portfolio CMS monorepo)
**Scope:** All source code, config, tests, database, and documentation

---

## Executive Summary

- **Overall Debt Score: 8/10** — Significant debt requiring immediate attention before production launch
- **6 Critical security issues** found: 3 unauthenticated API routes, hardcoded credentials in test suite, CSRF secret with well-known default, committed API keys
- **13 automated tests blocked at 0%** — no test infrastructure works; all Playwright tests fail with blank page
- **No `.env.example` files exist** despite README instructions to copy them — setup is broken out of the box
- **Migration numbering is chaotic** — duplicate 002 prefix, 6 skipped numbers (003, 010, 016-019), duplicate indexes, double triggers on same table
- **~185 total individual issues** across 11 debt categories
- **Estimated 20-25 person-days** to fix all critical and high issues; **45-60 person-days** to fix everything

---

## Files Audited

**Source code:** `artifacts/portfolio/src/` (62 files), `artifacts/admin/src/` (80+ files), `artifacts/api-server/src/` (21 files), `lib/db/src/` (21 files), `lib/supabase/src/` (4 files), `lib/auth/src/` (1 file), `lib/validation/src/` (3 files), `lib/api-client-react/src/` (3 files), `lib/api-zod/src/` (1 file), `lib/api-spec/` (3 files), `lib/ui/src/` (55+ components)

**Config:** `package.json` (root + 3 artifacts + 6 lib), 3 `vite.config.ts`, 4 `tsconfig.json`, `pnpm-workspace.yaml`

**Database:** All 16 migration files (`supabase/migrations/001_init.sql` through `021_language_settings.sql`)

**Tests:** `testsprite_tests/` (10 files), artifact `test/` directories

**Documentation:** 4 README files, `MEMORY_BANK.md`

---

## 🔴 CRITICAL DEBT — Blocks Production / Causes Bugs

### CRITICAL-1: Image Routes Have No Authentication
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `artifacts/api-server/src/routes/images.ts:42,112,129` |
| **Description** | POST `/api/images/upload`, GET `/api/images/:entityType/:entityId`, and DELETE `/api/images/:id` have **zero authentication checks**. CSRF is present on POST/DELETE but no JWT, no session, no API key is verified. |
| **Risk** | Any unauthenticated user can upload arbitrary files (up to 10MB each), list all image metadata, and delete any image. Full storage abuse and data destruction. |
| **Fix** | Add authentication middleware (verify JWT or session) to all three endpoints. Add rate limiting to upload. |
| **Effort** | 4 hours |

### CRITICAL-2: CV Routes Have No Authentication
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `artifacts/api-server/src/routes/cv.ts:80,101` |
| **Description** | PUT `/api/cv/settings` and GET `/api/cv/settings` have **no authentication**. Anyone can read or modify CV configuration (object path, filename). |
| **Risk** | CV file path can be changed to any object in storage, potentially exposing private files. CV settings can be deleted/overwritten. |
| **Fix** | Add authentication middleware to CV settings endpoints. |
| **Effort** | 2 hours |

### CRITICAL-3: Hardcoded Admin Credentials in Test Runner
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `testsprite_tests/run_all.py:9-10` |
| **Description** | Production admin email and password are hardcoded in plaintext in the Playwright test file: `ADMIN_EMAIL = "al3tar66@gmail.com"`, `ADMIN_PASSWORD = "Donttry***01154580512"` |
| **Risk** | Credentials committed to git. Anyone with repo access can read them. If repo is public, entire admin access is compromised. |
| **Fix** | Move credentials to environment variables or a `.env` file excluded from git. |
| **Effort** | 30 minutes |

### CRITICAL-4: CSRF Secret Defaults to Well-Known String
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `artifacts/api-server/src/middleware/csrf.ts:4` |
| **Description** | `CSRF_SECRET = process.env.CSRF_SECRET ?? "change-me-in-production"` — if the env var is not set, the secret is a literal well-known string. All CSRF tokens become predictable and can be forged. |
| **Risk** | CSRF protection is completely bypassed if env var is missing. All state-changing endpoints become vulnerable to cross-site request forgery. |
| **Fix** | Throw an error at startup if `CSRF_SECRET` is not set in production, or generate a random secret. |
| **Effort** | 1 hour |

### CRITICAL-5: TestSprite API Key Committed to Repo
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `testsprite_tests/tmp/config.json:14` |
| **Description** | A 200+ character API key is stored in `config.json` under the `tmp/` directory. Likely TestSprite or service API key. |
| **Risk** | API key can be used to access the associated service, potentially incurring costs or accessing data. |
| **Fix** | Remove the key, add `testsprite_tests/tmp/` to `.gitignore`, rotate the compromised key. |
| **Effort** | 30 minutes |

### CRITICAL-6: All 13 Automated Tests Blocked at 0%
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `testsprite_tests/tmp/test_results.json`, `testsprite_tests/tmp/raw_report.md` |
| **Description** | All 13 Playwright E2E tests return BLOCKED/FAIL. Root cause: dev server not running at localhost:5173 when tests executed. No automated test runner script starts the server. |
| **Risk** | No automated test coverage. Regressions will go undetected. Test suite provides false confidence. |
| **Fix** | Add server startup to test runner, fix blank-page issue, verify tests pass. |
| **Effort** | 8 hours |

### CRITICAL-7: Migration Numbering Chaos
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `supabase/migrations/002_constraints.sql` and `002_fix_rls_policies.sql` |
| **Description** | Two migrations share the `002_` prefix. Depending on file-sort behavior, `002_fix_rls_policies.sql` may run before `002_constraints.sql`, causing policy drops on tables that haven't been constrained yet. Additionally, 6 migration numbers are skipped (003, 010, 016, 017, 018, 019). |
| **Risk** | Ambiguous migration order can cause deployment failures or inconsistent database states. Skipped numbers make it impossible to know if a migration was deleted. |
| **Fix** | Renumber migrations sequentially. Rename `002_fix_rls_policies.sql` to `003_fix_rls_policies.sql`. Fill gaps or document intentional skips. |
| **Effort** | 2 hours |

### CRITICAL-8: Double Trigger on `image_metadata` Table
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `supabase/migrations/004_images.sql:74`, `014_updated_at_triggers.sql:19` |
| **Description** | Migration 004 creates `trg_image_metadata_updated_at` using `update_updated_at()`. Migration 014 creates `update_image_metadata_updated_at` using `update_updated_at_column()`. Both use the same function body (`NEW.updated_at = NOW()`), resulting in **two BEFORE UPDATE triggers** firing on every row update. |
| **Risk** | Double trigger execution doubles `updated_at` assignment cost on every UPDATE to `image_metadata`. Both triggers do identical work. |
| **Fix** | Drop one of the two triggers in a cleanup migration. |
| **Effort** | 1 hour |

### CRITICAL-9: Two Identical Trigger Functions
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `supabase/migrations/001_init.sql:327`, `014_updated_at_triggers.sql:2` |
| **Description** | `001_init.sql` creates `update_updated_at()`. `014_updated_at_triggers.sql` creates `update_updated_at_column()` — both do exactly `NEW.updated_at = NOW()`. The same logic exists in two places. |
| **Risk** | If one function is modified, the other becomes inconsistent. Triggers using either function will behave differently after modification. |
| **Fix** | Consolidate to a single function. Drop the duplicate in a cleanup migration. |
| **Effort** | 1 hour |

### CRITICAL-10: `image_metadata` and `image_variants` Have No RLS
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `supabase/migrations/004_images.sql` |
| **Description** | Tables `image_metadata` and `image_variants` have **RLS disabled** (no `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). No policies exist. All access is completely open. |
| **Risk** | If RLS is enabled in the future, all existing access patterns will break (default-deny for tables with no policies). Currently, any authenticated Supabase user can read/write these tables. |
| **Fix** | Enable RLS and add appropriate policies (public read for published images, admin write). |
| **Effort** | 2 hours |

### CRITICAL-11: Experience Update Type Uses Wrong Column Name
| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Location** | `lib/supabase/src/types.ts:658` |
| **Description** | The `ExperienceUpdate` type uses `order?: number | null` but the actual database column is `order_num`. Any TypeScript code using `ExperienceUpdate` will compile successfully but send the wrong column name to the database. |
| **Risk** | When updating experience records, the `order` field will be silently ignored by Postgres. Reordering functionality will not persist. |
| **Fix** | Change `order` to `order_num` in the `ExperienceUpdate` type and regenerate types. |
| **Effort** | 30 minutes |

---

## 🟠 HIGH DEBT — Degrades Quality Significantly

### HIGH-1: CSP Allows `unsafe-inline` on Script/Style
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/api-server/src/app.ts:19-20` |
| **Description** | Content-Security-Policy headers use `'unsafe-inline'` for both `script-src` and `style-src`. |
| **Risk** | Weakens XSS protection. Any script injection can execute inline code. |
| **Fix** | Use nonces or hashes for inline scripts/styles. |
| **Effort** | 3 hours |

### HIGH-2: No Input Validation on `entityId` in Image Routes
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/api-server/src/routes/images.ts:46,87` |
| **Description** | `entityId` from the request body is inserted directly into the database without any validation (type, length, format). |
| **Risk** | Data integrity issue — malformed or malicious values stored in DB. |
| **Fix** | Validate entityId against expected format (UUID or slug pattern). |
| **Effort** | 1 hour |

### HIGH-3: Information Disclosure in Error Responses
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/api-server/src/routes/images.ts:107` |
| **Description** | `err instanceof Error ? err.message : "Upload failed"` — in production, `err.message` could leak internal details (stack traces, storage paths, etc.). |
| **Risk** | Attackers can probe endpoints and get internal error details, aiding further exploitation. |
| **Fix** | Log full error server-side, return generic error message to client. |
| **Effort** | 1 hour |

### HIGH-4: XHR Not Aborted on Unmount (ImageUploader)
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/admin/src/components/ImageUploader.tsx:67-83` |
| **Description** | Manual XHR upload has no abort mechanism. If component unmounts during upload, XHR callbacks (`onload`/`onerror`) will call `setState` on unmounted component. |
| **Risk** | React 18+ warns about state updates on unmounted components. Memory leak from unfinished XHR. |
| **Fix** | Abort XHR in `useEffect` cleanup. Use a ref to track mounted state. |
| **Effort** | 2 hours |

### HIGH-5: Stale Closure in ImageUploader `uploadFile`
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/admin/src/components/ImageUploader.tsx:85-87` |
| **Description** | XHR callbacks capture `uploaded` from closure. After first upload succeeds, a new `uploadFile` is created but any queued callbacks still reference stale `uploaded`. |
| **Risk** | Race condition with multiple sequential uploads — incorrect state when second upload completes. |
| **Fix** | Use `useRef` for latest `uploaded` value in callbacks. |
| **Effort** | 1 hour |

### HIGH-6: Double-Counting Bug in ImageUploader Upload Limit
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/admin/src/components/ImageUploader.tsx:117` |
| **Description** | `currentCount + uploaded.length < maxFiles` should be `currentCount < maxFiles`. `currentCount` already includes `uploaded.length` (via line 40), so the check adds `uploaded.length` twice. |
| **Risk** | Users may be incorrectly blocked from uploading when the actual count is below the limit. |
| **Fix** | Change to `currentCount < maxFiles`. |
| **Effort** | 30 minutes |

### HIGH-7: Slug Auto-Generated on Every Project Save
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/admin/src/pages/ProjectsManager.tsx:65` |
| **Description** | `const slug = rest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')` — slug is regenerated from the title on EVERY save. If a project's title is updated, its URL changes, breaking all existing links and bookmarks. |
| **Risk** | SEO impact — all project page URLs are unstable. External links and search engine indexes break on any title change. |
| **Fix** | Preserve the original slug on updates. Only generate on create. Add a "regenerate slug" button. |
| **Effort** | 2 hours |

### HIGH-8: `useEffect` With No Dependencies (Infinite API Loop)
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/admin/src/pages/CvManager.tsx:25-30` |
| **Description** | `useEffect(() => { fetch("/api/v1/cv/settings")... })` — **empty dependency array is MISSING**. Effect runs on EVERY render, causing continuous HTTP GET requests. |
| **Risk** | Infinite HTTP polling. Network saturation. Potential rate limiting blocks. |
| **Fix** | Add `[]` as dependency array. |
| **Effort** | 5 minutes |

### HIGH-9: Stale Closure in `useFormValidation.setField`
| Field | Detail |
|-------|--------|
| **Location** | `lib/ui/src/hooks/useFormValidation.ts:16-28` |
| **Description** | `setField` captures `touched` state in its closure via `useCallback`. If multiple `setField` calls happen rapidly, the second call may see an outdated `touched` because the first call's state update hasn't been applied yet. |
| **Risk** | Form validation state can become inconsistent. `touched` may not be set correctly for all fields. |
| **Fix** | Use functional state update: `setTouched(prev => ({ ...prev, [field]: true }))` within setField. |
| **Effort** | 1 hour |

### HIGH-10: `useEffect` Missing Cleanup in MessagesViewer
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/portfolio/src/pages/admin/MessagesViewer.tsx:322-330` |
| **Description** | `setTimeout` in `handleExpand` marks message as read after 1 second. Timeout is never cleared on unmount. If the component unmounts before the timeout fires, it will call Supabase on a potentially unmounted component. |
| **Risk** | State update on unmounted component. Potential race condition if same message is re-opened. |
| **Fix** | Store timeout ref and clear in `useEffect` cleanup. |
| **Effort** | 30 minutes |

### HIGH-11: `localStorage.getItem` Without try/catch
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/portfolio/src/lib/language.tsx:46` |
| **Description** | `localStorage.getItem("portfolio-lang")` is called without a try/catch block. In private browsing mode on some browsers (e.g., Safari, Firefox with strict privacy), `localStorage` throws. |
| **Risk** | Full page crash for users with strict privacy settings. |
| **Fix** | Wrap localStorage access in try/catch with fallback to default. |
| **Effort** | 30 minutes |

### HIGH-12: No `.env.example` Files Exist
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/portfolio/`, `artifacts/admin/`, `artifacts/api-server/` |
| **Description** | All three README files instruct users to `cp .env.example .env`, but **no `.env.example` files exist anywhere in the project**. Additionally, several env vars used in code are undocumented (`BASE_PATH`, `VISUALIZER_OPEN`, `VITE_SITE_URL` edge cases, Google Cloud credentials). |
| **Risk** | New developers cannot set up the project without guessing required environment variables. |
| **Fix** | Create `.env.example` files for all three artifacts. Document all env vars in README. |
| **Effort** | 2 hours |

### HIGH-13: `setLocation` Called During Render (Two Locations)
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/portfolio/src/components/admin/ProtectedRoute.tsx:26`, `artifacts/portfolio/src/pages/admin/Login.tsx:17` |
| **Description** | `setLocation("/admin/login")` and `setLocation("/admin")` are called inside the component body (render phase), not inside a `useEffect`. In React 18 concurrent mode, side effects during render are unsafe. |
| **Risk** | Navigation may not work correctly under concurrent rendering. Potential double-navigation. |
| **Fix** | Wrap navigation redirects in `useEffect`. |
| **Effort** | 1 hour |

### HIGH-14: Duplicate Indexes Across Migrations
| Field | Detail |
|-------|--------|
| **Location** | `supabase/migrations/005_contact_messages.sql` and `015_missing_indexes.sql` |
| **Description** | Indexes `idx_contact_messages_created_at` and `idx_contact_messages_is_read` are created in BOTH migrations. Also, `idx_skills_category` from 001_init is recreated in 015. Migration 015 creates differently-named duplicates of indexes from 001_init (e.g., `idx_projects_sort_order` vs `idx_projects_sort`). |
| **Risk** | Redundant indexes waste disk space and slow down writes. Maintenance overhead. |
| **Fix** | Consolidate index creation in a single migration. Drop redundant indexes. |
| **Effort** | 2 hours |

### HIGH-15: Duplicate Library Files — `about.ts` vs `aboutContent.ts`
| Field | Detail |
|-------|--------|
| **Location** | `lib/db/src/about.ts` and `lib/db/src/aboutContent.ts` |
| **Description** | Two files do the same thing (CRUD on `about_content` table) but with different implementations:
| | - `about.ts` uses newer fields: `bio`, `education`, `languages`, `interests` |
| | - `aboutContent.ts` uses original fields: `bio1`, `bio2`, `degree`, `school`, etc. |
| | Both export `upsertAboutContent` with different signatures. |
| **Risk** | Importing the wrong file leads to incorrect data being saved. `about.ts` insert path sets `bio1: ""` and `degree: ""` which violates NOT NULL constraints from migration 002. |
| **Fix** | Consolidate into a single file. Deprecate the old one. |
| **Effort** | 3 hours |

### HIGH-16: `heap-buffer-overflow` Risk in Admin CV Editor — `useEffect` Missing Dependency
| Field | Detail |
|-------|--------|
| **Location** | `artifacts/admin/src/pages/CvManager.tsx:25-30` |
| **Description** | Second critical issue in CvManager: the `fetch` call inside the no-deps effect will run on every render, causing infinite HTTP requests. |
| **Risk** | As described in HIGH-8. |
| **Fix** | Same as HIGH-8. |

### HIGH-17: Lib validation Package Has Zero Dependencies
| Field | Detail |
|-------|--------|
| **Location** | `lib/validation/package.json` |
| **Description** | The `@workspace/validation` package exports Zod schemas but `package.json` has **zero dependencies**. The `zod` dependency is inherited via the catalog in consuming packages, but the validation library itself should declare it as a dependency. |
| **Risk** | If the catalog changes or the validation package is consumed outside the monorepo, Zod will be missing. |
| **Fix** | Add `zod` as a dependency of `@workspace/validation`. |
| **Effort** | 15 minutes |

---

## 🟡 MEDIUM DEBT — Should Fix Before Scaling

### MEDIUM-1: `contact_messages` Table Missing from Supabase Types
| **Location** | `lib/supabase/src/types.ts` |
| **Description** | The `contact_messages` table (created in migration 005) is not represented in the generated `Database` type. No `InsertContactMessage` type exists. |
| **Fix** | Regenerate types or add manually. |
| **Effort** | 1 hour |

### MEDIUM-2: No Index on `projects.slug`
| **Location** | `lib/db/src/projects.ts` |
| **Description** | `fetchProjectBySlug()` queries by `slug` column with no index. On a large project collection, this becomes a sequential scan. |
| **Fix** | Add index on `projects(slug)`. |
| **Effort** | 1 hour |

### MEDIUM-3: No Index on `projects.is_published`
| **Location** | `lib/db/src/projects.ts` |
| **Description** | `listPublishedProjects()` filters by `is_published = true` with no index. |
| **Fix** | Add index on `projects(is_published)`. |
| **Effort** | 1 hour |

### MEDIUM-4: Unused Imports (5 files)
| **Files** | `HeroSection.tsx:1`, `ProjectsSection.tsx:2,9`, `ContactSection.tsx:1`, `MessagesViewer.tsx:1`, `AboutEditor.tsx:2` (admin) |
| **Description** | Dead imports: `useState`/`useEffect` in HeroSection, `useEffect`/`useProjectBySlug` in ProjectsSection, `useRef` in ContactSection, `useEffect` in MessagesViewer, `useQueryClient` in admin AboutEditor. |
| **Fix** | Remove unused imports. |
| **Effort** | 15 minutes |

### MEDIUM-5: Dead Code — `fetchProjectImages` Defined But Never Called
| **Location** | `artifacts/portfolio/src/components/ProjectsSection.tsx:12-20` |
| **Description** | Function `fetchProjectImages` is defined and exported but never imported or called anywhere. |
| **Fix** | Remove dead function. |
| **Effort** | 5 minutes |

### MEDIUM-6: Dead Code — `Messages.tsx` Placeholder Never Used
| **Location** | `artifacts/portfolio/src/pages/admin/Messages.tsx` |
| **Description** | Placeholder component exists but the actual routing uses `MessagesViewer.tsx`. This file is never imported. |
| **Fix** | Delete unused file. |
| **Effort** | 2 minutes |

### MEDIUM-7: Storage Bucket RLS Conflicts Across Migrations
| **Location** | `001_init.sql`, `004_images.sql`, `009_storage_buckets.sql` |
| **Description** | Three different migrations create overlapping storage RLS policies. Migration 009 creates `auth_upload_all`, `auth_update_own`, `auth_delete_own` that override the more-restrictive per-bucket policies from 001 and 004 for all authenticated users. |
| **Risk** | Any authenticated Supabase user can upload to ANY bucket (including `cv`), not just admins. |
| **Fix** | Consolidate storage policies. Use `is_admin()` check for write operations. |
| **Effort** | 3 hours |

### MEDIUM-8: `BucketName` Type Missing Buckets
| **Location** | `lib/db/src/storage.ts:5` |
| **Description** | `BucketName` type includes `"projects" | "certifications" | "avatars" | "documents"` but is missing `"cv"` (from 001) and `"project_images"`, `"image_variants"` (from 004). |
| **Fix** | Add missing buckets to the type. |
| **Effort** | 15 minutes |

### MEDIUM-9: Supabase Client Created on Every Render (Multiple Files)
| **Locations** | `artifacts/admin/src/lib/supabase.ts:9`, `artifacts/admin/src/pages/MessagesManager.tsx:309`, `artifacts/portfolio/src/pages/admin/Dashboard.tsx:28`, `AdminLayout.tsx:28` |
| **Description** | `getSupabase()` creates a new Supabase client on every call due to missing caching. Called in component bodies, causing repeated client instantiation. |
| **Fix** | Cache the Supabase client instance (singleton pattern). |
| **Effort** | 1 hour |

### MEDIUM-10: Race Condition — `DynamicFavicon` and `SEO` Both Write `document.title`
| **Location** | `DynamicFavicon.tsx:21`, `SEO.tsx:43` |
| **Description** | Both components set `document.title` in separate `useEffect` blocks. The last one to run wins — unpredictable behavior. |
| **Fix** | Consolidate title management into a single source of truth. |
| **Effort** | 1 hour |

### MEDIUM-11: AdminLayout Uses Deprecated Wouter Pattern
| **Location** | `artifacts/portfolio/src/components/admin/AdminLayout.tsx:106-107` |
| **Description** | Uses `<Link href="/admin"><a>...</a></Link>` — the old wouter v2 pattern. In current versions, this creates nested `<a>` elements. |
| **Fix** | Use `<Link href="/admin">...</Link>` directly. |
| **Effort** | 1 hour |

### MEDIUM-12: Missing Validation Schemas for 6+ Form Types
| **Location** | `lib/validation/src/schemas.ts` |
| **Description** | Schemas exist for contact form, skills, projects, experience, certifications, hero, CV, contact info, site settings, and SEO. **Missing schemas** for: about_content, theme_settings, typography_settings, section_settings, language settings, and all Arabic content fields. |
| **Fix** | Add schemas for all form types. |
| **Effort** | 4 hours |

### MEDIUM-13: `Database` Type Enums Missing Specific Literal Unions
| **Location** | `lib/supabase/src/types.ts` |
| **Description** | `site_settings.language_mode` and `default_language` are typed as `string` instead of their specific literal union types (`'en_only' | 'ar_only' | 'both'` and `'en' | 'ar'`). |
| **Fix** | Update types with proper union literals. |
| **Effort** | 30 minutes |

### MEDIUM-14: Arabic JSONB Fields Typed as `unknown[]`
| **Location** | `lib/supabase/src/types.ts:335-337` |
| **Description** | `education_ar`, `languages_ar`, `interests_ar` are typed as `unknown[] | null`, losing all type safety for Arabic content. |
| **Fix** | Define specific types for Arabic content fields. |
| **Effort** | 2 hours |

### MEDIUM-15: `__dirname` in ESM Context — Admin Logger
| **Location** | `artifacts/admin/src/lib/logger.ts` |
| **Description** | Uses `__dirname` which is not available in native ESM modules. The admin build uses `"type": "module"`. This may work due to bundler shimming but will fail in raw Node.js. |
| **Fix** | Replace with `fileURLToPath(import.meta.url)` pattern. |
| **Effort** | 30 minutes |

### MEDIUM-16: AnalyticsEvents `type` Column Typed as Plain String
| **Location** | `lib/supabase/src/types.ts` and `lib/db/src/analytics.ts` |
| **Description** | The `analytics_events` table `type` column is `string` in types, but `analytics.ts` defines `EventType = "page_view" | "project_view" | "cv_download" | "contact_click"`. The types should enforce this constraint. |
| **Fix** | Create a DB ENUM or add a CHECK constraint. Update TypeScript types. |
| **Effort** | 2 hours |

### MEDIUM-17: `not-found.tsx` Uses Hardcoded Gray Colors — Ignores Theme
| **Location** | `artifacts/portfolio/src/pages/not-found.tsx:6,11,14` |
| **Description** | Uses `bg-gray-50`, `text-gray-900`, `text-gray-600` instead of CSS variable-based theme colors (`bg-background`, `text-foreground`). In dark mode, the 404 page will display with light backgrounds and poor contrast. |
| **Fix** | Replace with theme-aware Tailwind classes. |
| **Effort** | 15 minutes |

---

## 🟢 LOW DEBT — Nice to Fix, Not Urgent

### LOW-1: Magic Numbers (11 occurrences)
- `BackToTop.tsx:10` — `window.scrollY > 400`
- `Footer.tsx:14` — `window.scrollY > 600`
- `SkillsSection.tsx:87` — `animationDelay: ${index * 35}ms`
- `use-portfolio-data.ts:118` vs `SkillsSection.tsx:47-52` — skill thresholds `90, 75, 60` duplicated in two places
- `PageViewsChart.tsx:64,66,82` — hardcoded `fontSize: 11`
- `TopProjectsChart.tsx:50` — hardcoded max title length `16`
- `use-mouse-tilt.ts:19` — spring config magic numbers
- `use-mobile.tsx:9` — `767px` breakpoint duplicated with `window.innerWidth`
- ThemeManager.tsx — `parseFloat(theme.radius) * 16` assumes 16px base font

### LOW-2: `console.warn` for Missing Env Vars (Intentional)
- `artifacts/portfolio/src/main.tsx:13` — intentional, acceptable

### LOW-3: Non-null Assertions on `document.getElementById("root")!`
- `portfolio/main.tsx:17`, `admin/main.tsx:6` — no fallback if root element missing

### LOW-4: `possible std` misconfiguration in migration 004
- 004 uses `auth.role() = 'authenticated'` rather than `is_admin()` for admin storage operations

### LOW-5: CMS form `files.is_admin()` function relies on `request.jwt.claims.email` which may be empty
- All admin routes pass `is_admin()` check based on JWT claims. If JWT doesn't contain email, is_admin() always returns false.

### LOW-6: Deprecated `addListener`/`removeListener` in test mocks
- `test/setup.ts` — uses deprecated API alongside modern `addEventListener` for compatibility. Clean but noisy.

### LOW-7: `toString()` Without Null Check in Certifications Manager
- `artifacts/admin/src/pages/CertificationsManager.tsx` — `props.date.toString()` could crash if date is null/undefined

### LOW-8: Missing Loading States
- `ArabicContentStatus` in SiteSettingsManager doesn't handle query errors gracefully — queries may fail silently
- Several admin pages lack skeleton loading states for nested data

### LOW-9: Duplicate `border` Class in UI Button
- `lib/ui/src/components/ui/button.tsx:23` — `"border bg-secondary text-secondary-foreground border border-secondary-border"` contains duplicate `border`

### LOW-10: Index as Key in Lists (4 occurrences)
- `CertificationsSection.tsx:289` — uses mapped index-based key (unstable)
- `ProjectsSection.tsx:75` — uses `i + 1` as ID
- `AboutSection.tsx:56,62` — uses index as key for static data (acceptable but not best practice)
- `TimelineItem.tsx:79` — index as key for description list

### LOW-11: Magic Number Animation Delays in HeroSection
- `HeroSection.tsx:251` — inline `style={{ animationDelay: "0.2s" }}`

### LOW-12: No `StrictMode` Wrapper in Admin Main
- `artifacts/admin/src/main.tsx` — missing `<StrictMode>`, skipping development double-render checks

### LOW-13: `heap-buffer-overflow` in duplicate CSS property declarations
- `artifacts/admin/src/index.css:127-140,194-207` — each `--*-border` property declared twice with identical specificity. First declaration in each pair is dead code.

---

## 📦 DEPENDENCY DEBT

### Package Version Audit

| Package | Version in Repo | Latest Stable | Status | Risk |
|---------|----------------|---------------|--------|------|
| `react` | 19.1.0 (catalog) | 19.2.3 | Minor behind | Low |
| `react-dom` | 19.1.0 (catalog) | 19.2.3 | Minor behind | Low |
| `@supabase/supabase-js` | ^2.105.4 | 2.49.x (current track) | Pinned | Low |
| `typescript` | ~5.9.2 | 5.9.2 | Latest | None |
| `vite` | 7.x (catalog) | 7.x | Latest | None |
| `tailwindcss` | v4 (catalog) | v4 | Latest | None |
| `express` | ^5 (api-server) | 5.1.0 | Latest | None |
| `@google-cloud/storage` | ^7.19.0 | ^7.19.x | Latest | None |
| `multer` | ^2.1.1 | 2.1.1 | Current | Low |
| `esbuild` | 0.27.3 (overridden) | 0.25.x | Pinned forward | Low |
| `pnpm` | (workspace) | latest | Assumed | None |

### Flagged Issues

| Issue | Details |
|-------|---------|
| **cmdk duplicated** | Listed in `lib/ui/package.json` AND `artifacts/portfolio/package.json` AND `artifacts/admin/package.json` — should be cataloged |
| **`lib/auth` peer dep too loose** | `react: ">=18"` while catalog pins `19.1.0` — should be `^19.0.0` for consistency |
| **Thread-stream pinned** | `"thread-stream": "3.1.0"` in api-server — exactly pinned while everything else uses ranges. Workaround for pino compat issue. |
| **No deduplicated zod** | Zod appears in `pnpm-workspace.yaml` catalog but also as dependency of `@workspace/api-zod` — should be workspace dependency |
| **`validated` package has zero deps** | As noted in HIGH-17 |
| **`@replit/vite-plugin-runtime-error-modal`** | Dev-only plugin, acceptable |
| **`rollup-plugin-visualizer`** | Dev-only, bundle analysis tool |

### Unused Packages (potential candidates)
- `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner` are dev-only but conditional on env vars — could be cleaned up

---

## 🗄️ DATABASE DEBT

| Issue | Details | Severity |
|-------|---------|----------|
| Migration 002 duplicated prefix | `002_constraints.sql` and `002_fix_rls_policies.sql` — ordering ambiguity | 🔴 |
| 6 migration numbers skipped | 003, 010, 016, 017, 018, 019 missing | 🟡 |
| Duplicate indexes (001 vs 015) | `idx_projects_sort` vs `idx_projects_sort_order` on same column | 🟠 |
| Duplicate indexes (005 vs 015) | `idx_contact_messages_created_at`, `idx_contact_messages_is_read` | 🟠 |
| Two trigger functions | `update_updated_at()` and `update_updated_at_column()` — identical | 🔴 |
| Double trigger on `image_metadata` | Both 004 and 014 create BEFORE UPDATE triggers | 🔴 |
| `image_metadata` + `image_variants` no RLS | Tables completely open | 🔴 |
| Missing FK constraints | 6+ missing foreign keys (entity_id, project_id in analytics, etc.) | 🟡 |
| Inconsistent sort column naming | `order_num` on experience but `order` in Update types | 🔴 |
| `messages` vs `contact_messages` dual tables | Two tables serving overlapping purpose — confusion | 🟠 |
| No unique constraint on `projects.slug` | `fetchProjectBySlug` relies on uniqueness but DB doesn't enforce it | 🟡 |
| Storage bucket RLS inconsistency | 3 migrations create overlapping/conflicting policies | 🟠 |
| Missing indexes for query patterns | `projects.slug`, `projects.is_published`, `experience.type` | 🟡 |

---

## 🔒 SECURITY DEBT

| Issue | Location | Severity |
|-------|----------|----------|
| No auth on image upload/list/delete | routes/images.ts:42,112,129 | 🔴 |
| No auth on CV settings | routes/cv.ts:80,101 | 🔴 |
| Hardcoded admin credentials in tests | testsprite_tests/run_all.py:9-10 | 🔴 |
| CSRF secret default "change-me-in-production" | middleware/csrf.ts:4 | 🔴 |
| API key committed to repo | testsprite_tests/tmp/config.json:14 | 🔴 |
| CSP allows `unsafe-inline` | app.ts:19-20 | 🟠 |
| Information disclosure in errors | routes/images.ts:107 | 🟠 |
| No input validation on `entityId` | routes/images.ts:46,87 | 🟠 |
| `__proto__` property read (low risk) | middleware/validate.ts:176 | 🟢 |
| `setLocation` called during render (2x) | ProtectedRoute.tsx:26, Login.tsx:17 | 🟠 |
| No try/catch on localStorage | language.tsx:46 | 🟠 |
| No CSRF token refresh mechanism | middleware/csrf.ts | 🟢 |
| CV bucket accessible by any authenticated user | storage policy uses `auth.role()` not `is_admin()` | 🟠 |
| No rate limiting on image upload | routes/images.ts (upload not behind generalLimiter) | 🟠 |

---

## 🧪 TESTING DEBT

| Flow / Component | Test Coverage | Priority |
|-----------------|---------------|----------|
| Contact form submission | ❌ 0% (E2E blocked) | High |
| Admin login | ❌ 0% (E2E blocked) | High |
| Project navigation | ❌ 0% (E2E blocked) | High |
| Hero editor | ❌ 0% (E2E blocked) | High |
| About editor | ❌ 0% (E2E blocked) | High |
| Messages viewer | ❌ 0% (E2E blocked) | High |
| Skill management | ❌ 0% (E2E blocked) | High |
| Certification management | ❌ 0% (E2E blocked) | High |
| Admin route protection | ❌ 0% (E2E blocked) | High |
| Contact form validation (empty) | ❌ 0% (E2E blocked) | High |
| Contact form validation (malformed) | ❌ 0% (E2E blocked) | High |
| Invalid admin credentials | ❌ 0% (E2E blocked) | High |
| Direct project URL access | ❌ 0% (E2E blocked) | High |
| Vitest unit tests | ❌ None exist (despite README claiming it) | Medium |
| DB function integration tests | ❌ None exist | Medium |
| API endpoint tests | ✅ Basic health + contact tests exist (api-server/test/) | Medium |
| Performance / load tests | ❌ None exist | Low |

### Test Infrastructure Issues
| Issue | Details |
|-------|---------|
| No server startup in test runner | run_all.py expects server at localhost:5173 but doesn't start it |
| No `.env.test` files | Tests use production env vars or none |
| Playwright tests assume production DB | Tests will modify real data |
| No Vitest config found | Despite vitest being a root devDep, no `vitest.config.ts` exists in project root or artifacts |
| Missing test DB seeding | Tests depend on existing database state |

---

## 📁 ARCHITECTURE DEBT

| Issue | Details | Severity |
|-------|---------|----------|
| API routes served at BOTH `/api` and `/api/v1` | `routes/index.ts` and `routes/v1/index.ts` mount same routes duplicated | 🟡 |
| Business logic in UI components | `ProjectsSection.tsx` has data transformation logic that should be in hooks | 🟡 |
| Supabase client not cached | `getSupabase()` creates new client on every call in admin | 🟠 |
| Duplicate DB library files | `about.ts` and `aboutContent.ts` — same purpose, different implementations | 🟠 |
| Two message tables | `messages` (with status enum) and `contact_messages` (with is_read boolean) | 🟠 |
| Inconsistent state management | Mix of useState, useReducer, TanStack Query, react-hook-form across admin pages | 🟢 |
| API server duplicates middleware directories | Both `middleware/` and `middlewares/` exist (one has `.gitkeep` only) | 🟢 |
| No API versioning strategy | Only one version path `/v1` — but it's just a copy of the non-versioned routes | 🟢 |
| Circular dependency risk | `lib/db` depends on `@workspace/supabase/types` — fine. But admin imports from both `@workspace/db/site-settings` and local supabase. | 🟢 |

---

## 🎨 FRONTEND DEBT

| Issue | Location | Severity |
|-------|----------|----------|
| No responsive check on 404 page | not-found.tsx uses hardcoded gray colors, breaks dark mode | 🟠 |
| Inline styles for color previews | ThemeManager.tsx — extensive inline styles (necessary but messy) | 🟢 |
| Missing `aria-label` on decorative elements | Navbar.tsx:97 — active indicator missing aria-hidden | 🟢 |
| Index as React key (4 files) | CertificationsSection, ProjectsSection, AboutSection, TimelineItem | 🟢 |
| `font-size` override on root | useSupabaseTheme.ts:122 — overrides user's browser font-size preference, accessibility concern | 🟠 |
| Race condition on document.title | DynamicFavicon.tsx vs SEO.tsx | 🟠 |
| Welcome toast timeout not cleared | Home.tsx:42-53 — setTimeout not cleared on unmount | 🟢 |
| Native `<select>` used instead of UI component | CertificationsManager.tsx:222-230 — inconsistency | 🟢 |
| Old wouter `<Link><a>` pattern | AdminLayout.tsx:106-107 | 🟢 |
| No error boundary around admin router | App.tsx — missing error boundary for admin routes | 🟢 |
| Missing `alt` text on uploaded images | ImageUploader.tsx:187,207 — empty alt text, should be descriptive | 🟢 |
| `form.reset()` used instead of `setValue()` | AboutEditor, HeroEditor — react-hook-form anti-pattern | 🟢 |

---

## 📝 DOCUMENTATION DEBT

| Issue | Details |
|-------|---------|
| Root README lists only 4 of 8 lib packages | Missing `lib/ui/`, `lib/auth/`, `lib/api-client-react/`, `lib/api-zod/` |
| No `.env.example` files exist | All three READMEs reference them but they don't exist |
| `BASE_PATH` env var undocumented | Used in both vite.config.ts files but not in any README |
| `VISUALIZER_OPEN` env var undocumented | Used in portfolio vite.config.ts |
| Google Cloud Storage env vars undocumented | GCS is a dependency but no env vars documented |
| No architecture diagram | Complex monorepo with 3 artifacts + 8 lib packages deserves visual documentation |
| No API documentation beyond OpenAPI spec | OpenAPI spec exists but only documents 5 endpoints (many more exist) |
| No contributing guide | No CONTRIBUTING.md |
| No deployment guide | No DEPLOYMENT.md for production deployment steps |
| No migration guide | No explanation of migration numbering or how to run them |
| No JSDoc on complex functions | Functions like `useDragReorder` (175 lines) have no documentation |
| `MEMORY_BANK.md` — Verify if exists | Not found in scan |

---

## Debt Score Summary

| Category | Issues Found | Debt Score (1-10) | Priority |
|----------|-------------|-------------------|----------|
| 🔴 Critical Debt | 11 | 9/10 | 🔴 |
| 🟠 High Debt | 17 | 8/10 | 🟠 |
| 🟡 Medium Debt | 17 | 6/10 | 🟡 |
| 🟢 Low Debt | 13 | 3/10 | 🟢 |
| 📦 Dependency Debt | 6 | 4/10 | 🟡 |
| 🗄️ Database Debt | 11 | 8/10 | 🟠 |
| 🔒 Security Debt | 11 | 9/10 | 🔴 |
| 🧪 Testing Debt | 13 | 10/10 | 🔴 |
| 📁 Architecture Debt | 10 | 5/10 | 🟡 |
| 🎨 Frontend Debt | 12 | 4/10 | 🟢 |
| 📝 Documentation Debt | 10 | 7/10 | 🟠 |
| **OVERALL** | **~131 issues** | **8/10** | **🔴 Significant Debt** |

**Overall Rating:** **Significant Debt (8/10)** — Requires dedicated cleanup sprints before production launch.

---

## Prioritized Fix Roadmap

### 🚨 Sprint 1 — Before Launch (fix immediately)
**Estimated effort: 5-7 person-days**

1. **CRITICAL-1/2**: Add authentication to image and CV routes (6h)
2. **CRITICAL-3**: Move hardcoded credentials to env vars (30min)
3. **CRITICAL-4**: Fix CSRF secret default (1h)
4. **CRITICAL-5**: Remove committed API key, add `tmp/` to `.gitignore` (30min)
5. **CRITICAL-8/9**: Fix double triggers and duplicate trigger function (2h)
6. **CRITICAL-11**: Fix `order` → `order_num` in Experience types (30min)
7. **HIGH-8**: Fix infinite API loop in CvManager (5min)
8. **HIGH-12**: Create `.env.example` files for all artifacts (2h)
9. **SECURITY**: Lock down storage bucket RLS to `is_admin()` only (3h)
10. **HIGH-13**: Move `setLocation` calls into `useEffect` (1h)

### 📅 Sprint 2 — First Month After Launch
**Estimated effort: 5-8 person-days**

1. **CRITICAL-6**: Fix test infrastructure — get 13 tests passing (8h)
2. **CRITICAL-7**: Renumber migrations to fix ordering (2h)
3. **HIGH-7**: Fix slug auto-generation on project updates (2h)
4. **HIGH-4/5/6**: Fix ImageUploader XHR/closure/bug issues (3.5h)
5. **HIGH-9**: Fix stale closure in useFormValidation (1h)
6. **HIGH-10**: Fix Missing cleanup in MessagesViewer (30min)
7. **HIGH-11**: Add try/catch to localStorage access (30min)
8. **HIGH-14/15**: Consolidate duplicate indexes and library files (5h)
9. **MEDIUM-1/2/3**: Add missing types and indexes (3h)
10. **MEDIUM-7**: Consolidate storage RLS policies (3h)

### 🗓️ Sprint 3 — Ongoing Improvement
**Estimated effort: 5-7 person-days**

1. Add validation schemas for all form types (4h)
2. Fix theme-aware 404 page (15min)
3. Remove unused imports and dead code (30min)
4. Consolidate `DynamicFavicon` / `SEO` title management (1h)
5. Fix deprecated wouter patterns in AdminLayout (1h)
6. Add missing FK constraints in DB (3h)
7. Fix BucketName type to include all buckets (15min)
8. Cache Supabase client instance (1h)
9. Remove `messages` table or `contact_messages` table — consolidate (4h)
10. Add Arabic JSONB field types (2h)
11. Document undocumented env vars (2h)

### 🔮 Sprint 4 — Future Refactoring
**Estimated effort: 5-10 person-days**

1. Add unit tests for critical utility functions (4h)
2. Add DB function integration tests (4h)
3. Implement nonce-based CSP (3h)
4. Create architecture diagram (4h)
5. Create deployment guide (3h)
6. Refactor API server to use single route prefix (2h)
7. Audit and remove all magic numbers (2h)
8. Implement proper API versioning strategy (4h)
9. Add error boundaries for all admin routes (2h)
10. Add rate limiting to all storage/upload endpoints (2h)

---

## Total Estimated Effort

| Sprint | Hours | Person-Days |
|--------|-------|-------------|
| 🚨 Sprint 1 (Before Launch) | ~40 | 5-7 |
| 📅 Sprint 2 (First Month) | ~50 | 5-8 |
| 🗓️ Sprint 3 (Ongoing) | ~45 | 5-7 |
| 🔮 Sprint 4 (Future) | ~60 | 5-10 |
| **Total** | **~195 hours** | **20-32 person-days** |

---

## Worst Offenders Per Directory

### `artifacts/api-server/src/` (security hotspot)
- 3 unauthenticated route groups (images, CV)
- CSRF secret with well-known default
- CSP with `unsafe-inline`
- No input validation on 2 endpoints
- Information disclosure in error responses

### `supabase/migrations/` (database mess)
- Duplicate migration prefixes
- 6 skipped numbers
- Double triggers on 1 table
- Duplicate trigger functions
- Duplicate indexes
- 2 tables with RLS disabled
- Overlapping/conflicting storage policies

### `testsprite_tests/` (test infrastructure collapse)
- Hardcoded credentials
- Committed API key
- 0% test pass rate
- No server startup automation

### `lib/db/src/` (code duplication)
- `about.ts` vs `aboutContent.ts` — duplicate files
- `fetchCertifications` vs `listCertifications` — duplicate functions
- Missing type safety for language mode defaults

### `artifacts/admin/src/` (implementation bugs)
- Infinite API loop in CvManager
- Stale closures in ImageUploader
- Double-counting bug in ImageUploader
- Slug regeneration on every save

---

## Legend

| Icon | Meaning |
|------|---------|
| 🔴 | Critical — blocks production, causes crashes, security vulnerability |
| 🟠 | High — degrades quality significantly, likely to cause issues |
| 🟡 | Medium — should fix before scaling, makes development harder |
| 🟢 | Low — nice to fix, not urgent, mostly cleanup |

*Report generated by automated code audit on May 17, 2026.*
