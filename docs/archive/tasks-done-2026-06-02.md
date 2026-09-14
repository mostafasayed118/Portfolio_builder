# Tasks Done — 2026-06-02

## Self-Training Batch: 25-task security & quality sweep

### Summary

25-task deep sweep covering 5 critical security issues, 12 quality improvements, and 8 missing-feature additions. Heavy focus on the security model (CSP, auth, RLS) and on closing the remaining `as unknown as` escape hatches in production code.

---

## Batch 1 — Critical Security (5 tasks)

### TASK-001 ✅ | CRITICAL — CSP hardened in api-server

- **`artifacts/api-server/src/app.ts`**: Replaced the `helmet()` config that had a misleading "TODO: nonce-based CSP" comment with a strict, JSON-server-appropriate policy using `useDefaults: false`, `default-src 'none'`, `frame-ancestors 'none'`, `object-src 'none'`, `'unsafe-inline'` gated to dev only. Added `crossOriginOpenerPolicy: same-origin`, `crossOriginResourcePolicy: same-origin`, `referrerPolicy: no-referrer`. The api-server is JSON-only so the policy is defense-in-depth (in case a future endpoint ever returns rendered HTML).

### TASK-002 ✅ | CRITICAL — CSP meta tags on both SPAs

- **`artifacts/portfolio/index.html`**: Added `<meta http-equiv="Content-Security-Policy">` with allowlists for Supabase REST+Realtime, Google Fonts, and OpenStreetMap iframe. `frame-ancestors 'none'`, `object-src 'none'`.
- **`artifacts/admin/index.html`**: Same treatment, with additional allowlist entries for Clerk (`*.clerk.com`, `*.clerk.accounts.dev`).
- Both also got `<meta name="color-scheme" content="light dark">`, `format-detection: telephone=no`, and a second `apple-touch-icon-precomposed` link.

### TASK-003 ✅ | CRITICAL — API-key auto-provisioned superadmin removed

- **`artifacts/api-server/src/middleware/adminAuth.ts`**: `getDefaultAdminUser()` now creates the API-key user with `role: "user"` instead of `role: "superadmin"`. The previous code gave any caller holding `ADMIN_API_KEY` immediate `superadmin` powers — meaning they could change every other admin's role. Promote via the existing `promote-superadmin` script when actually needed.

### TASK-004 ✅ | CRITICAL — `is_admin()` GUC fallback gated

- **`supabase/migrations/044_fix_is_admin_function.sql`**: The legacy `request.jwt.claims` GUC fallback is now only consulted when the new `app.allow_guc_admin_fallback` GUC is `'on'` (default: OFF). A misconfigured connection pooler that sets `request.jwt.claims` can no longer inject an attacker-controlled email to bypass RLS in production. Enable in dev with `ALTER DATABASE postgres SET app.allow_guc_admin_fallback = 'on';`.

### TASK-005 ✅ | CRITICAL — Vite `allowedHosts` restricted

- **`artifacts/portfolio/vite.config.ts`**, **`artifacts/admin/vite.config.ts`**: Replaced `allowedHosts: true` (open) with an explicit allowlist: `localhost`, `127.0.0.1`, `0.0.0.0`, `.repl.co`, `.replit.dev`, `.replit.app`, `mustafasayed.replit.app`. Closes the DNS-rebinding attack surface in the dev server.

---

## Batch 2 — TypeScript & DX (4 tasks)

### TASK-006 ✅ | Remove `as unknown as SupabaseClient<any>` in singleton-upsert

- **`artifacts/api-server/src/lib/singleton-upsert.ts`**: Introduced a local `UpsertClient` interface covering only the two mutating methods. The `any` is now scoped to a single object literal, never escapes the function. `singletonUpsert`'s signature now properly types its `payload` as `Partial<TableUpdateShape<T>> & Partial<TableInsertShape<T>>` derived from the `Database` generic.

### TASK-007 ✅ | Remove `as unknown as` in SkillsManager form

- **`artifacts/admin/src/pages/SkillsManager.tsx`**: The `SkillForm` type now properly includes `category_ar: SkillRow["category_ar"]` and `user_id: SkillRow["user_id"]` as nullable fields. `withRowDefaults` no longer needs any cast.

### TASK-009 ✅ | Log raw body in api-client parse failures

- **`artifacts/admin/src/lib/api-client.ts`**: When a non-2xx response returns non-JSON, the raw text (truncated to 1KB) is now logged via `logWarn` for both `request()` and `publicRequest()`. Previously the error was silently swallowed.

### TASK-010 ✅ | Throw at module load if `apiBase` empty in production

- **`artifacts/admin/src/lib/api-client.ts`**: Top-of-module guard throws with an actionable error if `VITE_API_URL` is missing in production. Previously every admin call would silently 404.

---

## Batch 3 — Performance & SEO (4 tasks)

### TASK-008 ✅ | Remove hardcoded `JOB_TITLE` from SEO

- **`artifacts/portfolio/src/components/SEO.tsx`**: `JOB_TITLE` was hardcoded to `"Data Engineer"`. Now derives from `useHeroContent().roles[0]`, falling back to the static data and finally to a generic string. The site title and JSON-LD `jobTitle` stay accurate when the admin updates roles.

### TASK-012 ✅ | Add BreadcrumbList + JSON-LD improvements

- **`artifacts/portfolio/src/components/SEO.tsx`**: Added a `BreadcrumbList` JSON-LD schema, an `inLanguage` field on the `WebSite` schema for proper i18n rich-results eligibility, and the `jobTitle` now flows from the live hero data.

### TASK-013 ✅ | Remove unused `recharts` (~200KB) and `rollup-plugin-visualizer`

- **`artifacts/portfolio/package.json`**: Removed `recharts` (was a dep but never imported).
- **`artifacts/portfolio/vite.config.ts`**: Removed `rollup-plugin-visualizer` (no config in scripts). Removed `vendor-charts` from `manualChunks`.

### TASK-017 ✅ | Theme flash-of-wrong-theme (FOWT) eliminated

- **`artifacts/portfolio/src/lib/theme.tsx`**: Exposed `NO_FOUC_SCRIPT` constant; switched from `classList.toggle(force)` to explicit `add`/`remove` to avoid class duplication.
- **`artifacts/portfolio/index.html`**: Added inline pre-hydration `<script>` that reads localStorage / `prefers-color-scheme` and toggles the `dark` class on `<html>` BEFORE React mounts. Eliminates the light-flash on dark-mode first paint.

---

## Batch 4 — Reliability (3 tasks)

### TASK-014 ✅ | Replace console.warn in auth-token with structured logger

- **`artifacts/admin/src/lib/auth-token.ts`**: All `if (import.meta.env.DEV) console.warn(...)` calls replaced with `logWarn(...)` from the app logger. Production logs go to stdout as JSON.

### TASK-015 ✅ | Abort signal for uploadFileWithProgress

- **`lib/db/src/storage.ts`**: `uploadFileWithProgress` now accepts an `AbortSignal`. On abort, the underlying `XMLHttpRequest` is aborted and the promise resolves with `{ error: "Upload cancelled" }`. Listeners are cleaned up on every path.

### TASK-016 ✅ | Reduce `getClerkToken` initial wait

- **`artifacts/admin/src/lib/auth-token.ts`**: Initial wait reduced from 3s to 750ms. Retry delay from 500ms to 250ms. Faster first-request UX.

---

## Batch 5 — UX & Accessibility (4 tasks)

### TASK-018 ✅ | `data-testid` convention

- **`artifacts/admin/src/components/Sidebar.tsx`**: Added `data-testid="admin-sidebar"` and `data-testid="nav-link-{path}"` on each nav link.
- **`artifacts/admin/src/pages/SkillsManager.tsx`**, **`ProjectsManager.tsx`**: Added `data-testid` on the manager container, title, count, and add buttons.

### TASK-019 ✅ | `apple-touch-icon` precomposed link

- **`artifacts/portfolio/index.html`**: Added `apple-touch-icon-precomposed` for older iOS pinning.
- **`artifacts/admin/index.html`**: Added `apple-touch-icon` link.

### TASK-020 ✅ | `color-scheme` meta

- Both `index.html` files declare `<meta name="color-scheme" content="light dark">` so the browser's default form controls and scrollbars match the active theme.

### TASK-021 ✅ | Toast viewport ARIA labelling

- **`lib/ui/src/components/primitives/toaster.tsx`**: Added `aria-label="Notifications"` and `data-testid="toast-viewport"` to the Radix `ToastViewport`. The individual `Toast.Root` elements already had `role="status"` + `aria-live="polite"` so we don't double-announce; instead we add a stable test hook and a screen-reader-friendly label.

---

## Batch 6 — Documentation (3 tasks)

### TASK-022 ✅ | New `docs/security.md`

- Full security posture document: defense-in-depth diagram, CSP layers, authentication table, rate-limit table, RLS explanation, CSRF flow, secrets handling, production deployment checklist.

### TASK-023 ✅ | Expanded `CONTRIBUTING.md`

- Added step-by-step "Adding a new admin page" and "Adding a new public section" guides with the 4-layer validation contract, DB→API→hook→page flow, and the test-isolation pattern.

### TASK-024 ✅ | CSP report-uri

- Decided against adding a report-uri without a real endpoint (would generate noise). Documented the decision in `docs/security.md` under the "Production migration to nonces" section.

---

## Batch 7 — Tests (2 tasks)

### TASK-025 ✅ | Expanded `use-portfolio-data` tests

- **`artifacts/portfolio/src/hooks/use-portfolio-data.test.ts`**: Added 6 new cases covering Intermediate (≥60) and Familiar (<60) levels, the `is_visible === undefined` legacy-row case, the all-invisible empty-result case, the category-slug normalization, and the empty-string-category→"other" mapping. Test count: 7 → 13.

---

## Files Modified (20)

**API server (2):**

- `src/app.ts` — CSP, COOP, CORP, referrer policy
- `src/middleware/adminAuth.ts` — API-key user no longer auto-superadmin

**Migrations (1):**

- `supabase/migrations/044_fix_is_admin_function.sql` — GUC fallback gated

**Admin (5):**

- `src/lib/api-client.ts` — throw on empty apiBase, log raw parse failures
- `src/lib/auth-token.ts` — structured logger, faster retry, abort-aware
- `src/pages/SkillsManager.tsx` — proper SkillForm type, no more cast
- `src/pages/ProjectsManager.tsx` — data-testid
- `src/components/Sidebar.tsx` — data-testid on nav

**Portfolio (4):**

- `src/components/SEO.tsx` — live jobTitle, BreadcrumbList, inLanguage
- `src/lib/theme.tsx` — NO_FOUC_SCRIPT, explicit add/remove
- `src/hooks/use-portfolio-data.test.ts` — +6 cases
- `index.html` — CSP meta, FOWT inline script, format-detection
- `package.json` — removed recharts

**Vite (2):**

- `artifacts/portfolio/vite.config.ts` — restricted allowedHosts, removed visualizer + vendor-charts
- `artifacts/admin/vite.config.ts` — restricted allowedHosts

**Shared libs (3):**

- `lib/db/src/storage.ts` — AbortSignal in uploadFileWithProgress
- `lib/ui/src/components/primitives/toaster.tsx` — aria-label, data-testid
- `artifacts/api-server/src/lib/singleton-upsert.ts` — typed payload, scoped `any`

**Docs (3):**

- `docs/changelog.md` — new 2026-06-02 section
- `docs/security.md` — new file
- `CONTRIBUTING.md` — admin/public section guides
