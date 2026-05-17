# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Supabase (PostgreSQL) — database + storage
- **Auth**: Clerk (admin CMS only)
- **Data access**: `@workspace/db` (14 data modules)
- **Validation**: Zod v3
- **Build**: esbuild (api-server), Vite (portfolio + admin)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm run test` — run all tests via vitest

## Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | portfolio, admin | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | portfolio, admin | Anon/publishable key for client-side queries |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | admin | Service role key for admin operations |
| `SUPABASE_URL` | api-server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | api-server | Service role key for server operations |
| `VITE_CLERK_PUBLISHABLE_KEY` | admin | Clerk publishable key for admin auth |
| `VITE_ADMIN_EMAILS` | admin | Comma-separated list of admin email addresses |

## Artifacts

### Portfolio (`artifacts/portfolio`) — `/`

- React 19 + Vite 7 + TailwindCSS v4 + wouter + shadcn/ui
- Reads content dynamically from Supabase via `@tanstack/react-query`
- Falls back to static data in `src/data/portfolio.ts` when Supabase is not configured
- Contact form submits directly to Supabase (public INSERT policy)

### Admin CMS (`artifacts/admin`) — `/admin/`

- React 19 + Vite 7 + TailwindCSS v4 + wouter + shadcn/ui
- Clerk authentication with email whitelist
- 15 management pages: Overview, Theme, Typography, Hero, About, Skills,
  Projects, Experience, Certifications, Contact, Messages, SEO,
  Section Order, Site Settings, CV Manager
- All data operations use the Supabase service role key (bypasses RLS)

### API Server (`artifacts/api-server`) — `/api`

- Express 5
- `GET /api/cv` — serves the CV PDF as a download
- `GET /api/cv/settings` — returns CV metadata
- `PUT /api/cv/settings` — updates CV metadata
- `GET /api/healthz` — health check

## Supabase Setup

1. Create a Supabase project
2. Copy the project URL and anon key to `.env` and `artifacts/*/.env.local`
3. Run `supabase/migrations/001_init.sql` against your Supabase SQL editor
4. (Optional) Run `supabase/migrations/002_fix_rls_policies.sql` if RLS policies need updating
5. For admin access, add `VITE_SUPABASE_SERVICE_ROLE_KEY` and `VITE_CLERK_PUBLISHABLE_KEY`
   to `artifacts/admin/.env.local`

## Database Schema (Supabase)

18 tables migrated from Convex:
- 8 singleton tables: `theme_settings`, `typography_settings`, `site_settings`,
  `seo_settings`, `hero_content`, `about_content`, `contact_info`, `cv_settings`
- 10 collection tables: `skills`, `projects`, `experience`, `certifications`,
  `messages`, `section_settings`, `content_snapshots`, `section_variants`,
  `analytics_events`, `content_health_reports`

Storage bucket: `cv` (private, served via signed URL proxy)
