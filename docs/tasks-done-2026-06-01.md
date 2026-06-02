# Tasks Done — 2026-06-01

## Self-Training Deep Audit & Autonomous Fix (Batch 1 + 2 + 3)

### Summary
Deep codebase exploration (~180 files, 12 directories) followed by autonomous execution of 28 tasks across 3 batches. Focused on security, null safety, code quality, dead code removal, and UX fixes.

---

### Batch 1 — Critical Fixes & Security (12 tasks)

#### TASK-001 ✅ | Verify secrets not in git
- `.env` and `.env.local` are properly gitignored and NOT tracked by git (false positive from initial scan)

#### TASK-002 ✅ | CRITICAL — Remove VITE_ADMIN_API_KEY from client bundle
- **api-client.ts**: Removed `VITE_ADMIN_API_KEY` usage and API key fallback logic. Any `VITE_*` env var is embedded in client JS bundle, exposing the admin API key publicly.
- **api-client.test.ts**: Removed test for API key fallback
- **usePrefetchRoutes.test.ts**: Removed VITE_ADMIN_API_KEY stub
- **.env.example**: Added warning about VITE_ prefix exposure

#### TASK-003 ✅ | CRITICAL — Fix ImageUploader auth headers + bugs
- **ImageUploader.tsx**: Fixed 3 bugs:
  1. Added Clerk `Authorization` header to XHR upload (was missing, uploads would fail with 401)
  2. Fixed double-counting in file limit check (`currentCount + uploaded.length` → `currentCount`)
  3. Fixed stale closure with functional state updater (`setUploaded(prev => ...)`)

#### TASK-004 ✅ | CRITICAL — Migrate CvManager to api-client
- **api-client.ts**: Added `publicRequest<T>()` helper and `cv.getSettings()` / `cv.updateSettings()` endpoints
- **CvManager.tsx**: Migrated all 3 raw `fetch` calls to use centralized `api.cv.*`. Now includes auth headers, CSRF, abort timeout, and consistent error handling.

#### TASK-005 ✅ | CRITICAL — Fix ContactForm res.ok check
- **ContactForm.tsx**: Added `res.ok` check before `res.json()`. Previously, a 500 response with non-JSON body would throw a confusing parse error.

#### TASK-006 ✅ | CRITICAL — Fix null safety in lib/db/storage.ts
- **storage.ts**: Added null checks for `getSupabase()` in `uploadFile`, `deleteFile`, `getPublicUrl`, `uploadFileWithProgress`. Previously, all 4 functions would crash with TypeError if Supabase was unconfigured.

#### TASK-007 ✅ | CRITICAL — Fix aboutContent languages shape mismatch
- **aboutContent.ts**: Changed default languages from `{ lang, level (string), pct }` to `{ name, level (number) }` matching the DB type and admin editor expectations.

#### TASK-008 ✅ | CRITICAL — Fix req.user! non-null assertions
- **certifications.ts, experience.ts, messages.ts, projects.ts, skills.ts**: Replaced all `req.user!.id` with `req.user?.id ?? ""` to prevent TypeError crashes when user is undefined (e.g., API key auth when Supabase is down).

#### TASK-009 ✅ | Fix HeroEditor custom_links not persisted
- **HeroEditor.tsx**: Removed dead `custom_links` feature — no DB column exists, portfolio doesn't render them, save mutation never included them. Removed UI, form state, helper functions, and type field.

#### TASK-010 ✅ | Fix ProjectsSection slug mismatch
- **ProjectsSection.tsx**: Changed slug generation from `p.title.toLowerCase().replace(...)` to `p.slug ?? fallback`. The DB has a `slug` column that was being ignored.

#### TASK-011 ✅ | Remove duplicate SEO/title rendering
- **Home.tsx**: Removed duplicate `<SEO />` component (App.tsx already sets it)
- **DynamicFavicon.tsx**: Removed conflicting `document.title = siteName` (SEO.tsx handles title)
- **App.tsx**: Cleaned up FIX: UX-009 comment

#### TASK-012 ✅ | Clean up dead code and unused imports
- **5 admin routes**: Removed unused `paginated` imports from certifications, experience, messages, projects, skills
- **Deleted 4 files**: `use-form-dirty.ts`, `use-form-dirty.test.ts`, `useSmartNavigation.ts`, `useSmartNavigation.test.tsx` — hooks never imported by production code
- **MessageCard.tsx**: Exported `isUnread`/`isArchived` helpers
- **MessagesManager.tsx**: Imported shared helpers instead of duplicating them

---

### Batch 2 — Code Quality & Consistency (8 tasks)

#### TASK-013 ✅ | Migrate api-server to centralized env module
- **8 files migrated**: `logger.ts`, `supabase-client.ts`, `csrf.ts`, `rateLimiter.ts`, `app.ts`, `adminAuth.ts`, `cv.ts`, `contact.ts`, `images.ts`
- All `process.env.*` reads replaced with `env.*` accessors (typed, validated, centralized)
- Only `preload-env.ts`, `test/setup.ts`, and `env.ts` itself retain `process.env` (intentional)

#### TASK-014 ✅ | Fix CSRF token caching with TTL
- **csrf.ts**: Added 50-minute TTL to cached CSRF token (server cookie TTL is 1 hour). Previously cached indefinitely with no expiry.

#### TASK-015 ✅ | Fix cv.ts inconsistent error response format
- **cv.ts**: Changed all `{ error: "..." }` responses to use standardized `{ success: false, message: "..." }` format via `ok()`, `badRequest()`, `serverError()` helpers.

#### TASK-016 ✅ | Fix use-reveal.ts RefObject type mismatch
- **use-reveal.ts**: Changed `useRef<HTMLElement>(null)` to `useRef<HTMLElement | null>(null)`
- **8 components**: Removed all `as React.RefObject<HTMLElement>` / `as React.RefObject<HTMLDivElement>` casts from AboutSection, CertificationsSection, ContactSection, ExperienceSection, ProjectsSection, SkillsSection, CertCard, TimelineItem

#### TASK-017 ✅ | Fix toast remove delay
- **use-toast.ts**: Changed `TOAST_REMOVE_DELAY` from 1000000 (16.7 minutes) to 5000 (5 seconds)

#### TASK-018 ✅ | Delete dead validate.ts middleware
- **Deleted**: `api-server/src/middleware/validate.ts` — duplicated zod functionality, not imported by any production or test file

#### TASK-019 ✅ | Clean up FIX/STANDARDIZED comment clutter
- Removed 33 resolved audit markers (`FIX: UX-xxx` and `STANDARDIZED: Type X`) across 18 files (10 admin, 8 portfolio)

#### TASK-020 ✅ | ContactSection loading strategy
- ContactSection already has graceful fallback to static `CONTACT` data when Supabase is loading — better UX than skeleton (content appears immediately)

---

### Files Modified (30+)

**Admin (15 files):**
- `src/lib/api-client.ts` — removed API key fallback, added CV endpoints + publicRequest
- `src/lib/api-client.test.ts` — removed API key fallback test
- `src/hooks/usePrefetchRoutes.test.ts` — removed API key stub
- `src/components/ImageUploader.tsx` — auth headers + bug fixes
- `src/components/MessageCard.tsx` — exported shared helpers
- `src/pages/CvManager.tsx` — migrated to api-client
- `src/pages/HeroEditor.tsx` — removed dead custom_links
- `src/pages/MessagesManager.tsx` — imported shared helpers
- `src/pages/{Certifications,Experience,Projects,Skills}Manager.tsx` — FIX comment cleanup
- `src/components/{ErrorBoundary,Header,Sidebar}.tsx` — FIX comment cleanup
- `src/pages/{Seo,Typography}Manager.tsx` — FIX comment cleanup

**Portfolio (14 files):**
- `src/components/ContactForm.tsx` — res.ok check
- `src/components/ProjectsSection.tsx` — slug fix
- `src/components/DynamicFavicon.tsx` — removed conflicting title
- `src/pages/Home.tsx` — removed duplicate SEO
- `src/App.tsx` — FIX comment cleanup
- `src/hooks/use-reveal.ts` — RefObject type fix
- `src/components/{About,Certifications,Contact,Experience,Projects,Skills}Section.tsx` — removed RefObject casts
- `src/components/{CertCard,TimelineItem}.tsx` — removed RefObject casts
- `src/components/{HeroSection,Navbar,ProjectCard}.tsx` — FIX comment cleanup
- `src/pages/not-found.tsx` — FIX comment cleanup

**Shared Libraries (4 files):**
- `lib/db/src/storage.ts` — null safety
- `lib/db/src/aboutContent.ts` — languages shape fix
- `lib/ui/src/hooks/use-toast.ts` — toast delay fix
- `.env.example` — API key warning

**API Server (10 files):**
- `src/lib/logger.ts`, `src/lib/supabase-client.ts` — env migration
- `src/middleware/adminAuth.ts`, `src/middleware/csrf.ts`, `src/middleware/rateLimiter.ts` — env migration
- `src/app.ts` — env migration
- `src/routes/cv.ts` — env migration + error format fix
- `src/routes/public/contact.ts` — env migration
- `src/routes/images.ts` — env migration
- `src/routes/admin/{certifications,experience,messages,projects,skills}.ts` — req.user fix + unused import cleanup

**Deleted Files (5):**
- `artifacts/admin/src/hooks/use-form-dirty.ts`
- `artifacts/admin/src/hooks/use-form-dirty.test.ts`
- `artifacts/admin/src/hooks/useSmartNavigation.ts`
- `artifacts/admin/src/hooks/useSmartNavigation.test.tsx`
- `artifacts/api-server/src/middleware/validate.ts`

---

### Batch 3 — UX Fixes & Remaining Issues (8 tasks)

#### TASK-021 ✅ | Add UUID validation on images/:id routes
- **images.ts**: Added `z.string().uuid()` validation on both GET /images/:id/metadata and DELETE /images/:id routes. Invalid UUIDs now return 400 instead of hitting the DB.
- **images.test.ts**: Updated test to use valid UUID, added new test for invalid UUID returning 400.

#### TASK-022 ✅ | Fix MessagesManager query invalidation after markRead
- **MessagesManager.tsx**: Added `queryClient.invalidateQueries({ queryKey: ["messages"] })` after markRead, markAllRead, and delete operations. UI now updates immediately instead of waiting for next refetch.

#### TASK-023 ✅ | Fix OptimizedImage fallback not applied
- **OptimizedImage.tsx**: The `<img>` was using `mediumUrl` directly while `onError` set `imgSrc` state. Fixed by using `effectiveSrc` (which respects the fallback) and preventing infinite error loops.

#### TASK-024 ✅ | Fix bio1 displayed twice in AboutSection
- **AboutSection.tsx**: `about.bio1` was shown both in the section header subtitle and in the body content. Removed the duplicate from the body — header shows bio1, body shows bio2.

#### TASK-025 ✅ | Replace hardcoded "Cairo, Egypt" with centralized data
- **HeroSection.tsx**: Changed `{"Cairo, Egypt"}` to `{CONTACT.location}`
- **Footer.tsx**: Changed hardcoded "Cairo, Egypt" to `{CONTACT.location}` in two places
- **SEO.tsx**: Changed hardcoded "Cairo, Egypt" to `${CONTACT.location}` in meta description

#### TASK-026 ✅ | Add sandbox to OpenStreetMap iframe
- **ContactInfoPanel.tsx**: Added `sandbox="allow-scripts allow-same-origin"` to the OpenStreetMap iframe for security hardening.

#### TASK-027 ✅ | Fix mobile menu focus return on close
- **Navbar.tsx**: Added `menuButtonRef` and a `useEffect` that returns focus to the hamburger button when `mobileOpen` becomes false. Improves keyboard accessibility.

#### TASK-028 ✅ | Log trackEvent errors instead of swallowing
- **Home.tsx, ProjectDetail.tsx, ContactInfoPanel.tsx, HeroSection.tsx**: Changed `.catch(() => {})` to `.catch((err) => logWarn("trackEvent failed", err))` for debugging visibility.

---

### Batch 3 Files Modified (10)
- `artifacts/api-server/src/routes/images.ts` — UUID validation
- `artifacts/api-server/src/test/routes/images.test.ts` — updated tests
- `artifacts/admin/src/pages/MessagesManager.tsx` — query invalidation
- `artifacts/portfolio/src/components/OptimizedImage.tsx` — fallback fix
- `artifacts/portfolio/src/components/AboutSection.tsx` — bio1 dedup
- `artifacts/portfolio/src/components/HeroSection.tsx` — centralized location
- `artifacts/portfolio/src/components/Footer.tsx` — centralized location
- `artifacts/portfolio/src/components/SEO.tsx` — centralized location
- `artifacts/portfolio/src/components/ContactInfoPanel.tsx` — iframe sandbox
- `artifacts/portfolio/src/components/Navbar.tsx` — focus return
- `artifacts/portfolio/src/pages/Home.tsx` — trackEvent logging
- `artifacts/portfolio/src/pages/ProjectDetail.tsx` — trackEvent logging
