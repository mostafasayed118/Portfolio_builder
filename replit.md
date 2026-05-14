# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM + **Convex** (optional real-time backend for CMS)
- **Validation**: Zod v3, drizzle-orm
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `npx convex deploy` — deploy Convex functions and get deployment URL

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Portfolio (`artifacts/portfolio`) — `/`

- React + Vite + TailwindCSS v4 + wouter + lucide-react + shadcn/ui
- Reads theme/typography dynamically from Convex when `VITE_CONVEX_URL` is set
- Falls back to static CSS vars if Convex is not configured
- Contact form POSTs to `/api/contact` when Convex is not configured
- `src/lib/convex-provider.tsx` — optional ConvexProvider wrapper
- `src/hooks/useConvexTheme.ts` — applies Convex theme tokens as CSS vars live
- `src/components/ConvexThemeSync.tsx` — mounts the theme sync hook

### Admin CMS (`artifacts/admin`) — `/admin/`

- React + Vite + TailwindCSS v4 + wouter + shadcn/ui
- Full Convex-backed CMS with 14 management pages
- Shows "Convex Setup Required" screen when `VITE_CONVEX_URL` is missing
- MessagesManager works with BOTH Convex (real-time) and the REST API (`/api/contact/messages`)
- All 14 pages: Overview, ThemeManager, TypographyManager, HeroManager, AboutManager,
  SkillsManager, ProjectsManager, ExperienceManager, CertificationsManager,
  ContactManager, MessagesManager, SeoManager, SectionOrderManager, SiteSettingsManager

### API Server (`artifacts/api-server`) — `/api`

- Express 5 + Drizzle ORM + PostgreSQL
- `POST /api/contact` — saves contact form submissions to the DB
- `GET /api/contact/messages` — lists all contact messages (newest first)
- `PATCH /api/contact/messages/:id/read` — marks a message as read
- `DELETE /api/contact/messages/:id` — deletes a message
- `GET /api/healthz` — health check

## Database

- PostgreSQL provisioned via Replit
- Schema: `contact_messages` table (`lib/db/src/schema/contact_messages.ts`)
- Run `pnpm --filter @workspace/db run push` after schema changes

## Convex Setup (Optional — for real-time CMS)

All Convex function files are in `/convex/`:

- `schema.ts` — all table definitions (15 tables)
- `themeSettings.ts`, `typographySettings.ts` — appearance
- `heroContent.ts`, `aboutContent.ts`, `skills.ts`, `projects.ts`, `experience.ts`,
  `certifications.ts`, `contactInfo.ts`, `messages.ts` — content
- `seoSettings.ts`, `sectionSettings.ts`, `siteSettings.ts` — site config
- `seed.ts` — seed all tables with Mustafa's default data

**To activate Convex with Clerk authentication:**

1. Create a project at [convex.dev](https://convex.dev)
2. Run `npx convex deploy` in the workspace root
3. Add `VITE_CONVEX_URL` secret in Replit (the deployment URL from step 2)
4. Set up Clerk authentication:
   - Sign up for Clerk at [clerk.com](https://clerk.com)
   - Create a new application in Clerk Dashboard
   - Activate the Convex integration in Clerk Dashboard (https://dashboard.clerk.com/apps/setup/convex)
   - Copy your Clerk Frontend API URL (format: `https://verb-noun-00.clerk.accounts.dev`)
   - Add `CLERK_JWT_ISSUER_DOMAIN` environment variable in Convex Dashboard with your Clerk Frontend API URL
   - Copy your Clerk Publishable Key from Clerk Dashboard API keys page
   - Add `VITE_CLERK_PUBLISHABLE_KEY` environment variable in Replit with your Clerk Publishable Key
5. Both admin and portfolio will automatically connect and use real-time Convex data with Clerk authentication
6. Run "Seed Data" from the Admin Overview to populate initial content

`convex/_generated/` contains stub files that let the apps build without Convex connected.
The real generated files replace these when `npx convex deploy` is run.

**Environment Variables for Development:**

- `VITE_CONVEX_URL`: Your Convex deployment URL (from `npx convex deploy`)
- `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk Publishable Key (starts with `pk_test_` for development)

**Environment Variables for Production:**

- `VITE_CONVEX_URL`: Your Convex deployment URL
- `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk Publishable Key (starts with `pk_live_` for production)
- `CLERK_JWT_ISSUER_DOMAIN`: Set in Convex Dashboard (your Clerk Frontend API URL)
