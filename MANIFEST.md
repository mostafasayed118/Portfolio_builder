# ✅ COMPLETE FILE MANIFEST

> **Last updated:** 2026-06-01 (post reliability batch plan)

## Files Added (2026-06-01)

**API server (`artifacts/api-server/`)**
- `src/lib/env.ts` — centralised, typed env validation (startup `process.exit(1)` for missing required vars, `_setOverride()` test hook)
- `src/lib/route-helpers.ts` — shared pagination, user-scoping, error-logging helpers (`parsePagination`, `resolveTargetUserId`, `logSupabaseError`, `runCollectionQuery`)
- `src/test/routes/collection-404.test.ts` — 14 regression tests for the 404-on-missing-row contract
- `README.md` — API server docs (quickstart, env, architecture, conventions, tests, recent fixes)

## Files Modified (2026-06-01)

**API server (`artifacts/api-server/src/`)**
- `lib/api-response.ts` — added `forbidden()`, `unauthorized()`, `rateLimited()` helpers
- `lib/singleton-upsert.ts` — `any` cast confined to a local `_call()` helper
- `middleware/errorHandler.ts` — captures route context (path, method, IP, requestId, content-type, content-length)
- `middleware/rateLimiter.ts` — 429 messages use unified `{ success: false, message }` shape
- `preload-env.ts` — delegates to new `env.ts` module
- `routes/public/contact.ts` — honeypot, 2s time-trap, input normalization, structured abuse logging
- `routes/admin/about.ts`, `hero.ts` — added `logSupabaseError` calls
- `routes/admin/{about,contact-info,hero,seo-settings,section-settings,site-settings,theme-settings,typography-settings}.ts` — moved `getSupabaseClient()` from module import time into handler
- `index.ts` — uses `env.PORT` instead of raw `process.env.PORT`
- `package.json` — added `test`, `test:watch`, `test:coverage`, `verify`, `lint` scripts
- `test/routes/health.test.ts` — updated mock to use `maybeSingle` (was `single`)

**Docs (`docs/` and root-level)**
- `docs/api.md` — contact form schema (honeypot + time-trap), 404 error column on every collection route, refreshed env table
- `docs/setup.md` — env validation behavior, contact 403 troubleshooting, `verify` command
- `docs/testing.md` — 31 API test files, 236 tests, new `verify`/`test` scripts
- `docs/changelog.md` — 2026-06-01 entry
- `BACKEND_AUDIT_REPORT.md` — mark H2, H4, M3, M6, L3, L5 resolved; new "post-2026-06-01 batch plan" sections
- `TECHNICAL_DEBT_REPORT.md` — 2026-06-01 fixes table; overall score stays 0/10
- `MEMORY_BANK.md` — new `lib` modules, env access pattern, 2026-06-01 resolved issues
- `docs/README.md` — adds `artifacts/api-server/README.md` link to the index

## Files Modified (earlier, kept for context)
- `artifacts/portfolio/src/components/SkillsSection.tsx` — Added SKILL_CATEGORIES static fallback when DB returns empty
- `artifacts/portfolio/src/components/CertificationsSection.tsx` — Replaced raw useQuery with useCertifications hook, added CertificationsSkeleton
- `artifacts/portfolio/src/pages/ProjectDetail.tsx` — Added useProjectBySlug hook, skeleton loading, static fallback chain, 404 redirect
- `artifacts/portfolio/src/hooks/use-portfolio-data.ts` — Fixed fetchAboutContent → getAboutContent, fixed groupSkillsByCategory level type

## Files Not Modified (already correct)
- `artifacts/portfolio/src/components/ProjectsSection.tsx` — Already uses useProjects with fallback
- `artifacts/portfolio/src/components/ExperienceSection.tsx` — Already uses useExperience with fallback

---

# 🚀 SETUP CHECKLIST

1. Clone repo: `git clone <repo-url>`
2. Install dependencies (workspace root): `pnpm install`
3. Install workspace packages: `cd lib/supabase && pnpm install`, `cd lib/db && pnpm install`
4. Set up Supabase project:
   - Create project at https://supabase.com
   - Get project URL, anon key, and service role key
5. Copy env files:
   - `cp artifacts/portfolio/.env.example artifacts/portfolio/.env`
   - `cp artifacts/admin/.env.example artifacts/admin/.env`
   - `cp artifacts/api-server/.env.example artifacts/api-server/.env`
6. Run migrations in order (Supabase SQL Editor or CLI)
7. Start dev servers:
   - API: `pnpm --filter @workspace/api-server dev` (port 3001)
   - Admin: `pnpm --filter @workspace/admin dev` (port 5174)
   - Portfolio: `pnpm --filter @workspace/portfolio dev` (port 5173)
8. Login to admin → seed data
9. Verify portfolio shows dynamic content

---

# ⚠️ KNOWN ISSUES & LIMITATIONS

1. **AboutSection type error** — Pre-existing TS error: DB languages type `{ name, level }` doesn't match static `{ lang, level, pct }`. Needs manual mapping fix.
2. **Certification fields** — DB Certification type (`@workspace/supabase/types`) differs from custom type in `@workspace/db/certifications`. Mapping uses `cert_url`, `image_url` instead of `credential_url`, `issuer_logo`.
3. **ProjectDetail fullDescription** — DB projects table doesn't have `fullDescription`, `challenges`, `outcome` fields. Falls back to description field only.
4. **Static fallback data** — SKILL_CATEGORIES and PROJECTS in portfolio.ts are the only static data sources. Actual project content in DB may differ in structure.
5. **Supabase workspace build** — Types from `@workspace/*` packages may need rebuild if types don't match source.

---

# 🎯 TOP 5 NEXT IMPROVEMENTS

1. Fix AboutSection language mapping — map DB `{ name, level }` to static `{ lang, level, pct }` format
2. Add image fetching for ProjectDetail — query image_metadata table and display project images
3. Add fullDescription, challenges, outcome fields to projects DB table
4. Add skeleton for HeroSection and AboutSection (if not already present)
5. Implement pagination for projects list and related projects