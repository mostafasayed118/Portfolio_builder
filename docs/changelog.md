# Changelog

All notable changes to Portfolio-Fixer are documented here.

---

## v1.1.1 — 2026-05-24

### Fixed
- Remove hardcoded credentials from codebase
- Update API URLs to use `VITE_API_URL` env var
- Pin `pnpm@9.15.0` via `packageManager` field for Vercel registry compatibility
- Add missing radix-ui packages to pnpm catalog for Vercel deployment

## 2026-05-23

### Changed
- Consolidated MEMORY_BANK.md into single authoritative source of truth (13 sections, verified against code)

## 2026-05-22

### Fixed
- Hardcoded credentials removed from codebase
- JWT bypass fixed — now uses Clerk's `verifyToken()` from `@clerk/backend`
- `useQuery<any>` replaced with typed interfaces in HeroEditor + AboutEditor
- HeroManager.tsx deleted, single HeroEditor code path
- UI components consolidated into `lib/ui` shared package
- Messages API now has server-side pagination (limit/offset/range/hasMore)

### Changed
- Debt score reduced from 6.8/10 to 3.5/10 (49% reduction)

## 2026-05-18

### Fixed
- Input validation (Zod schemas) added to all 8 admin routes
- `console.error` changed to `console.warn` in portfolio ContactSection and admin api-client
- UX audit: 29 of 41 issues fixed (all critical + medium)
- Created StatusBadge, ImageWithFallback, useBeforeUnload, error-messages utilities

### Added
- DEPLOYMENT.md with Vercel/Render/Supabase deploy guide
- CONTRIBUTING.md with dev setup and PR guidelines
- LICENSE file (MIT)

## 2026-05-16

### Added
- MEMORY_BANK.md with full project documentation
- TECHNICAL_DEBT_REPORT.md
- MEMORY_BANK_AUDIT.md (17 formatting issues fixed)

## 2026-05-12

### Fixed
- 21 bugs identified and fixed during Convex→Supabase migration audit
- RLS/data access issues (4)
- API server runtime errors (2)
- Admin page data integrity bugs (6)
- Portfolio component rendering bugs (3)
- Test infrastructure issues (2)
- Stale configuration/documentation (2)
- Defensive type-safety improvements (2)

### Added
- Migration 030: soft-delete support with `deleted_at` columns
- Migration 022-025: image RLS, duplicate trigger cleanup, analytics cleanup, FK constraints

## v1.0 — 2026-05-08

### Added
- Complete Convex → Supabase migration
- 18 database tables with RLS policies
- Supabase Storage for CV PDF
- Express 5 API server with admin CRUD routes
- Clerk authentication for admin CMS
- 4-layer validation system (DB constraints, API middleware, RLS, frontend)
- Portfolio SPA with 7 sections (hero, about, skills, projects, experience, certifications, contact)
- Admin CMS with 13 management pages
- Dark/light theme with HSL color system
- Bilingual support (EN/AR) with RTL
- 78 unit test files across 5 test projects

### Removed
- Convex backend (`convex/` directory)
- Replit Object Storage
- Drizzle ORM schema
- `OptionalConvexProvider`, `ConvexProviderWithClerk`
- `ConvexThemeSync`, `useConvexTheme`
- `VITE_CONVEX_URL`, `CONVEX_DEPLOY_KEY`, `CLERK_JWT_ISSUER_DOMAIN`
