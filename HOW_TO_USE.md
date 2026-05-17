# Portfolio-Fixer — How to Use

## Quick Start

```bash
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build
```

## Development

```bash
# Portfolio (public site)
pnpm --filter @workspace/portfolio run dev

# Admin CMS
pnpm --filter @workspace/admin run dev

# API Server
pnpm --filter @workspace/api-server run dev
```

## Architecture Overview

Three apps sharing a common data layer:

```
packages/lib/
  supabase/          # Supabase client configuration (client, server, admin)
    src/client.ts    # Browser client (anon key)
    src/server.ts    # Server client (service role key)
    src/admin.ts     # Admin client (service role key)
    src/types.ts     # Full Database type definitions (18 tables)
  db/                # Data access layer (14 modules)
    src/skills.ts    # listSkills, createSkill, updateSkill, deleteSkill
    src/projects.ts  # listProjects, listPublishedProjects, createProject, ...
    src/messages.ts  # listMessages, sendMessage, markRead, deleteMessage, ...
    ...              # 14 modules total (one per entity)

artifacts/
  portfolio/         # React 19 + Vite 7 — public portfolio site
    src/components/  # HeroSection, AboutSection, SkillsSection, etc.
    src/hooks/       # useSupabaseTheme, useTypewriter, useReveal
    src/data/        # Static fallback data
  admin/             # React 19 + Vite 7 — CMS
    src/pages/       # 15 manager pages (Hero, Skills, Projects, etc.)
    src/lib/auth.tsx # Clerk auth with email whitelist
  api-server/        # Express 5 — CV download proxy
    src/routes/cv.ts # GET /api/cv (proxied download)
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

| Variable | Required For | Description |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | All apps | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | portfolio, admin | Public anon key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | admin, api-server | Admin key (secret — never commit) |
| `SUPABASE_URL` | api-server | Same as VITE_SUPABASE_URL |
| `SUPABASE_SERVICE_ROLE_KEY` | api-server | Server-side service role key |
| `VITE_CLERK_PUBLISHABLE_KEY` | admin | Clerk key for admin auth |
| `VITE_ADMIN_EMAILS` | admin | Comma-separated admin emails |
| `PORT` | dev | Dev server port (default 5173) |

## Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste `supabase/migrations/001_init.sql` → Run
3. (Optional advanced fix) Run `supabase/migrations/002_fix_rls_policies.sql`

This creates 18 tables with RLS policies, indexes, triggers, and seed data.

## Key Commands

```bash
pnpm run typecheck        # Full typecheck (5 projects)
pnpm run test             # Run all tests (47 tests)
pnpm run build            # Typecheck + build all
pnpm --filter @workspace/portfolio run dev   # Portfolio on :5173
pnpm --filter @workspace/admin run dev       # Admin on :5173
```

## Static Data Fallback

When `VITE_SUPABASE_URL` is not set, the portfolio renders with hardcoded data:

```
artifacts/portfolio/src/data/portfolio.ts
```

This file contains `HERO`, `ABOUT`, `SKILLS`, `PROJECTS`, `EXPERIENCE`, `CERTIFICATIONS`, `CONTACT` — mirroring the Supabase schema. Edit this to customize without a database.

## Contact Form

The contact form submits directly to Supabase via the `public_insert_messages` RLS policy. No API server needed. Rate limiting is handled by Supabase. Messages are viewable in the Admin CMS → Messages manager.

## CV Upload Flow

1. Admin CMS → CV Manager → upload PDF
2. File goes directly to Supabase Storage bucket `cv` (via service role key)
3. Metadata saved to `cv_settings` table via API server PUT endpoint
4. Portfolio Download CV button → API server GET → proxies file with download headers
