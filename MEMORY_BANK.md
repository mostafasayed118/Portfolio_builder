# Portfolio-Fixer — Memory Bank

> **Generated:** 2026-05-16
> **Last updated:** 2026-06-01 (post reliability batch plan)
> **Project Type:** Full-stack Portfolio CMS — pnpm monorepo
> **Primary User:** Mustafa Sayed (Data Engineer, Cairo, Egypt)
> **Architecture:** Supabase (DB) + Express 5 (API) + React 19 (SPA)

---

## 1. Project Overview

**Portfolio-Fixer** is a full-stack portfolio CMS with two audiences:

- **Visitors** see the public portfolio (`artifacts/portfolio`) — a React SPA showcasing Mustafa's skills, projects, experience, certifications, and contact form.
- **Admin** uses the CMS dashboard (`artifacts/admin`) — a Clerk-authenticated React SPA for managing all portfolio content (hero, about, skills, projects, experience, certifications, CV, messages, theme, typography, SEO, site settings, section order).

The monorepo uses **pnpm workspaces** with shared libraries under `lib/` and three deployable artifacts under `artifacts/`.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    pnpm workspace root                   │
│  MEMORY_BANK.md  TECHNICAL_DEBT_REPORT.md  FEATURE_*.md  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  artifacts/portfolio/   → Public portfolio SPA           │
│    Vite + React 19 + TailwindCSS v4                      │
│    Port: 5173                                            │
│    Reads: Supabase (via @workspace/supabase/client)       │
│    Auth: none (public)                                   │
│                                                          │
│  artifacts/admin/       → Admin CMS dashboard            │
│    Vite + React 19 + TailwindCSS v4                      │
│    Port: 5174                                            │
│    Reads/Writes: Supabase (via @workspace/supabase)       │
│    Auth: Clerk (via @clerk/clerk-react)                  │
│                                                          │
│  artifacts/api-server/  → Express 5 REST API             │
│    Port: 3001                                            │
│    Routes: /api/healthz, /api/images, /api/cv,            │
│            /api/contact, /api-docs (OpenAPI)              │
│    Security: helmet, cors, rate-limit, csrf               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    Shared Libraries                       │
│                                                          │
│  lib/db/         → 21 Supabase query files                │
│    @workspace/db/hero, ./about, ./skills, ./projects,     │
│    ./experience, ./certifications, ./messages, ...        │
│                                                          │
│  lib/supabase/   → Supabase clients + generated types    │
│    @workspace/supabase/client   (browser anon client)     │
│    @workspace/supabase/server   (server service-role)     │
│    @workspace/supabase/admin    (admin service-role)      │
│    @workspace/supabase/types    (Database type defs)      │
│                                                          │
│  lib/validation/ → Zod schemas for all entities           │
│    @workspace/validation                                  │
│                                                          │
│  lib/api-spec/   → OpenAPI 3.1 specification              │
│    @workspace/api-spec                                    │
│    (@workspace/api-zod shares Zod schemas with server)    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    Database                               │
│                                                          │
│  supabase/migrations/  → 30 SQL migration files           │
│    (001_init through 030_add_soft_delete)                │
│  Tables: hero_content, about_content, projects, skills,   │
│    experience, certifications, contact_messages,           │
│    analytics_events, image_metadata, content_snapshots,   │
│    section_variants, content_health_reports, settings     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Category | Technology | Version | Notes |
|---|---|---|---|
| **Framework** | React | 19.1.0 | Both SPA artifacts |
| **Build tool** | Vite | ^7.3.2 | Both SPAs |
| **CSS** | TailwindCSS | ^4.1.14 | tw-animate-css, @tailwindcss/typography |
| **Package manager** | pnpm | workspace | Catalog dependencies |
| **Database** | Supabase (PostgreSQL) | ^2.105.4 | supabase-js SDK |
| **API server** | Express | ^5 (beta) | artifacts/api-server |
| **Auth (admin)** | Clerk | ^5.61.3 | React SDK |
| **State/queries** | TanStack Query | ^5.90.21 | Both artifacts |
| **Forms** | react-hook-form | ^7.55.0 | Admin only |
| **Validation** | Zod | ^3.25.76 | Shared lib |
| **Routing** | wouter | ^3.3.5 | Hash-based SPA routing |
| **Animations** | framer-motion | ^12.23.24 | Portfolio artifact |
| **Icons** | lucide-react | ^0.545.0 | Both artifacts |
| **UI components** | Radix UI (30+ primitives) | catalog | Both artifacts |
| **Toast** | sonner | ^2.0.7 | Both artifacts |
| **Theming** | next-themes | ^0.4.6 | Admin, dark/light |
| **Testing** | Vitest + Testing Library | ^3.2.4 | All artifacts |
| **HTTP testing** | supertest | ^7.1.0 | API server tests |
| **Logging (server)** | pino + pino-http | ^9 / ^10 | API server |
| **Charts** | recharts | ^2.15.2 | Admin overview |
| **File uploads** | Uppy (admin), multer (server) | latest | Image management |
| **PDF generation** | jspdf + qrcode | ^4 / ^1.5 | CV download |
| **Security** | helmet, cors, csrf-csrf, express-rate-limit | latest | API server |
| **TypeScript** | TypeScript | ~5.9.2 | Strict mode |
| **Node version** | Node.js | 24 (LTS) | |

---

## 4. Database Tables

All tables live in the Supabase PostgreSQL database. 30 migration files in `supabase/migrations/`.

| # | Table | Key Columns | Used By |
|---|---|---|---|
| 1 | `hero_content` | `id`, `heading`, `name`, `roles[]`, `description`, `github_url`, `linkedin_url`, `email`, `avatar_url`, `cv_url`, `available`, `is_published`, `site_name`, `logo_url`, `favicon_url`, `tagline`, `cv_file_name`, `updated_at` | portfolio hero + admin hero editor |
| 2 | `about_content` | `id`, `bio1`, `bio2`, `location`, `years_of_experience`, `degree`, `school`, `grade`, `education_years`, `languages[]`, `interests[]`, `is_published`, `updated_at` | about section + editor |
| 3 | `projects` | `id`, `title`, `description`, `tech_stack[]`, `category`, `featured`, `github_url`, `live_url`, `slug`, `image_url`, `tags[]`, `metrics[]`, `sort_order`, `is_published`, `created_at`, `updated_at` | projects listing + manager |
| 4 | `skills` | `id`, `name`, `category`, `proficiency` (0-100), `icon`, `sort_order`, `is_visible`, `created_at`, `updated_at` | skills section + manager |
| 5 | `experience` | `id`, `title`, `company`, `location`, `period`, `description[]`, `technologies[]`, `type`, `sort_order`, `is_published`, `current`, `created_at`, `updated_at` | experience timeline + manager |
| 6 | `certifications` | `id`, `title`, `issuer`, `issuer_logo`, `date`, `category`, `credential_url`, `credential_id`, `sort_order`, `is_published`, `skills[]`, `created_at`, `updated_at` | certifications grid + manager |
| 7 | `contact_messages` | `id`, `name`, `email`, `message`, `is_read`, `is_archived`, `reply_email_draft`, `replied_at`, `created_at` | messages viewer |
| 8 | `analytics_events` | `id`, `type`, `path`, `section_key`, `project_id`, `referrer`, `device`, `created_at` | analytics tracking |
| 9 | `image_metadata` | `id`, `entity_type`, `entity_id`, `file_name`, `file_size`, `mime_type`, `storage_path`, `alt_text`, `created_at`, `updated_at` | image uploads |
| 10 | `content_snapshots` | `id`, `entity_type`, `entity_id`, `version`, `data` (jsonb), `changed_by`, `created_at` | version history |
| 11 | `section_variants` | `id`, `section_key`, `variant_key`, `label`, `is_active`, `config` (jsonb), `preview_note`, `updated_at` | A/B testing variants |
| 12 | `content_health_reports` | `id`, `scope`, `issues` (jsonb), `critical_count`, `warning_count`, `suggestion_count`, `generated_at` | content audits |
| 13 | `settings` | `id`, `site_name`, `site_tagline`, `footer_text`, `copyright_text`, `logo_text`, `default_theme`, `theme_config` (jsonb), `typography_config` (jsonb), `seo_config` (jsonb), `contact_config` (jsonb), `cv_config` (jsonb), `updated_at` | site settings manager |

---

## 5. Key Files Map

### Entry Points

| File | Role |
|---|---|
| `artifacts/portfolio/src/main.tsx` | Portfolio SPA entry — renders App shell with SupabaseProvider + Router |
| `artifacts/admin/src/main.tsx` | Admin SPA entry — renders with ClerkProvider + SupabaseProvider |
| `artifacts/api-server/src/index.ts` | Express 5 server entry — starts HTTP listener on PORT (default 3001) |
| `artifacts/api-server/src/app.ts` | Express app factory — registers all middleware and route modules |

### Auth Setup

| File | Role |
|---|---|
| `lib/supabase/src/client.ts` | Browser Supabase client (`getSupabase()`, `isSupabaseConfigured`) |
| `lib/supabase/src/server.ts` | Server-side service-role client (for API server) |
| `lib/supabase/src/admin.ts` | Admin service-role client (for admin SPA via `VITE_SUPABASE_SERVICE_ROLE_KEY`) |
| `lib/supabase/src/types.ts` | Generated `Database` type from Supabase CLI |
| `artifacts/portfolio/src/lib/supabase-provider.tsx` | Portfolio's Supabase provider (re-exports client + QueryClient) |
| `artifacts/admin/src/lib/convex.ts` | Admin's Supabase client (named `convex.ts` for historical reasons — to be renamed) |

### Key Components

| File | Role |
|---|---|
| `artifacts/portfolio/src/components/HeroSection.tsx` | Hero section with typewriter, social links, CV download |
| `artifacts/portfolio/src/components/Navbar.tsx` | Sticky navbar with scroll-aware glass effect |
| `artifacts/portfolio/src/components/ProjectsSection.tsx` | Project grid with Supabase data |
| `artifacts/admin/src/pages/HeroEditor.tsx` | Hero content form with live preview |
| `artifacts/admin/src/pages/ProjectsManager.tsx` | CRUD project management with sheet form |
| `artifacts/admin/src/pages/MessagesViewer.tsx` | Contact message inbox with read/unread/delete |
| `artifacts/admin/src/pages/CvManager.tsx` | CV file upload and settings |
| `artifacts/admin/src/lib/admin-utils.ts` | Admin authorization check (email allowlist from `APP_ADMIN_EMAILS`) |

### API Server Routes

| File | Role |
|---|---|
| `artifacts/api-server/src/routes/images.ts` | Image upload with Supabase storage (sanitized entity types) |
| `artifacts/api-server/src/routes/cv.ts` | CV PDF generation + download |
| `artifacts/api-server/src/middleware/csrf.ts` | CSRF double-submit cookie protection |
| `artifacts/api-server/src/middleware/rateLimiter.ts` | Rate limiting (general, contact, auth, admin, image, apiKey) |
| `artifacts/api-server/src/middleware/upload.ts` | Multer file upload configuration |

### API Server Lib Modules

| File | Role |
|---|---|
| `artifacts/api-server/src/lib/env.ts` | Centralised env validation — typed accessors, startup `process.exit(1)` for missing required vars, `_setOverride()` test hook |
| `artifacts/api-server/src/lib/supabase-client.ts` | Lazy Supabase client (created on first `getSupabaseClient()` call) |
| `artifacts/api-server/src/lib/api-response.ts` | Response helpers — `ok()`, `created()`, `notFound()`, `forbidden()`, `unauthorized()`, `rateLimited()`, `badRequest()`, `serverError()`, `paginated()` |
| `artifacts/api-server/src/lib/route-helpers.ts` | Shared collection helpers — `parsePagination`, `resolveTargetUserId`, `logSupabaseError`, `runCollectionQuery` |
| `artifacts/api-server/src/lib/singleton-upsert.ts` | Upsert helper for settings tables (any cast now isolated to a local `_call()` helper) |
| `artifacts/api-server/README.md` | API server docs — quickstart, env, architecture, conventions, test instructions |

---

## 6. Environment Variables

### Portfolio (`artifacts/portfolio/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_SITE_URL` | No | Public site URL (default localhost:5173) |

### Admin (`artifacts/admin/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (admin mutations) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key for authentication |
| `VITE_SITE_URL` | No | Admin site URL (default localhost:5174) |
| `APP_ADMIN_EMAILS` | Yes | Comma-separated admin email allowlist |

### API Server (`artifacts/api-server/.env`)

All env access goes through `src/lib/env.ts`. The server `process.exit(1)`s at
boot if any **required** variable is missing (and `NODE_ENV !== "test"`).
Tests can override values via `_setOverride()` without touching `process.env`.

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side operations) |
| `CSRF_SECRET` | Yes | Secret for CSRF token generation |
| `CLERK_SECRET_KEY` | No | Enables Clerk JWT verification (recommended in production) |
| `CLERK_ISSUER` | No | Clerk issuer URL (optional) |
| `ADMIN_API_KEY` | No | Alternative to Clerk JWT — `x-admin-key: <key>` header for machine-to-machine auth |
| `VITE_ADMIN_EMAILS` | No | Comma-separated allowlist of admin emails (required if no `ADMIN_API_KEY`) |
| `VITE_SITE_URL` / `VITE_ADMIN_URL` | No | CORS allowed origins (contact form enforces allowlist) |
| `VERCEL_URL` | No | Auto-added CORS origin on Vercel |
| `PORT` | No | HTTP port (default 3001) |
| `LOG_LEVEL` | No | pino log level (default `info`) |
| `DISABLE_RATE_LIMIT` | No | `true` disables all rate limiters (dev only) |

---

## 7. Development Commands

```bash
# Install all dependencies
pnpm install

# Start all services (portfolio + admin + API server)
pnpm dev

# Portfolio only (port 5173)
pnpm --filter @workspace/portfolio dev

# Admin only (port 5174)
pnpm --filter @workspace/admin dev

# API server only (port 3001)
pnpm --filter @workspace/api-server dev

# Typecheck all projects
pnpm run typecheck

# Run all tests
pnpm run test

# Portfolio tests only
cd artifacts/portfolio && npx vitest run

# Admin tests only
cd artifacts/admin && npx vitest run

# API server tests only
cd artifacts/api-server && npx vitest run

# Run migrations
psql -f supabase/migrations/[filename].sql

# Build all artifacts (with typecheck gate)
pnpm run build
```

---

## 8. Known Issues & Technical Debt

See full report in [TECHNICAL_DEBT_REPORT.md](./TECHNICAL_DEBT_REPORT.md) — overall score: **0/10** (post 2026-06-01 batch plan + 2026-06-01 session 2 follow-ups).

### Critical Issues (Resolved)

- ~~Contact form had no retry mechanism on submission failure~~ — Fixed with `handleRetry` function and "Try again" button
- ~~No input sanitization on contact form API~~ — Fixed with `sanitizeHtml()` escaping HTML entities before storage
- ~~CSP allowed `'unsafe-inline'` in script-src~~ — Removed; nonce-based CSP planned for future
- ~~No pagination on messages manager~~ — Fixed with client-side pagination (20 per page)
- ~~No soft-delete support~~ — Fixed with migration 030 adding `deleted_at` columns and updated RLS policies
- ~~**`getSupabaseClient()` at module import time** (2026-06-01)~~ — Moved inside every route handler; env errors now surface at first request, not boot
- ~~**`/healthz` uses `.single()` failing on empty `site_settings`** (2026-06-01)~~ — Switched to `.maybeSingle()`; locked by `src/test/routes/health.test.ts`
- ~~**PUT /:id returns 200 even when no row matched** (2026-06-01)~~ — All routes now use `.select("id")` + count check; returns 404 on `count === 0`; locked by 14 new regression tests
- ~~**Public contact: weak abuse controls** (2026-06-01)~~ — Honeypot + 2s time-trap + input normalization + structured abuse logging
- ~~**Ad-hoc env validation** (2026-06-01)~~ — New `src/lib/env.ts` with typed accessors and startup `process.exit(1)`
- ~~**Generic 500 errors with no route context** (2026-06-01)~~ — `logSupabaseError` and enriched `errorHandler` capture route + user + IP
- ~~**Hardcoded TestSprite API key in `opencode.json`** (2026-06-01 session 2)~~ — Moved to `{env:TESTSPRITE_API_KEY}`; key should be rotated
- ~~**Silent `localhost:3001` fallbacks in 4 places** (2026-06-01 session 2)~~ — `getApiUrl()` helper with explicit dev/prod behavior
- ~~**Silent admin logger** (2026-06-01 session 2)~~ — Was emitting nothing in production; now uses `@workspace/logging` with Vite-aware env injection
- ~~**No retry on transient Supabase errors in `syncUserFromClerk`** (2026-06-01 session 2)~~ — Added `withRetry()` with 3-attempt exponential backoff; 14 new unit tests
- ~~**`as unknown as` double-casts in `use-mouse-tilt` and `useFormValidation`** (2026-06-01 session 2)~~ — Replaced with explicit single-step casts or optional types
- ~~**HeroTypewriter empty-state: blinking cursor in empty space** (2026-06-01 session 2)~~ — Now shows localized fallback when roles array is empty
- ~~**12 realtime subscriptions across all tables** (2026-06-01 session 2)~~ — Reduced to 3 (hero_content, projects, site_settings)
- ~~**5-minute background polling** (2026-06-01 session 2)~~ — Removed; `staleTime` extended to 30 min; refresh on remount or window focus

### Top Remaining Issues

1. **Pre-existing admin test infra issue** — 27 admin page tests fail to load due to a Vite/Vitest `react/jsx-dev-runtime` resolution issue in `lib/ui`. Not introduced by recent batches; needs a vitest config fix. Out of scope.
2. **No component tests for admin** — Most mutation-heavy components (HeroEditor, ProjectsManager, SkillsManager, etc.) need unit tests.
3. **Migration numbering** — Several skipped/preserved placeholder numbers (003, 010, 016-019) from earlier development.
4. **CSP nonce migration** — `scriptSrc` still relies on `'self'` only; inline script bundles may need nonce injection for full CSP compliance.
5. **Service-role architecture** — API server uses `SUPABASE_SERVICE_ROLE_KEY` bypassing RLS, with all user-scoping enforced at the app layer. Documented in `artifacts/api-server/README.md` and `BACKEND_AUDIT_REPORT.md` (item C2 — accepted risk).
6. **Hand-rolled `admin/src/lib/api-client.ts` reimplements what `lib/api-client-react` could provide** — 20 consumers; the generated client only covers 5 of 48 endpoints. Migration deferred until OpenAPI spec covers all endpoints.

---

## 9. Recent Changes Log

1. **Fix 25** — Created DEPLOYMENT.md with comprehensive Vercel/Render/Supabase deployment guide
2. **Fix 24** — Created LICENSE file (MIT License)
3. **Fix 23** — Updated MEMORY_BANK.md with resolved issues and migration count
4. **Fix 22** — Created migration 030: soft-delete support with `deleted_at` columns and updated RLS policies
5. **Fix 21** — Verified admin route naming consistency (singleton resources use hyphenated names, collection resources are plural)
6. **Fix 20** — Added HTML sanitization (`sanitizeHtml`) to contact form API endpoint to prevent XSS
7. **Fix 19** — Hardened CSP in API server: removed `'unsafe-inline'` from scriptSrc, added baseUri, formAction, workerSrc
8. **Fix 18** — Added pagination to Messages Manager (20 per page with Previous/Next controls)
9. **Fix 17** — Added retry mechanism to contact form with `handleRetry` function and "Try again" button
10. **Fix 16** — Created 4 new migration files (022-025): image RLS, duplicate trigger cleanup, analytics cleanup, FK constraints
2. **Fix 15** — Updated MEMORY_BANK.md with accurate known issues and change log
3. **Fix 14** — Updated root README to list all 8 lib packages
4. **Fix 13** — Fixed `order` → `order_num` in ExperienceUpdate type (types.ts:658)
5. **Fix 12** — Fixed stale closure in `useFormValidation.setField` using functional state update
6. **Fix 11** — Fixed hardcoded "MS" monogram in Footer.tsx — now derives from `siteName` dynamically
7. **Fix 10** — Fixed `setLocation()` called during render in ProtectedRoute.tsx and Login.tsx — moved to useEffect
8. **Fix 9** — Fixed `not-found.tsx` hardcoded gray colors — now uses theme-aware CSS variables
9. **Fix 8** — Removed unused imports and dead `fetchProjectImages` function from ProjectsSection.tsx
10. **Fix 7** — Removed last `as any` in images.ts:47 — replaced with proper multer type
11. **Fix 6** — Fixed CSRF_SECRET to throw in production if env var missing (middleware/csrf.ts)
12. **Fix 5** — Added entityId validation in images.ts upload route
13. **Fix 4** — Updated `.gitignore` to exclude `testsprite_tests/tmp/`
14. **Fix 3** — Rollup Visualizer auto-open gated behind `VISUALIZER_OPEN` env var
15. **Fix 2** — Removed duplicate `upsertHeroContent` from `hero.ts`, consolidated to `heroContent.ts`
16. **Fix 1** — Removed hardcoded `SUPABASE_SERVICE_ROLE_KEY` from `api-server/package.json` dev script; moved to `.env`

---

## 10. Business Logic Rules

### Content Publishing
- All content tables have `is_published` boolean
- Public queries filter by `is_published = true`
- Portfolio hero gracefully falls back to static data from `src/data/portfolio.ts` when Supabase is unconfigured

### Admin Authorization
- Admin pages validate email against `APP_ADMIN_EMAILS` env var
- Clerk provides JWT authentication; the `useAdminAuth` hook checks the allowlist
- Service role key is used for admin Supabase operations (bypasses RLS)

### Section Ordering
- `sort_order` column controls display order across projects, skills, experience, certifications
- `section_settings` table manages section visibility and drag-and-drop reorder

### Image Uploads
- Entity type is validated against an allowlist before storage path construction
- Supported types: `projects`, `skills`, `experience`, `certs`, `about`, `hero`, `avatar`, `logo`, `favicon`

### Rate Limiting
- General API: 100 requests per 15 minutes
- Contact form: 5 requests per hour per IP
- Auth endpoints: 10 requests per 15 minutes
- Rate limiting is disabled in development (NODE_ENV !== production)
